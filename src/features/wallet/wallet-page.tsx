'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowUpRight,
  User,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Building2,
  Lock,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react'
import { Shell, Loading, ErrorNotice } from '@/components/shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { api } from '@/shared/api'
import type { WalletContext } from '@/shared/contracts'

export default function WalletPage({ id }: { id: string }) {
  const [context, setContext] = useState<WalletContext | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [mustRefresh, setMustRefresh] = useState(false)
  const lock = useRef(false)
  const router = useRouter()

  const read = useCallback(async () => {
    setError(null)
    try {
      const data = await api<WalletContext>(`/${id}/context`)
      setContext(data)
      setMustRefresh(false)
      return data
    } catch (e) {
      setError(e)
      setMustRefresh(true)
      return null
    }
  }, [id])

  useEffect(() => {
    void read()
  }, [read])

  async function decide(decision: 'approve' | 'reject') {
    if (lock.current || mustRefresh) return
    lock.current = true
    setBusy(decision)
    setError(null)
    try {
      await api(`/${id}/decision`, { decision })
      router.push(`/event/result/${id}`)
    } catch (e) {
      const current = await read()
      if (current && current.status !== 'pending') {
        router.push(`/event/result/${id}`)
      } else {
        if (current) setError(e)
        lock.current = false
        setBusy(null)
      }
    }
  }

  return (
    <Shell
      step={context?.status === 'pending' ? 3 : 2}
      title="Consent to Verification Request"
      subtitle="Review the exact proof requested by EventPass before authorizing disclosure."
      showBack
      backHref="/event"
      backText="Return to Identity Selection"
    >
      {!context && !error ? <Loading message="Retrieving verification request from digital wallet…" /> : null}

      {context && (
        <Card className="consent-card">
          {/* Identity Bar */}
          <div className="civic-identity-bar">
            <div className="identity-avatar">
              <User size={20} aria-hidden="true" />
            </div>
            <div className="identity-text">
              <span className="identity-kicker">SIMULATED IDENTITY CREDENTIAL</span>
              <strong className="identity-name">{context.user.displayName}</strong>
            </div>
            <Badge className="badge-credential">Simulated Wallet Active</Badge>
          </div>

          {/* Relying Party Header */}
          <div className="relying-party-block">
            <div className="party-icon">
              <Building2 size={24} aria-hidden="true" />
            </div>
            <div className="party-copy">
              <span className="party-kicker">RELYING SERVICE REQUEST</span>
              <h2 className="party-name">{context.relyingParty}</h2>
              <p className="party-purpose">{context.requestText}</p>
            </div>
          </div>

          {/* Explicit Disclosure Boundaries */}
          <div className="disclosure-grid">
            {/* What WILL be shared */}
            <div className="disclosure-box will-share">
              <div className="box-header">
                <CheckCircle size={18} className="share-icon" aria-hidden="true" />
                <h3>Will Be Shared</h3>
                <span className="box-badge share-badge">Selective Proof</span>
              </div>
              <ul className="disclosure-list">
                <li>
                  <strong>{context.sharedText}</strong>
                </li>
              </ul>
              <div className="box-footer">
                <ShieldCheck size={14} aria-hidden="true" />
                <span>Single boolean claim. No other fields disclosed.</span>
              </div>
            </div>

            {/* What will NOT be shared */}
            <div className="disclosure-box will-not-share">
              <div className="box-header">
                <XCircle size={18} className="protect-icon" aria-hidden="true" />
                <h3>Will NOT Be Shared</h3>
                <span className="box-badge protect-badge">Kept Private</span>
              </div>
              <ul className="disclosure-list not-shared-list">
                {context.notShared.map((item) => (
                  <li key={item}>
                    <Lock size={12} className="lock-bullet" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="box-footer">
                <Lock size={14} aria-hidden="true" />
                <span>Zero personal records or documents transferred.</span>
              </div>
            </div>
          </div>

          {/* Compact Trust Notice */}
          <div className="privacy-guarantee-notice">
            <ShieldCheck size={20} className="guarantee-icon" aria-hidden="true" />
            <p>
              <strong>Privacy Notice: </strong>
              EventPass receives only the verified result of this specific check, not your identity profile.
            </p>
          </div>

          <Separator />

          {/* Legal / Policy Consent Text */}
          <p className="consent-terms-text">{context.consentText}</p>

          {error ? <ErrorNotice error={error} retry={() => void read()} /> : null}

          {/* Action Buttons */}
          {context.status !== 'pending' ? (
            <div className="already-decided-panel">
              <div className="decided-notice">
                <AlertTriangle size={18} aria-hidden="true" />
                <span>This verification request has already been finalized.</span>
              </div>
              <Button asChild className="btn-view-result">
                <Link href={`/event/result/${id}`}>
                  View Verification Result
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="consent-action-grid">
              <Button
                type="button"
                variant="outline"
                disabled={Boolean(busy) || mustRefresh}
                onClick={() => void decide('reject')}
                className="btn-reject"
              >
                {busy === 'reject' ? 'Recording Rejection…' : 'Reject Request'}
              </Button>

              <Button
                type="button"
                disabled={Boolean(busy) || mustRefresh}
                onClick={() => void decide('approve')}
                className="btn-approve"
              >
                {busy === 'approve' ? 'Authorizing Proof…' : 'Approve & Share Result'}
                <ArrowRight size={18} aria-hidden="true" />
              </Button>
            </div>
          )}

          {busy && (
            <p role="status" className="busy-status-label">
              Processing cryptographic verification record…
            </p>
          )}
        </Card>
      )}

      {!context && error ? <ErrorNotice error={error} retry={() => void read()} /> : null}
    </Shell>
  )
}
