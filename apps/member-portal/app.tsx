import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { cookie, cookieOptions, digest, equal, random, security, safeError } from '../../shared/auth-ui/security'
import { page, Hidden, Button } from '../../shared/auth-ui/page'
export type PortalConfig = { origin: string; provider: string; clientId: string; clientSecret: string }
export function createPortal(config: PortalConfig, transport: typeof fetch = fetch, now = Date.now) {
  const app = express(), secure = config.origin.startsWith('https:'), options = cookieOptions(secure)
  const sessionName = secure ? '__Host-rp_session' : 'rp_session', flowName = secure ? '__Host-rp_flow' : 'rp_flow'
  const flows = new Map<string, { state: string; verifier: string; expires: number }>()
  const sessions = new Map<string, { token: string; csrf: string; expires: number }>()
  const key = (req: express.Request, name: string) => digest(cookie(req, name))
  const providerCall = async (path: string, body: Record<string, string>) => {
    const response = await transport(config.provider + path, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64') }, body: new URLSearchParams(body), signal: AbortSignal.timeout(10000), redirect: 'error' })
    if (!response.ok) throw new Error('Provider request failed')
    return response
  }
  security(app, config.origin)
  app.use(rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }))
  app.use((_req, _res, next) => {
    for (const [id, item] of flows) if (item.expires <= now()) flows.delete(id)
    for (const [id, item] of sessions) if (item.expires <= now()) sessions.delete(id)
    next()
  })
  const restart = (res: express.Response, title: string, message: string, status = 401) => res.status(status).send(page(title, <><p>{message}</p><a className="button button-primary full" href="/login">Start a new login</a></>, false))
  const logoutForm = (csrf: string) => <form method="post" action="/logout"><Hidden csrf={csrf}/><Button variant="outline">Log out of MemberSpace</Button></form>
  app.get('/', (_req, res) => res.send(page('Welcome to MemberSpace', <><h2>Member resources</h2><p>Access your member area using the independent identity service. MemberSpace never receives your password or email address.</p><p className="trust-note">Only your active membership result is requested.</p><a href="/login" className="button button-primary full">Log in with Identity service</a><div className="auth-links"><a href="/protected">Open member area</a></div></>, false)))
  app.get('/login', (req, res) => {
    flows.delete(key(req, flowName))
    const id = random(), state = random(), verifier = random()
    flows.set(digest(id), { state, verifier, expires: now() + 600000 })
    res.cookie(flowName, id, { ...options, maxAge: 600000 })
    const target = new URL('/auth/authorize', config.provider)
    target.search = new URLSearchParams({ response_type: 'code', client_id: config.clientId, redirect_uri: config.origin + '/callback', scope: 'membership', state, code_challenge: digest(verifier), code_challenge_method: 'S256' }).toString()
    res.redirect(303, target.toString())
  })
  app.get('/callback', async (req, res) => {
    const flow = flows.get(key(req, flowName))
    flows.delete(key(req, flowName)); res.clearCookie(flowName, options)
    const parsed = z.object({ state: z.string(), iss: z.literal(config.provider), code: z.string().regex(/^[\w-]{43}$/).optional(), error: z.literal('access_denied').optional() }).strict().safeParse(req.query)
    if (!flow || !parsed.success || !equal(flow.state, parsed.data.state) || flow.expires <= now()) { restart(res, 'Authorization expired or invalid', 'The login request expired or could not be matched to this browser.'); return }
    if (parsed.data.error) { restart(res, 'Request rejected', 'No membership result was shared. You can start again when ready.', 403); return }
    if (!parsed.data.code) { restart(res, 'Authentication failed', 'No authorization code was received.'); return }
    try {
      const response = await providerCall('/auth/token', { grant_type: 'authorization_code', code: parsed.data.code, redirect_uri: config.origin + '/callback', code_verifier: flow.verifier })
      const token = z.object({ access_token: z.string().regex(/^[\w-]{43}$/), token_type: z.literal('Bearer'), expires_in: z.number().positive().max(300), scope: z.literal('membership') }).parse(await response.json())
      const previous = sessions.get(key(req, sessionName)); sessions.delete(key(req, sessionName))
      if (previous) await providerCall('/auth/revoke', { token: previous.token })
      const id = random()
      sessions.set(digest(id), { token: token.access_token, csrf: random(), expires: now() + token.expires_in * 1000 })
      res.cookie(sessionName, id, { ...options, maxAge: token.expires_in * 1000 }).redirect(303, '/protected')
    } catch { restart(res, 'Authentication failed', 'The code expired, was already used, or the identity service is unavailable. Start a fresh login.'); }
  })
  app.get('/protected', async (req, res) => {
    const session = sessions.get(key(req, sessionName))
    if (!session) { res.clearCookie(sessionName, options); restart(res, 'Login required or session expired', 'MemberSpace sessions last up to five minutes. Log in again to continue.'); return }
    try {
      const response = await providerCall('/auth/introspect', { token: session.token })
      const claim = z.object({ active: z.boolean(), active_membership: z.boolean().optional() }).strict().parse(await response.json())
      if (!claim.active) { sessions.delete(key(req, sessionName)); res.clearCookie(sessionName, options); restart(res, 'Session expired', 'Your identity session ended. Log in again.'); return }
      if (claim.active_membership !== true) { res.status(403).send(page('Active membership required', <><p>You signed in successfully, but your membership is inactive. Access to member resources was not granted.</p><div className="receipt"><h2>Permitted information</h2><p>Active membership: No</p></div><p>Ask the test administrator to activate membership, then refresh this page.</p><a href="/protected" className="button button-outline full">Check membership again</a>{logoutForm(session.csrf)}</>, false)); return }
      res.send(page('Member access granted', <><p className="trust-note">Access was granted because you have an active membership.</p><h2>Member resource library</h2><p>Your protected member area is ready. Every visit checks your current membership with the identity service.</p><div className="receipt"><h2>Permitted information</h2><p>Active membership: Yes</p><h3>Not disclosed</h3><p>Email, password, name, billing details, or identity profile.</p></div>{logoutForm(session.csrf)}<div className="auth-links"><a href={config.provider + '/auth/logout'}>Manage identity-service logout</a></div></>, false))
    } catch { res.status(503).send(page('Service unavailable', <><p>Membership could not be confirmed. Protected resources are unavailable until the service recovers.</p><a href="/protected" className="button button-primary full">Retry membership check</a>{logoutForm(session.csrf)}</>, false)) }
  })
  app.post('/logout', async (req, res) => {
    const id = key(req, sessionName), session = sessions.get(id)
    if (session && (typeof req.body.csrf !== 'string' || !equal(session.csrf, req.body.csrf))) { res.sendStatus(403); return }
    sessions.delete(id); flows.delete(key(req, flowName)); res.clearCookie(sessionName, options); res.clearCookie(flowName, options)
    let revoked = true
    if (session) { try { await providerCall('/auth/revoke', { token: session.token }) } catch { revoked = false } }
    res.send(page('Logged out', <><p>Your MemberSpace session has ended.</p><p>{revoked ? 'The membership token was revoked. The identity service has its own separate session.' : 'The identity service could not be reached to revoke its token. It expires within five minutes. Your local session is already removed.'}</p><div className="auth-links"><a href="/">Return home</a><a href={config.provider + '/auth/logout'}>Also log out of identity service</a></div></>, false))
  })
  app.use((_req, res) => res.status(404).send(page('Page not found', <a href="/">Return home</a>, false)))
  app.use(safeError)
  return app
}
