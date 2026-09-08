import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient } from '@supabase/supabase-js'
export type User = { id: string; email: string; password_hash: string; active_membership: boolean }
export interface AuthStore {
  user(email: string): Promise<User | null>
  userById(id: string): Promise<User | null>
  register(user: User): Promise<boolean>
  membership(email: string, active: boolean): Promise<boolean>
  put(key: string, data: object, expires: number): Promise<void>
  get<T>(key: string, now: number): Promise<T | null>
  take<T>(key: string, now: number): Promise<T | null>
  remove(key: string): Promise<void>
}
export class SqliteAuthStore implements AuthStore {
  db: DatabaseSync
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
    this.db = new DatabaseSync(path)
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS auth_users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, active_membership INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS auth_records (key TEXT PRIMARY KEY, data TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS auth_records_expiry ON auth_records(expires);`)
  }
  private convert(row: unknown): User | null { return row ? { ...(row as User), active_membership: Boolean((row as User).active_membership) } : null }
  async user(email: string) { return this.convert(this.db.prepare('SELECT * FROM auth_users WHERE email=?').get(email)) }
  async userById(id: string) { return this.convert(this.db.prepare('SELECT * FROM auth_users WHERE id=?').get(id)) }
  async register(u: User) { return Boolean(this.db.prepare('INSERT OR IGNORE INTO auth_users VALUES (?,?,?,?)').run(u.id, u.email, u.password_hash, Number(u.active_membership)).changes) }
  async membership(email: string, active: boolean) { return Boolean(this.db.prepare('UPDATE auth_users SET active_membership=? WHERE email=?').run(Number(active), email).changes) }
  async put(key: string, data: object, expires: number) {
    this.db.prepare('DELETE FROM auth_records WHERE expires <= ?').run(Date.now())
    this.db.prepare('INSERT OR REPLACE INTO auth_records VALUES (?,?,?)').run(key, JSON.stringify(data), expires)
  }
  async get<T>(key: string, now: number): Promise<T | null> { const row = this.db.prepare('SELECT data FROM auth_records WHERE key=? AND expires>?').get(key, now); return row ? JSON.parse(row.data as string) as T : null }
  async take<T>(key: string, now: number): Promise<T | null> { const row = this.db.prepare('DELETE FROM auth_records WHERE key=? RETURNING data, expires').get(key); return row && Number(row.expires) > now ? JSON.parse(row.data as string) as T : null }
  async remove(key: string) { this.db.prepare('DELETE FROM auth_records WHERE key=?').run(key) }
}
export function configuredAuthStore(): AuthStore {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (Boolean(url) !== Boolean(key)) throw new Error('Both Supabase server variables are required.')
  if (!url || !key) {
    if (process.env.AUTH_STORE !== 'sqlite') throw new Error('Configure Supabase or explicitly set AUTH_STORE=sqlite.')
    return new SqliteAuthStore(process.env.AUTH_DB_PATH || '.data/auth.sqlite')
  }
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const check = (error: unknown) => { if (error) throw new Error('Authentication storage unavailable') }
  return {
    async user(email) { const { data, error } = await db.from('auth_users').select('*').eq('email', email).maybeSingle(); check(error); return data },
    async userById(id) { const { data, error } = await db.from('auth_users').select('*').eq('id', id).maybeSingle(); check(error); return data },
    async register(user) { const { error } = await db.from('auth_users').insert(user); if (error?.code === '23505') return false; check(error); return true },
    async membership(email, active) { const { data, error } = await db.from('auth_users').update({ active_membership: active }).eq('email', email).select('id'); check(error); return Boolean(data?.length) },
    async put(key, data, expires) { const { error } = await db.from('auth_records').upsert({ key, data, expires }); check(error) },
    async get<T>(key: string, now: number) { const { data, error } = await db.from('auth_records').select('data').eq('key', key).gt('expires', now).maybeSingle(); check(error); return data?.data as T || null },
    async take<T>(key: string, now: number) { const { data, error } = await db.rpc('consume_auth_record', { record_key: key, current_time_ms: now }); check(error); return data as T || null },
    async remove(key) { const { error } = await db.from('auth_records').delete().eq('key', key); check(error) },
  }
}
