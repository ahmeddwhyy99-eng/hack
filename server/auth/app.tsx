import express from 'express'
import { randomUUID } from 'node:crypto'
import * as argon2 from 'argon2'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import type { AuthStore } from './store'
import { cookie, cookieOptions, digest, equal, random, security, safeError } from '../../shared/auth-ui/security'
import { page, Credentials, Hidden, Button } from '../../shared/auth-ui/page'
export type AuthConfig = { origin: string; clientId: string; clientSecret: string; redirectUri: string }
type Transaction = { csrf: string; clientId: string; redirectUri: string; challenge: string; state: string; expires: number }
type Session = { userId: string; csrf: string }
type Grant = { userId: string; sessionKey: string; clientId: string; redirectUri: string; challenge: string }
const credentials = z.object({ email: z.email().max(254).transform(v => v.toLowerCase()), password: z.string().min(12).max(128), csrf: z.string() }).strict()
export async function createAuthApp(store: AuthStore, config: AuthConfig, now = Date.now) {
  const app = express(), secure = config.origin.startsWith('https:'), options = cookieOptions(secure)
  const sessionName = secure ? '__Host-id_session' : 'id_session', txName = secure ? '__Host-id_transaction' : 'id_transaction'
  const dummy = await argon2.hash(random(), { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 })
  security(app, config.origin, config.redirectUri)
  app.use('/auth', rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }))
  const credentialLimit = rateLimit({ windowMs: 15 * 60000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: 'Too many attempts. Try again in 15 minutes.' })
  const txKey = (req: express.Request) => 'tx:' + digest(cookie(req, txName))
  const sessionKey = (req: express.Request) => 'session:' + digest(cookie(req, sessionName))
  const expired = (res: express.Response) => res.status(400).send(page('Authorization expired', <><p>Start a new login from MemberSpace. Authorization requests last ten minutes.</p><a className="button button-primary full" href={new URL(config.redirectUri).origin}>Return to MemberSpace</a></>))
  app.get('/auth', async (req, res) => {
    const session = await store.get<Session>(sessionKey(req), now())
    res.send(page('Identity service', <><p>Registration and passwords are handled here. MemberSpace receives only your membership result.</p><div className="auth-links"><a href={new URL(config.redirectUri).origin}>Open MemberSpace</a>{session && <a href="/auth/logout">Log out of identity service</a>}</div></>))
  })
  app.get('/auth/authorize', async (req, res) => {
    const q = z.object({ response_type: z.literal('code'), client_id: z.literal(config.clientId), redirect_uri: z.literal(config.redirectUri), scope: z.literal('membership'), state: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/), code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/), code_challenge_method: z.literal('S256') }).strict().safeParse(req.query)
    if (!q.success) { res.status(400).send(page('Invalid authorization request', <p>The client, callback URL, scope, or PKCE parameters are not allowed. No redirect was performed.</p>)); return }
    await store.remove(txKey(req))
    const id = random(), expires = now() + 600000
    await store.put('tx:' + digest(id), { csrf: random(), clientId: config.clientId, redirectUri: config.redirectUri, challenge: q.data.code_challenge, state: q.data.state, expires }, expires)
    res.cookie(txName, id, { ...options, maxAge: 600000 })
    res.redirect(303, await store.get(sessionKey(req), now()) ? '/auth/consent' : '/auth/login')
  })
  for (const mode of ['login', 'register'] as const) {
    app.get(`/auth/${mode}`, async (req, res) => {
      const tx = await store.get<Transaction>(txKey(req), now()); if (!tx) { expired(res); return }
      res.send(page(mode === 'login' ? 'Log in' : 'Register', <Credentials mode={mode} csrf={tx.csrf}/>))
    })
    app.post(`/auth/${mode}`, credentialLimit, async (req, res) => {
      const tx = await store.get<Transaction>(txKey(req), now()); if (!tx) { expired(res); return }
      const parsed = credentials.safeParse(req.body)
      if (!parsed.success || !equal(parsed.data.csrf, tx.csrf)) { res.status(400).send(page('Check your request', <Credentials mode={mode} csrf={tx.csrf} error="Enter a valid email and a 12–128 character password, or restart if the form expired."/>)); return }
      const { email, password } = parsed.data
      if (mode === 'register') {
        const password_hash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 })
        await store.register({ id: randomUUID(), email, password_hash, active_membership: false })
        res.send(page('Continue to login', <><p>If registration was available, your account is ready. Existing accounts are unchanged. Log in with your credentials.</p><a href="/auth/login" className="button button-primary full">Log in</a></>)); return
      }
      const user = await store.user(email)
      const valid = await argon2.verify(user?.password_hash || dummy, password)
      if (!user || !valid) { res.status(401).send(page('Login unsuccessful', <Credentials mode="login" csrf={tx.csrf} error="Email or password is incorrect."/>)); return }
      await store.remove(sessionKey(req))
      const id = random()
      await store.put('session:' + digest(id), { userId: user.id, csrf: random() }, now() + 1800000)
      res.cookie(sessionName, id, { ...options, maxAge: 1800000 }).redirect(303, '/auth/consent')
    })
  }
  app.get('/auth/consent', async (req, res) => {
    const tx = await store.get<Transaction>(txKey(req), now()), session = await store.get<Session>(sessionKey(req), now())
    if (!tx) { expired(res); return }
    if (!session) { res.redirect(303, '/auth/login'); return }
    res.send(page('Approve membership access', <><h2>MemberSpace</h2><p>Requests permission to check whether your membership is active.</p><div className="disclosure shared"><h3>Will be shared</h3><p>Active membership: Yes or No.</p></div><div className="disclosure"><h3>Will not be shared</h3><p>Email address, password, name, billing details, or account profile.</p></div><p className="trust-note">MemberSpace receives only the result of this check, not your identity profile.</p><form method="post" action="/auth/consent"><Hidden csrf={tx.csrf}/><div className="actions"><Button name="decision" value="reject" variant="outline">Reject</Button><Button name="decision" value="approve">Approve</Button></div></form></>))
  })
  app.post('/auth/consent', async (req, res) => {
    const tx = await store.get<Transaction>(txKey(req), now()), session = await store.get<Session>(sessionKey(req), now())
    if (!tx || !session) { expired(res); return }
    if (typeof req.body.csrf !== 'string' || !equal(tx.csrf, req.body.csrf) || !['approve', 'reject'].includes(req.body.decision)) { res.status(403).send('Invalid consent request.'); return }
    if (!await store.take(txKey(req), now())) { expired(res); return }
    res.clearCookie(txName, options)
    const callback = new URL(tx.redirectUri); callback.searchParams.set('state', tx.state); callback.searchParams.set('iss', config.origin)
    if (req.body.decision === 'reject') callback.searchParams.set('error', 'access_denied')
    else {
      const code = random()
      await store.put('code:' + digest(code), { userId: session.userId, sessionKey: sessionKey(req), clientId: tx.clientId, redirectUri: tx.redirectUri, challenge: tx.challenge }, now() + 60000)
      callback.searchParams.set('code', code)
    }
    res.redirect(303, callback.toString())
  })
  app.use(['/auth/token', '/auth/introspect', '/auth/revoke'], (req, res, next) => {
    if (!equal(req.get('authorization') || '', 'Basic ' + Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64'))) { res.status(401).json({ error: 'invalid_client' }); return }
    next()
  })
  app.post('/auth/token', async (req, res) => {
    const b = z.object({ grant_type: z.literal('authorization_code'), code: z.string().regex(/^[\w-]{43}$/), redirect_uri: z.literal(config.redirectUri), code_verifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/) }).strict().safeParse(req.body)
    if (!b.success) { res.status(400).json({ error: 'invalid_grant' }); return }
    // Atomic delete-before-validation means even concurrent attempts cannot redeem a code twice.
    const grant = await store.take<Grant>('code:' + digest(b.data.code), now())
    if (!grant || grant.clientId !== config.clientId || grant.redirectUri !== b.data.redirect_uri || !equal(grant.challenge, digest(b.data.code_verifier)) || !await store.get(grant.sessionKey, now())) { res.status(400).json({ error: 'invalid_grant' }); return }
    const token = random()
    await store.put('token:' + digest(token), grant, now() + 300000)
    res.json({ access_token: token, token_type: 'Bearer', expires_in: 300, scope: 'membership' })
  })
  app.post('/auth/introspect', async (req, res) => {
    const token = typeof req.body.token === 'string' ? req.body.token : ''
    const grant = await store.get<Grant>('token:' + digest(token), now())
    const user = grant && grant.clientId === config.clientId && await store.get(grant.sessionKey, now()) ? await store.userById(grant.userId) : null
    res.json(user ? { active: true, active_membership: user.active_membership } : { active: false })
  })
  app.post('/auth/revoke', async (req, res) => { if (typeof req.body.token === 'string') await store.remove('token:' + digest(req.body.token)); res.sendStatus(200) })
  app.get('/auth/logout', async (req, res) => {
    const session = await store.get<Session>(sessionKey(req), now())
    res.send(page(session ? 'Log out of identity service' : 'Session expired or logged out', session ? <><p>This also invalidates membership access issued from this identity session.</p><form method="post" action="/auth/logout"><Hidden csrf={session.csrf}/><Button>Log out</Button></form></> : <a href={new URL(config.redirectUri).origin}>Return to MemberSpace</a>))
  })
  app.post('/auth/logout', async (req, res) => {
    const session = await store.get<Session>(sessionKey(req), now())
    if (session && (typeof req.body.csrf !== 'string' || !equal(session.csrf, req.body.csrf))) { res.sendStatus(403); return }
    await store.remove(sessionKey(req)); await store.remove(txKey(req)); res.clearCookie(sessionName, options); res.clearCookie(txName, options)
    res.redirect(303, '/auth/logout')
  })
  app.use(safeError)
  return app
}
