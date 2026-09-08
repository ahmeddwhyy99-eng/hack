'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CircleCheck, CircleX, CircleSlash, Clock3, ArrowRight, CloudOff } from 'lucide-react'
import { Shell, Loading, ErrorNotice } from '@/components/shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api, ApiError } from '@/shared/api'
import { claimLabels, type VerificationResult } from '@/shared/contracts'
const states = {
  verified: { title: 'Verified successfully', description: 'The requested requirement is met. Access granted for this demo.', icon: CircleCheck, tone: 'success' },
  failed: { title: 'Requirement not met', description: 'The requested requirement is not met. Access was not granted.', icon: CircleX, tone: 'warning' },
  rejected: { title: 'Request rejected', description: 'You declined the request. No claim result was shared.', icon: CircleSlash, tone: 'neutral' },
  pending: { title: 'Request still processing', description: 'This request is waiting for a decision. Return to the wallet to approve or reject it.', icon: Clock3, tone: 'info' },
  unavailable: { title: 'Service unavailable', description: 'We could not confirm the outcome. Retry to check the existing request.', icon: CloudOff, tone: 'warning' },
}
export default function ResultPage({ id }: { id: string }) {
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const lock = useRef(false)
  const read = useCallback(async () => {
    if (lock.current) return
    lock.current = true; setLoading(true); setError(null)
    try { setResult(await api<VerificationResult>(`/${id}/result`)) }
    catch (e) { setResult(null); setError(e) }
    finally { lock.current = false; setLoading(false) }
  }, [id])
  useEffect(() => { void read() }, [read])
  const missing = error instanceof ApiError && ['NOT_FOUND', 'INVALID_REQUEST'].includes(error.code)
  const state = error ? states.unavailable : result ? states[result.status] : null
  return <Shell step={4} title={loading ? 'Verification result' : missing ? 'Verification unavailable' : state?.title || 'Verification result'}>
    {loading ? <Loading/> : state && <Card>
      <div className={`result-header ${state.tone}`}><div className="result-icon"><state.icon size={32} aria-hidden="true"/></div><p>{missing ? 'This verification could not be found or the request link is invalid.' : state.description}</p></div>
      <div className="receipt"><h2>Privacy receipt</h2><h3>Claim result shared with EventPass</h3>
        {result && Object.keys(result.claims).length ? Object.entries(result.claims).map(([key, value]) => <p className="receipt-answer" key={key}>{claimLabels[key as keyof typeof claimLabels]}: <strong>{value ? 'Yes' : 'No'}</strong></p>) : <p>{error ? 'Unknown — the service could not confirm what was shared.' : result?.status === 'rejected' ? 'None. You rejected the request.' : 'None yet. No check has been evaluated.'}</p>}
        <hr/><h3>{error ? 'Disclosure boundary' : 'Not disclosed to EventPass'}</h3><p>Name, exact age, date of birth, ID number, address, full identity profile, and attributes unrelated to the requested check.</p>
        <p className="receipt-note">{error ? 'The result API is designed to return only the requested claim and request status. Retry for a confirmed receipt.' : 'EventPass receives the request status and only the result of this check, not your identity profile.'}</p>
      </div>
      {error ? <ErrorNotice error={error} retry={() => void read()}/> : null}
      {result?.status === 'pending' && <div className="pending-actions"><Button asChild variant="outline" className="full"><Link href={`/wallet/${id}`}>Return to wallet</Link></Button><Button variant="outline" className="full" onClick={() => void read()}>Refresh result</Button></div>}
      <Button asChild className="full"><Link href="/event">Start another verification<ArrowRight size={18} aria-hidden="true"/></Link></Button>
      {result && <details><summary>Demo details · exact API result</summary><pre>{JSON.stringify(result, null, 2)}</pre></details>}
    </Card>}
  </Shell>
}
