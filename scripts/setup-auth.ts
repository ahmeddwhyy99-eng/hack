import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
const paths = ['server/auth/.env', 'apps/member-portal/.env']
if (paths.some(path => existsSync(path))) throw new Error('An authentication environment file already exists. Configure both files manually to avoid overwriting credentials.')
const secret = randomBytes(32).toString('base64url')
for (const path of paths) writeFileSync(path, readFileSync(path + '.example', 'utf8').replace('AUTH_CLIENT_SECRET=', 'AUTH_CLIENT_SECRET=' + secret), { mode: 0o600, flag: 'wx' })
console.info('Created both local environment files with a matching random secret. Secret values were not printed.')
