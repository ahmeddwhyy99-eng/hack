'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Fingerprint, Info, Ticket } from 'lucide-react'
import { Shell, ErrorNotice } from '@/components/shell'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { api } from '@/shared/api'
export default function EventPage() {
  const [userId, setUserId] = useState('user_1')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [error, setError] = useState<unknown>(null)
  const router = useRouter()
  async function start() {
    if (lock.current) return
    lock.current = true; setBusy(true); setError(null)
    try { const data = await api<{verificationId: string}>('', { userId, claim: 'age_over_18' }); router.push(`/wallet/${data.verificationId}`) }
    catch (e) { setError(e); lock.current = false; setBusy(false) }
  }
  return <Shell wide title="Verify your age to continue" subtitle="This demo event is for people aged 18 or older."><Card><div className="event-banner"><div className="icon-tile"><Ticket size={28} aria-hidden="true"/></div><div><p className="eyebrow">A LITTLE PROOF. MORE PRIVACY.</p><h2>EventPass <span>·</span> 18+ event</h2></div><Badge>18+</Badge></div><Separator/><div className="privacy-intro"><Fingerprint size={24} aria-hidden="true"/><div><h3>Just the answer we need</h3><p>EventPass only needs a yes/no age-check result.</p><p className="muted">Your exact age, date of birth, ID number, and address are not included in the verification response.</p></div></div><div className="demo-controls"><div className="section-label"><Info size={16} aria-hidden="true"/><h3>Demo controls</h3></div><label htmlFor="identity">Demo identity</label><Select id="identity" value={userId} onChange={e => setUserId(e.target.value)} disabled={busy} aria-describedby="identity-help"><option value="user_1">Omar Hassan</option><option value="user_2">Sara Ali</option><option value="user_3">Alex Morgan</option></Select><p id="identity-help">Choose a fictional identity to explore the verification flow.</p></div>{error ? <ErrorNotice error={error} retry={start}/> : null}<Button className="full" disabled={busy} onClick={start}>{busy ? 'Opening wallet…' : 'Verify with Digital ID'}<ArrowRight size={18} aria-hidden="true"/></Button><p className="helper" role={busy ? 'status' : undefined}>{busy ? 'Creating your verification request.' : 'You’ll review the request in the wallet simulator before sharing a result.'}</p></Card></Shell>
}
