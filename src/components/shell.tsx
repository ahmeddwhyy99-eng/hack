'use client'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { Ticket, Wallet, ArrowLeft, CircleAlert } from 'lucide-react'
import { Badge } from './ui/badge'
import { Alert } from './ui/alert'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'
import { ApiError } from '@/shared/api'
export function Shell({ wallet = false, title, subtitle, children, wide = false }: { wallet?: boolean; title: string; subtitle?: string; children: React.ReactNode; wide?: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [title])
  const Icon = wallet ? Wallet : Ticket
  return <><a className="skip-link" href="#main">Skip to content</a><header><div className="header-inner"><Link href="/event" className="brand"><Icon aria-hidden="true" size={24}/>{wallet ? 'Digital Wallet Simulator' : 'EventPass'}</Link><Badge>Demo · simulated identities</Badge></div></header><main id="main" className={wide ? 'main wide' : 'main'}><Link className="back-link" href="/event"><ArrowLeft size={16} aria-hidden="true"/>{wallet ? 'Back to EventPass' : 'Digital identity demo'}</Link><div className="page-heading"><p className="eyebrow">{wallet ? '02 / REVIEW & CONSENT' : wide ? '01 / REQUEST A CHECK' : '03 / YOUR RESULT'}</p><h1 ref={heading} tabIndex={-1}>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{children}</main><footer>Ask for proof, not the entire identity.<span>Concept demo only. No real identities or cryptographic proofs.</span></footer></>
}
export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  return <Alert><CircleAlert aria-hidden="true" size={20}/><div><strong>{error instanceof ApiError && error.code === 'NOT_FOUND' ? 'Verification not found' : 'Something went wrong'}</strong><p>{error instanceof Error ? error.message : 'Please try again.'}</p>{error instanceof ApiError && error.requestId && <small>Support reference: {error.requestId}</small>}{retry && <Button variant="outline" onClick={retry}>Retry</Button>}</div></Alert>
}
export function Loading() { return <div className="card"><p role="status">Loading verification…</p><Skeleton/><Skeleton/></div> }
