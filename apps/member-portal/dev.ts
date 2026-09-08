import { createPortal } from './app'
import { origin } from '../../shared/auth-ui/security'
const config = { origin: origin(process.env.RP_ORIGIN || 'http://localhost:4000'), provider: origin(process.env.AUTH_ORIGIN || 'http://localhost:3001'), clientId: process.env.AUTH_CLIENT_ID || 'memberspace', clientSecret: process.env.AUTH_CLIENT_SECRET || '' }
if (config.clientSecret.length < 32 || config.origin === config.provider) throw new Error('Set matching client credentials and separate application origins.')
createPortal(config).listen(Number(new URL(config.origin).port || 443), '127.0.0.1', () => console.info(`MemberSpace: ${config.origin}`))
