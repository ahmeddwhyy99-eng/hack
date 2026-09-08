import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import * as argon2 from 'argon2'
import { createAuthApp, type AuthConfig } from './app'
import { SqliteAuthStore } from './store'
import { createPortal } from '../../apps/member-portal/app'
import { digest, random } from '../../shared/auth-ui/security'
const config: AuthConfig = { origin: 'http://localhost:3001', clientId: 'memberspace', clientSecret: random(), redirectUri: 'http://localhost:4000/callback' }
const basic = 'Basic ' + Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')
const email = 'member@example.test', password = 'test-only-long-password'
const csrf = (html: string) => { const match = html.match(/name="csrf" value="([^"]+)"/); if (!match) throw new Error('CSRF input missing'); return match[1] }
let db: SqliteAuthStore, app: Awaited<ReturnType<typeof createAuthApp>>, time: number
beforeEach(async () => { time = Date.now(); db = new SqliteAuthStore(':memory:'); app = await createAuthApp(db, config, () => time) })
afterEach(() => db.db.close())
async function begin(agent = request.agent(app), verifier = random()) {
  const state = random()
  await agent.get('/auth/authorize').query({ response_type: 'code', client_id: config.clientId, redirect_uri: config.redirectUri, scope: 'membership', state, code_challenge: digest(verifier), code_challenge_method: 'S256' }).expect(303)
  const form = await agent.get('/auth/login').expect(200)
  return { agent, verifier, state, csrf: csrf(form.text) }
}
async function registered(active = true) {
  const flow = await begin()
  await flow.agent.post('/auth/register').type('form').send({ email, password, csrf: flow.csrf }).expect(200)
  await db.membership(email, active)
  return flow
}
async function approved() {
  const flow = await registered()
  await flow.agent.post('/auth/login').type('form').send({ email, password, csrf: flow.csrf }).expect(303)
  const consent = await flow.agent.get('/auth/consent').expect(200)
  const result = await flow.agent.post('/auth/consent').type('form').send({ csrf: csrf(consent.text), decision: 'approve' }).expect(303)
  return { ...flow, code: new URL(result.headers.location).searchParams.get('code')! }
}
function exchange(code: string, verifier: string) { return request(app).post('/auth/token').set('Authorization', basic).type('form').send({ grant_type: 'authorization_code', code, redirect_uri: config.redirectUri, code_verifier: verifier }) }
describe('identity service security', () => {
  it('registers only Argon2id hashes and defaults membership to inactive', async () => {
    const flow = await registered(false), user = await db.user(email)
    expect(user?.password_hash).toMatch(/^\$argon2id\$/)
    expect(user?.password_hash).not.toContain(password)
    expect(await argon2.verify(user!.password_hash, password)).toBe(true)
    expect(user?.active_membership).toBe(false)
    const response = await flow.agent.post('/auth/register').type('form').send({ email, password: 'another-test-password', csrf: flow.csrf }).expect(200)
    expect(response.text).not.toContain(password)
    expect((await db.user(email))?.password_hash).toBe(user?.password_hash)
    await flow.agent.post('/auth/register').send({ email, password, csrf: flow.csrf, active_membership: true }).expect(400)
  })
  it('uses the same safe error for wrong passwords and unknown users', async () => {
    const flow = await registered()
    for (const body of [{ email, password: 'incorrect-password' }, { email: 'unknown@example.test', password }]) {
      const response = await flow.agent.post('/auth/login').send({ ...body, csrf: flow.csrf }).expect(401)
      expect(response.text).toContain('Email or password is incorrect.')
      expect(response.text).not.toContain(body.password)
    }
    await flow.agent.post('/auth/login').send({ email, password, csrf: flow.csrf }).expect(303)
  })
  it('rejects invalid callbacks, clients, and PKCE downgrade without redirecting', async () => {
    const valid = { response_type: 'code', client_id: config.clientId, redirect_uri: config.redirectUri, scope: 'membership', state: random(), code_challenge: digest(random()), code_challenge_method: 'S256' }
    for (const replacement of [{ redirect_uri: 'https://attacker.test/callback' }, { redirect_uri: config.redirectUri + '/extra' }, { client_id: 'unknown' }, { code_challenge_method: 'plain' }]) {
      const response = await request(app).get('/auth/authorize').query({ ...valid, ...replacement }).expect(400)
      expect(response.headers.location).toBeUndefined()
    }
  })
  it('requires CSRF and same-origin forms; rejects hostile origins', async () => {
    const flow = await registered()
    await flow.agent.post('/auth/login').send({ email, password, csrf: random() }).expect(400)
    await flow.agent.post('/auth/login').set('Origin', 'https://attacker.test').send({ email, password, csrf: flow.csrf }).expect(403)
    await flow.agent.post('/auth/login').set('Origin', 'null').set('Sec-Fetch-Site', 'cross-site').send({ email, password, csrf: flow.csrf }).expect(403)
    await flow.agent.post('/auth/login').set('Origin', 'null').set('Sec-Fetch-Site', 'same-origin').send({ email, password, csrf: flow.csrf }).expect(303)
    const response = await flow.agent.get('/auth/consent')
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
    expect(response.headers['referrer-policy']).toBe('no-referrer')
    await flow.agent.post('/auth/consent').send({ csrf: random(), decision: 'approve' }).expect(403)
  })
  it('redeems a code exactly once even concurrently and shares only membership', async () => {
    const flow = await approved()
    const responses = await Promise.all([exchange(flow.code, flow.verifier), exchange(flow.code, flow.verifier)])
    expect(responses.map(r => r.status).sort()).toEqual([200, 400])
    const token = responses.find(r => r.status === 200)!.body.access_token
    const response = await request(app).post('/auth/introspect').set('Authorization', basic).send({ token }).expect(200)
    expect(response.body).toEqual({ active: true, active_membership: true })
    expect(JSON.stringify(response.body)).not.toContain(email)
    time += 300001
    expect((await request(app).post('/auth/introspect').set('Authorization', basic).send({ token })).body).toEqual({ active: false })
  })
  it('rejects expired codes at the 60-second boundary', async () => {
    const flow = await approved(); time += 60000
    await exchange(flow.code, flow.verifier).expect(400)
  })
  it('rejects wrong verifiers and client authentication', async () => {
    const flow = await approved()
    await request(app).post('/auth/token').send({ code: flow.code }).expect(401)
    await exchange(flow.code, random()).expect(400)
    await exchange(flow.code, flow.verifier).expect(400)
  })
  it('expires authorization transactions', async () => {
    const flow = await begin(); time += 600000
    const result = await flow.agent.get('/auth/login').expect(400)
    expect(result.text).toContain('Authorization expired')
  })
  it('provider logout revokes issued tokens and blocks reuse of the session', async () => {
    const flow = await approved(), token = (await exchange(flow.code, flow.verifier)).body.access_token
    const logout = await flow.agent.get('/auth/logout')
    await flow.agent.post('/auth/logout').send({ csrf: random() }).expect(403)
    await flow.agent.post('/auth/logout').send({ csrf: csrf(logout.text) }).expect(303)
    expect((await request(app).post('/auth/introspect').set('Authorization', basic).send({ token })).body).toEqual({ active: false })
  })
})

describe('independent relying party integration', () => {
  function portal() {
    const transport: typeof fetch = async (input, init) => {
      const url = new URL(String(input))
      const response = await request(app).post(url.pathname).set('Authorization', (init?.headers as Record<string, string>).Authorization).type('form').send(String(init?.body))
      return new Response(response.text, { status: response.status, headers: { 'Content-Type': 'application/json' } })
    }
    return request.agent(createPortal({ origin: 'http://localhost:4000', provider: config.origin, clientId: config.clientId, clientSecret: config.clientSecret }, transport, () => time))
  }
  async function login(active: boolean, decision = 'approve') {
    const rp = portal(), idp = request.agent(app)
    const redirect = await rp.get('/login').expect(303), target = new URL(redirect.headers.location)
    expect(target.origin).toBe(config.origin)
    await idp.get(target.pathname + target.search).expect(303)
    const form = await idp.get('/auth/register')
    await idp.post('/auth/register').send({ email, password, csrf: csrf(form.text) }).expect(200)
    await db.membership(email, active)
    await idp.post('/auth/login').send({ email, password, csrf: csrf(form.text) }).expect(303)
    const consent = await idp.get('/auth/consent')
    const approved = await idp.post('/auth/consent').send({ csrf: csrf(consent.text), decision }).expect(303)
    const callback = new URL(approved.headers.location)
    return { rp, callback: callback.pathname + callback.search }
  }
  it('grants a protected route only after code exchange and rechecks membership', async () => {
    const { rp, callback } = await login(true)
    await rp.get('/protected').expect(401)
    const response = await rp.get(callback).expect(303)
    expect(String(response.headers['set-cookie'])).toContain('HttpOnly')
    expect(String(response.headers['set-cookie'])).toContain('SameSite=Lax')
    const protectedPage = await rp.get('/protected').expect(200)
    expect(protectedPage.text).toContain('Access was granted because you have an active membership.')
    expect(protectedPage.text).not.toContain(email)
    await rp.get(callback).expect(401)
    await db.membership(email, false)
    await rp.get('/protected').expect(403)
    await db.membership(email, true)
    await rp.post('/logout').send({ csrf: random() }).expect(403)
    await rp.post('/logout').send({ csrf: csrf(protectedPage.text) }).expect(200)
    await rp.get('/protected').expect(401)
  })
  it('denies inactive members', async () => {
    const { rp, callback } = await login(false)
    await rp.get(callback).expect(303)
    expect((await rp.get('/protected').expect(403)).text).toContain('Active membership: No')
  })
  it('shows rejection and creates no session', async () => {
    const { rp, callback } = await login(true, 'reject')
    expect((await rp.get(callback).expect(403)).text).toContain('Request rejected')
    await rp.get('/protected').expect(401)
  })
  it('rejects mismatched state', async () => {
    const { rp, callback } = await login(true)
    await rp.get(callback.replace(/state=[^&]+/, 'state=forged')).expect(401)
    await rp.get('/protected').expect(401)
  })
  it('rejects an unexpected issuer', async () => {
    const { rp, callback } = await login(true)
    const url = new URL(callback, 'http://localhost:4000')
    url.searchParams.set('iss', 'https://attacker.test')
    await rp.get(url.pathname + url.search).expect(401)
    await rp.get('/protected').expect(401)
  })
  it('expires the portal session after five minutes', async () => {
    const { rp, callback } = await login(true)
    await rp.get(callback).expect(303); time += 300000
    await rp.get('/protected').expect(401)
  })
})
