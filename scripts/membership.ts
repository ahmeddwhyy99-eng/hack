import { configuredAuthStore } from '../server/auth/store'
const [email, status] = process.argv.slice(2)
if (!email || !['active', 'inactive'].includes(status)) throw new Error('Usage: npm run membership -- test@example.test active|inactive')
const changed = await configuredAuthStore().membership(email.toLowerCase(), status === 'active')
if (!changed) throw new Error('Account not found. Register through MemberSpace first.')
console.info(`Membership set to ${status}.`)
