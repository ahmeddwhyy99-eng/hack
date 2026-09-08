'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, UserRound, Eye, EyeOff, Ticket } from 'lucide-react'
import { Shell, Loading, ErrorNotice } from '@/components/shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { api } from '@/shared/api'
import type { WalletContext } from '@/shared/contracts'
export default function WalletPage({ id }: { id: string }) {
  const [context, setContext] = useState<WalletContext | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [reviewed, setReviewed] = useState(false)
  const [mustRefresh, setMustRefresh] = useState(false)
  const lock = useRef(false)
  const router = useRouter()
  const read = useCallback(async () => {
    setError(null)
    try { const data = await api<WalletContext>(`/${id}/context`); setContext(data); setMustRefresh(false); return data }
    catch (e) { setError(e); setMustRefresh(true); return null }
  }, [id])
  useEffect(() => { void read() }, [read])
  async function decide(decision: 'approve' | 'reject') {
    if (lock.current || mustRefresh) return
    lock.current = true; setBusy(decision); setError(null)
    try { await api(`/${id}/decision`, { decision }); router.push(`/event/result/${id}`) }
    catch (e) {
      const current = await read()
      if (current && current.status !== 'pending') router.push(`/event/result/${id}`)
      else { if (current) setError(e); lock.current = false; setBusy(null) }
    }
  }
  return <Shell wallet step={reviewed ? 3 : 2} title={reviewed ? "Approve or reject" : "Review requested information"} subtitle="You decide what to share with EventPass.">{!context && !error ? <Loading/> : null}{context && <Card><div className="identity-row"><UserRound size={22} aria-hidden="true"/><div><small>Demo identity</small><strong>{context.user.displayName}</strong></div></div><div className="request-heading"><Ticket size={22} aria-hidden="true"/><h2>{context.relyingParty}</h2></div><p>{context.requestText}</p><div className="disclosure shared"><div className="section-label"><Eye size={20} aria-hidden="true"/><h3>Will be shared</h3></div><ul><li>{context.sharedText}</li></ul></div><div className="disclosure"><div className="section-label"><EyeOff size={20} aria-hidden="true"/><h3>Will not be shared</h3></div><ul>{context.notShared.map(item => <li key={item}>{item}</li>)}</ul></div><p className="trust-note">EventPass receives only the result of this check, not your identity profile.</p><Separator/><p className="consent">{context.consentText}</p>{error ? <ErrorNotice error={error} retry={() => void read()}/> : null}{context.status !== 'pending' ? <><p>This request already has a decision.</p><Button asChild className="full"><Link href={`/event/result/${id}`}>View result <ArrowUpRight size={18}/></Link></Button></> : !reviewed ? <Button className="full" disabled={mustRefresh} onClick={() => setReviewed(true)}>Continue to consent</Button> : <div className="actions"><Button variant="outline" disabled={Boolean(busy) || mustRefresh} onClick={() => void decide('reject')}>{busy === 'reject' ? 'Rejecting…' : 'Reject'}</Button><Button disabled={Boolean(busy) || mustRefresh} onClick={() => void decide('approve')}>{busy === 'approve' ? 'Approving…' : 'Approve'}</Button></div>}{busy && <p role="status" className="helper">Saving your decision…</p>}</Card>}{!context && error ? <ErrorNotice error={error} retry={() => void read()}/> : null}</Shell>
}
