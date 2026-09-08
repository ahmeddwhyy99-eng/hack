import { origin } from '../../shared/auth-ui/security'
export function authConfig() {
  const provider = origin(process.env.AUTH_ORIGIN || 'http://localhost:3001')
  const rp = origin(process.env.RP_ORIGIN || 'http://localhost:4000')
  const clientId = process.env.AUTH_CLIENT_ID || 'memberspace'
  const clientSecret = process.env.AUTH_CLIENT_SECRET || ''
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(clientId) || clientSecret.length < 32) throw new Error('Set a client ID and a random AUTH_CLIENT_SECRET of at least 32 characters.')
  if (provider === rp) throw new Error('Provider and relying party must have different origins.')
  return { origin: provider, clientId, clientSecret, redirectUri: rp + '/callback' }
}
