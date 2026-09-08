import { createAuthApp } from './app'
import { configuredAuthStore } from './store'
import { authConfig } from './config'
import { createApp } from '../app'
const config = authConfig()
const app = await createAuthApp(configuredAuthStore(), config)
// Preserve the original verification API on the same Express process.
process.env.VERIFICATION_STORE ??= 'memory'
app.use(createApp())
app.listen(Number(new URL(config.origin).port || 443), '127.0.0.1', () => console.info(`Identity service: ${config.origin}/auth`))
