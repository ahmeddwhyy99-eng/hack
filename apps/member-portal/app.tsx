import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { readFileSync } from 'node:fs'
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, FileText, LockKeyhole, PlayCircle, ShieldCheck } from 'lucide-react'
import { cookie, cookieOptions, digest, equal, random, security, safeError } from '../../shared/auth-ui/security'
import { portalPage, PortalHidden } from './page'
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
  const portalCss = readFileSync(new URL('./style.css', import.meta.url), 'utf8')
  app.get('/portal-style.css', (_req, res) => res.type('css').send(portalCss))
  app.use(rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }))
  app.use((_req, _res, next) => {
    for (const [id, item] of flows) if (item.expires <= now()) flows.delete(id)
    for (const [id, item] of sessions) if (item.expires <= now()) sessions.delete(id)
    next()
  })
  const restart = (res: express.Response, title: string, message: string, status = 401) => res.status(status).send(portalPage(title, <section className="portal-simple-card"><p className="portal-eyebrow">Member access</p><h1>{title}</h1><p>{message}</p><div className="portal-actions"><a className="portal-primary-action" href="/login">Start a new login <ArrowRight size={18} aria-hidden="true"/></a></div></section>))
  const logoutForm = (csrf: string) => <form method="post" action="/logout"><PortalHidden csrf={csrf}/><button className="portal-secondary-action" type="submit">Log out of MemberSpace</button></form>
  app.get('/', (_req, res) => res.send(portalPage('Your member world, in one place', <>
    <section className="portal-hero">
      <div className="portal-hero-copy">
        <p className="portal-eyebrow">Private member portal</p>
        <h1>Everything you joined for, ready when you are.</h1>
        <p>MemberSpace brings your resources, sessions, and community updates into one focused place. Sign in securely through the independent EventPass identity service.</p>
        <div className="portal-actions">
          <a href="/login" className="portal-primary-action">Enter member dashboard <ArrowRight size={18} aria-hidden="true"/></a>
          <span className="portal-privacy-note"><ShieldCheck size={18} aria-hidden="true"/> We request only your membership status</span>
        </div>
      </div>
      <aside className="portal-preview" aria-label="Member dashboard preview">
        <p className="preview-label">Inside MemberSpace</p>
        <h2>A calmer home for your membership.</h2>
        <div className="preview-feature"><span>Featured this week</span><h3>Member launch workshop</h3><p>Planning prompts, templates, and a guided session—all available from your dashboard.</p></div>
      </aside>
    </section>
    <section className="portal-value-strip" aria-label="Portal highlights">
      <div className="portal-value"><h3>Curated resources</h3><p>Practical templates and guides organized for members.</p></div>
      <div className="portal-value"><h3>Upcoming sessions</h3><p>A clear view of workshops and community events.</p></div>
      <div className="portal-value"><h3>Privacy by design</h3><p>Your password and email never reach this portal.</p></div>
    </section>
  </>, 'landing')))
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
      res.cookie(sessionName, id, { ...options, maxAge: token.expires_in * 1000 }).redirect(303, '/dashboard')
    } catch { restart(res, 'Authentication failed', 'The code expired, was already used, or the identity service is unavailable. Start a fresh login.'); }
  })
  app.get(['/dashboard', '/protected'], async (req, res) => {
    const session = sessions.get(key(req, sessionName))
    if (!session) { res.clearCookie(sessionName, options); restart(res, 'Login required or session expired', 'MemberSpace sessions last up to five minutes. Log in again to continue.'); return }
    try {
      const response = await providerCall('/auth/introspect', { token: session.token })
      const claim = z.object({ active: z.boolean(), active_membership: z.boolean().optional() }).strict().parse(await response.json())
      if (!claim.active) { sessions.delete(key(req, sessionName)); res.clearCookie(sessionName, options); restart(res, 'Session expired', 'Your identity session ended. Log in again.'); return }
      if (claim.active_membership !== true) { res.status(403).send(portalPage('Active membership required', <section className="portal-simple-card"><p className="portal-eyebrow">Signed in · access pending</p><h1>Active membership required</h1><p>You signed in successfully, but your membership is inactive. Access to member resources was not granted.</p><div className="portal-status-panel"><strong>Permitted information</strong><span>Active membership: No</span></div><p>Ask the test administrator to activate membership, then check again.</p><div className="portal-actions"><a href="/dashboard" className="portal-primary-action">Check membership again</a>{logoutForm(session.csrf)}</div></section>)); return }
      res.send(portalPage('Member dashboard', <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <p className="dashboard-sidebar-label">Member area</p>
          <nav aria-label="Dashboard sections"><a href="#overview" aria-current="page">Overview</a><a href="#resources">Resource library</a><a href="#sessions">Upcoming sessions</a><a href="#privacy">Privacy receipt</a></nav>
          <div className="dashboard-sidebar-note"><strong>Demo environment</strong><br/>This page contains sample member content for the hackathon flow.</div>
        </aside>
        <div className="dashboard-content" id="overview">
          <div className="dashboard-heading"><div><p className="portal-eyebrow">Member dashboard</p><h1>Welcome back.</h1></div><span className="membership-badge"><CheckCircle2 size={17} aria-hidden="true"/> Membership active</span></div>
          <section className="dashboard-hero"><div><h2>Your member space is unlocked</h2><p>Access was granted because you have an active membership. EventPass confirmed the claim without sharing your account profile.</p></div><div className="dashboard-hero-icon"><LockKeyhole size={36} aria-hidden="true"/></div></section>
          <section className="dashboard-section" id="resources"><div className="dashboard-section-heading"><div><h2>Continue exploring</h2><p>Sample resources available to active members</p></div></div><div className="resource-grid">
            <article className="resource-card"><span className="resource-icon"><BookOpen size={21} aria-hidden="true"/></span><h3>Member playbook</h3><p>A practical guide for getting value from the community.</p></article>
            <article className="resource-card"><span className="resource-icon"><PlayCircle size={21} aria-hidden="true"/></span><h3>Workshop replay</h3><p>Catch up on the latest guided member session.</p></article>
            <article className="resource-card"><span className="resource-icon"><FileText size={21} aria-hidden="true"/></span><h3>Planning templates</h3><p>Reusable worksheets for your next project milestone.</p></article>
          </div></section>
          <div className="dashboard-lower">
            <section className="dashboard-panel" id="sessions"><CalendarDays size={23} aria-hidden="true"/><h2>Next member session</h2><p>Demo workshop · Your upcoming event would appear here in a production portal.</p></section>
            <section className="dashboard-panel" id="privacy"><h2>Privacy receipt</h2><p>MemberSpace received only the authorization fact it requested.</p><div className="claim-receipt"><strong>Active membership: Yes</strong><span>Not disclosed: email, password, name, billing details, or identity profile.</span></div>{logoutForm(session.csrf)}<a className="portal-privacy-note" href={config.provider + '/auth/logout'}>Manage identity-service logout</a></section>
          </div>
        </div>
      </div>, 'dashboard'))
    } catch { res.status(503).send(portalPage('Service unavailable', <section className="portal-simple-card"><p className="portal-eyebrow">Temporary interruption</p><h1>Membership could not be confirmed</h1><p>Protected resources remain unavailable until the identity service recovers.</p><div className="portal-actions"><a href="/dashboard" className="portal-primary-action">Retry membership check</a>{logoutForm(session.csrf)}</div></section>)) }
  })
  app.post('/logout', async (req, res) => {
    const id = key(req, sessionName), session = sessions.get(id)
    if (session && (typeof req.body.csrf !== 'string' || !equal(session.csrf, req.body.csrf))) { res.sendStatus(403); return }
    sessions.delete(id); flows.delete(key(req, flowName)); res.clearCookie(sessionName, options); res.clearCookie(flowName, options)
    let revoked = true
    if (session) { try { await providerCall('/auth/revoke', { token: session.token }) } catch { revoked = false } }
    res.send(portalPage('Logged out', <section className="portal-simple-card"><p className="portal-eyebrow">Session complete</p><h1>Logged out</h1><p>Your MemberSpace session has ended.</p><p>{revoked ? 'The membership token was revoked. The identity service keeps its own separate session.' : 'The identity service could not be reached to revoke its token. It expires within five minutes. Your local session is already removed.'}</p><div className="portal-actions"><a className="portal-primary-action" href="/">Return home</a><a className="portal-secondary-action" href={config.provider + '/auth/logout'}>Also log out of identity service</a></div></section>))
  })
  app.use((_req, res) => res.status(404).send(portalPage('Page not found', <section className="portal-simple-card"><p className="portal-eyebrow">404</p><h1>Page not found</h1><p>The page you requested is not available in this demo.</p><div className="portal-actions"><a className="portal-primary-action" href="/">Return home</a></div></section>)))
  app.use(safeError)
  return app
}
