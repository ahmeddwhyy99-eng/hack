import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../../app'
import { MemoryStore } from '../../lib/store'
const makeApp = () => createApp(new MemoryStore())
async function create(app: ReturnType<typeof makeApp>, userId = 'user_1', claim = 'age_over_18') {
  const response = await request(app).post('/api/verifications').send({ userId, claim }).expect(201)
  return `/api/verifications/${response.body.verificationId}`
}
describe('verification API', () => {
  it.each([['user_1', true], ['user_2', false], ['user_3', true]])('evaluates %s age without disclosing identity', async (userId, expected) => {
    const app = makeApp(); const path = await create(app, userId as string)
    const context = await request(app).get(`${path}/context`).expect(200)
    expect(context.body.user.displayName).toBeTruthy()
    await request(app).post(`${path}/decision`).send({ decision: 'approve' }).expect(200)
    const { body, headers } = await request(app).get(`${path}/result`).expect(200)
    expect(body).toEqual({ verificationId: path.split('/').pop(), status: expected ? 'verified' : 'failed', verified: expected, claims: { ageOver18: expected }, ...(expected ? {} : { reasonCode: 'CLAIM_NOT_SATISFIED' }) })
    expect(headers['cache-control']).toBe('no-store')
  })
  it('does not evaluate pending or rejected requests', async () => {
    const app = makeApp(); const path = await create(app)
    expect((await request(app).get(`${path}/result`)).body.claims).toEqual({})
    await request(app).post(`${path}/decision`).send({ decision: 'reject' }).expect(200)
    const { body } = await request(app).get(`${path}/result`)
    expect(body.status).toBe('rejected'); expect(body.claims).toEqual({}); expect(body.reasonCode).toBe('USER_REJECTED')
    await request(app).post(`${path}/decision`).send({ decision: 'approve' }).expect(409)
    expect((await request(app).get(`${path}/result`)).body).toEqual(body)
  })
  it.each([['student_status', 'studentStatus'], ['residency_status', 'residencyStatus']])('supports %s', async (claim, key) => {
    const app = makeApp()
    for (const [user, result] of [['user_1', true], ['user_3', false]] as const) {
      const path = await create(app, user, claim)
      await request(app).post(`${path}/decision`).send({ decision: 'approve' }).expect(200)
      expect((await request(app).get(`${path}/result`)).body.claims).toEqual({ [key]: result })
    }
  })
  it('accepts only one concurrent decision', async () => {
    const app = makeApp(); const path = await create(app)
    const responses = await Promise.all(['approve', 'reject'].map(decision => request(app).post(`${path}/decision`).send({ decision })))
    expect(responses.map(r => r.status).sort()).toEqual([200, 409])
  })
  it('validates inputs and preserves safe request IDs', async () => {
    const app = makeApp()
    const invalid = await request(app).post('/api/verifications').set('x-request-id', 'test-reference').send({ userId: 'real_user', claim: 'age_over_18' }).expect(400)
    expect(invalid.body.error.requestId).toBe('test-reference')
    await request(app).get('/api/verifications/not-a-uuid/result').expect(400)
    await request(app).get('/api/verifications/00000000-0000-4000-8000-000000000000/result').expect(404)
    await request(app).post('/api/verifications').set('Content-Type', 'application/json').send('{').expect(400)
    const path = await create(app)
    await request(app).post(`${path}/decision`).send({ decision: 'yes' }).expect(400)
  })
  it('returns safe errors when persistence fails', async () => {
    const app = createApp({ create: async () => { throw new Error('private database detail') }, get: async () => null, decide: async () => false })
    const response = await request(app).post('/api/verifications').send({ userId: 'user_1', claim: 'age_over_18' }).expect(503)
    expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE')
    expect(JSON.stringify(response.body)).not.toContain('private database detail')
  })
})
