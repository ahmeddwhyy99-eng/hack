'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { CircleCheck, CircleX, CircleSlash, Clock3, ArrowRight } from 'lucide-react'
import { Shell, Loading, ErrorNotice } from '@/components/shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/shared/api'
import { claimLabels, type VerificationResult } from '@/shared/contracts'
const states = {
  verified: { title: 'Age verified', description: 'The 18+ requirement is met. Access granted for this demo.', icon: CircleCheck, tone: 'success' },
  failed: { title: 'Age requirement not met', description: 'The 18+ requirement is not met. Access was not granted.', icon: CircleX, tone: 'warning' },
  rejected: { title: 'Verification rejected', description: 'You declined to share a check result. Access was not granted.', icon: CircleSlash, tone: 'neutral' },
  pending: { title: 'Awaiting your decision', description: 'This request has not been approved or rejected.', icon: Clock3, tone: 'info' },
}
export default function ResultPage({ id }: { id: string }) {
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<unknown>(null)
  const read = useCallback(async () => { setError(null); try { setResult(await api<VerificationResult>(`/${id}/result`)) } catch (e) { setError(e) } }, [id])
  useEffect(() => { void read() }, [read])
  const state = result ? states[result.status] : null
  const ageResult = result && Object.hasOwn(result.claims, 'ageOver18')
  const title = state ? (!ageResult && result && ['verified', 'failed'].includes(result.status) ? result.verified ? 'Requirement verified' : 'Requirement not met' : state.title) : 'Verification result'
  return <Shell title={title}>{error ? <ErrorNotice error={error} retry={() => void read()}/> : null}{!result && !error ? <Loading/> : null}{result && state && <Card><div className={`result-header ${state.tone}`}><div className="result-icon"><state.icon size={32} aria-hidden="true"/></div><p>{ageResult || ['pending', 'rejected'].includes(result.status) ? state.description : result.verified ? 'The requested requirement is met. Access granted for this demo.' : 'The requested requirement is not met. Access was not granted.'}</p></div><div className="receipt"><h2>Privacy receipt</h2>{Object.keys(result.claims).length ? <><p className="eyebrow">EVENTPASS RECEIVED</p>{Object.entries(result.claims).map(([key, value]) => <p className="receipt-answer" key={key}>{claimLabels[key as keyof typeof claimLabels]}: <strong>{value ? 'Yes' : 'No'}</strong></p>)}<hr/><h3>Not included in the verification response</h3><p>Name, exact age, date of birth, ID number, address, or full profile.</p></> : <p>{result.status === 'rejected' ? 'No check result shared.' : 'No check result yet.'}</p>}</div><Button asChild className="full"><Link href={result.status === 'pending' ? `/wallet/${id}` : '/event'}>{result.status === 'pending' ? 'Return to wallet' : result.status === 'rejected' ? 'Start a new verification' : 'Try another demo identity'}<ArrowRight size={18} aria-hidden="true"/></Link></Button><details><summary>Demo details</summary><pre>{JSON.stringify(result, null, 2)}</pre></details></Card>}</Shell>
}
