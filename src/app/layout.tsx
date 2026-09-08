import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = { title: 'EventPass · Digital identity demo', description: 'Ask for proof, not the entire identity. A simulation using fictional identities.' }
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html> }
