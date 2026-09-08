import express from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { claims } from '../src/shared/contracts'
import { contextFor, evaluate, resultFor, type RecordRow } from './features/verifications/model'
import { configuredStore, type Store } from './lib/store'
export function createApp(providedStore?: Store) {
  const app = express()
  let store = providedStore
  app.disable('x-powered-by')
  app.use((req, res, next) => {
    const incoming = req.get('x-request-id')
    const requestId = incoming && /^[a-zA-Z0-9_-]{1,80}$/.test(incoming) ? incoming : randomUUID()
    res.locals.requestId = requestId; res.set('x-request-id', requestId); res.set('Cache-Control', 'no-store')
    const start = Date.now()
    res.on('finish', () => console.info(JSON.stringify({ level: res.statusCode >= 500 ? 'error' : 'info', requestId, method: req.method, operation: res.locals.operation || 'request', status: res.statusCode, durationMs: Date.now() - start })))
    next()
  })
  app.use(express.json({ limit: '8kb' }))
  app.use('/api', (_req, _res, next) => { try { store ??= configuredStore(); next() } catch { next(new Error('Storage unavailable')) } })
  app.post('/api/verifications', async (req, res) => {
    res.locals.operation = 'create_verification'
    const body = z.object({ userId: z.enum(['user_1', 'user_2', 'user_3']), claim: z.enum(claims) }).strict().parse(req.body)
    const row: RecordRow = { id: randomUUID(), user_id: body.userId, claim: body.claim, status: 'pending', result: null, reason_code: null, created_at: new Date().toISOString(), decided_at: null }
    await store!.create(row); res.status(201).json({ verificationId: row.id, status: row.status })
  })
  app.use('/api/verifications/:id', async (req, res, next) => {
    const id = z.uuid().parse(req.params.id)
    const row = await store!.get(id)
    if (!row) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Verification not found.', requestId: res.locals.requestId } }); return }
    res.locals.row = row; next()
  })
  app.get('/api/verifications/:id/context', (_req, res) => { res.locals.operation = 'wallet_context'; res.json(contextFor(res.locals.row)) })
  app.get('/api/verifications/:id/result', (_req, res) => { res.locals.operation = 'relying_party_result'; res.json(resultFor(res.locals.row)) })
  app.post('/api/verifications/:id/decision', async (req, res) => {
    res.locals.operation = 'record_decision'
    const { decision } = z.object({ decision: z.enum(['approve', 'reject']) }).strict().parse(req.body)
    const row = res.locals.row as RecordRow
    if (row.status !== 'pending' || !await store!.decide(evaluate(row, decision))) {
      res.status(409).json({ error: { code: 'ALREADY_DECIDED', message: 'This request already has a decision. View its result.', requestId: res.locals.requestId } }); return
    }
    res.json({ verificationId: row.id, status: evaluate(row, decision).status })
  })
  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found.', requestId: res.locals.requestId } }))
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const invalid = error instanceof z.ZodError || (error instanceof SyntaxError && 'body' in error)
    res.status(invalid ? 400 : 503).json({ error: { code: invalid ? 'INVALID_REQUEST' : 'SERVICE_UNAVAILABLE', message: invalid ? 'Please check the request and try again.' : 'The verification service is unavailable. Please try again.', requestId: res.locals.requestId } })
  })
  return app
}
