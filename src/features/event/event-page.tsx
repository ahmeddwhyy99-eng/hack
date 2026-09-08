'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { Shell, ErrorNotice } from '@/components/shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/shared/api'

const identities = [['user_1', 'Omar Hassan'], ['user_2', 'Sara Ali'], ['user_3', 'Alex Morgan']] as const
export default function EventPage() {
  const [entered, setEntered] = useState(false)
  const [userId, setUserId] = useState('user_1')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [error, setError] = useState<unknown>(null)
  const router = useRouter()
  async function start(identity = userId) {
    if (lock.current) return
    lock.current = true; setBusy(true); setError(null)
    try { const data = await api<{verificationId: string}>('', { userId: identity, claim: 'age_over_18' }); router.push(`/wallet/${data.verificationId}`) }
    catch (e) { setError(e); lock.current = false; setBusy(false) }
  }
  return <Shell step={entered ? 1 : undefined} title={entered ? 'Choose demo identity' : 'Continue with Digital Identity'} subtitle="EventPass · Check eligibility for an 18+ event">
    <Card>
      {!entered ? <>
        <div className="service-intro"><ShieldCheck size={28} aria-hidden="true"/><div><h2>A fictional digital identity wallet</h2><p>This demonstration uses fake identities only. It is not a government service or a real sign-in system.</p></div></div>
        <p className="trust-note">Only the requested proof is shared.</p>
        <Button className="full" disabled={busy} onClick={() => setEntered(true)}>Sign in with Digital Identity<ArrowRight size={18} aria-hidden="true"/></Button>
      </> : <>
        <fieldset disabled={busy} aria-describedby="identity-help" className="identity-options"><legend>Demo identity</legend><p id="identity-help">The selected identity is simulated. No personal information is needed.</p>
          {identities.map(([id, name]) => <label className="identity-option" key={id}><input type="radio" name="identity" value={id} checked={userId === id} onChange={() => setUserId(id)}/><span><strong>{name}</strong><small>Fictional demo identity</small></span></label>)}
        </fieldset>
        <Button className="full" disabled={busy} onClick={() => void start()}> {busy ? 'Opening wallet…' : 'Review requested information'}<ArrowRight size={18} aria-hidden="true"/></Button>
      </>}
      {error ? <ErrorNotice error={error} retry={() => void start()}/> : null}
      <Button variant="outline" className="demo-shortcut full" disabled={busy} onClick={() => { setUserId('user_1'); void start('user_1') }}>Use Omar demo</Button>
      <p className="helper" role={busy ? 'status' : undefined}>{busy ? 'Creating your verification request…' : 'You will review the request and choose whether to approve. Nothing is approved automatically.'}</p>
    </Card>
  </Shell>
}
