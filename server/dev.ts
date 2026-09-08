import { createApp } from './app'
process.env.VERIFICATION_STORE ??= 'memory'
createApp().listen(3001, '127.0.0.1', () => console.info('Verification API listening on 127.0.0.1:3001'))
