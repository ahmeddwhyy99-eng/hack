'use client'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { Ticket, Wallet, ArrowLeft, CircleAlert } from 'lucide-react'
import { Badge } from './ui/badge'
import { Alert } from './ui/alert'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'
import { ApiError } from '@/shared/api'
export function Shell({ wallet = false, title, subtitle, children, wide = false, step }: { wallet?: boolean; title: string; subtitle?: string; children: React.ReactNode; wide?: boolean; step?: 1 | 2 | 3 | 4 }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [title])
  const Icon = wallet ? Wallet : Ticket
  return <><a className="skip-link" href="#main">Skip to content</a><header><div className="header-inner"><Link href="/event" className="brand"><Icon aria-hidden="true" size={24}/>{wallet ? 'Digital Wallet Simulator' : 'EventPass'}</Link><Badge>Demo mode</Badge></div></header><main id="main" className={wide ? 'main wide' : 'main'}><Link className="back-link" href="/event"><ArrowLeft size={16} aria-hidden="true"/>{wallet ? 'Back to EventPass' : 'Digital identity demo'}</Link><Progress step={step}/><div className="page-heading"><p className="eyebrow">FICTIONAL DIGITAL IDENTITY SERVICE</p><h1 ref={heading} tabIndex={-1}>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{children}</main><footer>Ask for proof, not the entire identity.<span>Concept demo only. No real identities or cryptographic proofs.</span></footer></>
}
export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  return <Alert><CircleAlert aria-hidden="true" size={20}/><div><strong>{error instanceof ApiError && error.code === 'NOT_FOUND' ? 'Verification not found' : 'Something went wrong'}</strong><p>{error instanceof Error ? error.message : 'Please try again.'}</p>{error instanceof ApiError && error.requestId && <small>Support reference: {error.requestId}</small>}{retry && <Button variant="outline" onClick={retry}>Retry</Button>}</div></Alert>
}
export function Loading() { return <div className="card"><p role="status">Loading verification…</p><Skeleton/><Skeleton/></div> }

const steps = ['Choose demo identity', 'Review requested information', 'Approve or reject', 'View verification result']
function Progress({ step }: { step?: number }) {
  return <nav aria-label="Verification progress"><ol className="progress">{steps.map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={step && index + 1 < step ? 'completed' : ''}><span className="step-number" aria-hidden="true">{index + 1}</span><span><small>Step {index + 1}{step === index + 1 ? ' · Current' : ''}</small>{label}</span></li>)}</ol></nav>
}
