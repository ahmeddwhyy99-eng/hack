import { defineConfig } from '@playwright/test'
import { randomBytes } from 'node:crypto'
const env = { AUTH_ORIGIN: 'http://localhost:3101', RP_ORIGIN: 'http://localhost:4100', AUTH_CLIENT_ID: 'memberspace', AUTH_CLIENT_SECRET: randomBytes(32).toString('base64url'), AUTH_STORE: 'sqlite', AUTH_DB_PATH: '.data/e2e.sqlite', SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' }
export default defineConfig({
  testDir: './e2e', workers: 1, timeout: 30000,
  use: { baseURL: env.RP_ORIGIN, browserName: 'chromium', channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
  webServer: [
    { command: 'node --import tsx server/auth/dev.ts', url: env.AUTH_ORIGIN + '/auth', env, reuseExistingServer: false },
    { command: 'node --import tsx apps/member-portal/dev.ts', url: env.RP_ORIGIN, env, reuseExistingServer: false },
  ],
})
