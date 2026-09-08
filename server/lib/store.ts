import { createClient } from '@supabase/supabase-js'
import type { RecordRow } from '../features/verifications/model'
export interface Store { create(row: RecordRow): Promise<void>; get(id: string): Promise<RecordRow | null>; decide(row: RecordRow): Promise<boolean> }
export class MemoryStore implements Store {
  private rows = new Map<string, RecordRow>()
  async create(row: RecordRow) { this.rows.set(row.id, structuredClone(row)) }
  async get(id: string) { const row = this.rows.get(id); return row ? structuredClone(row) : null }
  async decide(row: RecordRow) { if (this.rows.get(row.id)?.status !== 'pending') return false; this.rows.set(row.id, structuredClone(row)); return true }
}
export function configuredStore(): Store {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    if (process.env.NETLIFY || process.env.VERIFICATION_STORE !== 'memory') throw new Error('Configure Supabase or explicitly enable local memory mode.')
    return new MemoryStore()
  }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return {
    async create(row) { const { error } = await client.from('verification_requests').insert(row); if (error) throw new Error('Storage unavailable') },
    async get(id) { const { data, error } = await client.from('verification_requests').select('*').eq('id', id).maybeSingle(); if (error) throw new Error('Storage unavailable'); return data as RecordRow | null },
    async decide(row) { const { data, error } = await client.from('verification_requests').update({ status: row.status, result: row.result, reason_code: row.reason_code, decided_at: row.decided_at }).eq('id', row.id).eq('status', 'pending').select('id'); if (error) throw new Error('Storage unavailable'); return Boolean(data?.length) },
  }
}
