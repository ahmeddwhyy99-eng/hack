'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  ShieldOff,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileText,
  RotateCcw,
  ExternalLink,
} from 'lucide-react'
import { Shell, Loading, ErrorNotice } from '@/components/shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { api } from '@/shared/api'
import { claimLabels, type VerificationResult } from '@/shared/contracts'

const STATE_CONFIG = {
  verified: {
    statusLabel: 'VERIFIED SUCCESSFULLY',
    title: 'Age Requirement Confirmed',
    description: 'The 18+ age verification check succeeded. Access granted for this demo event.',
    icon: CheckCircle2,
    tone: 'success',
    badgeText: 'Access Authorized',
  },
  failed: {
    statusLabel: 'REQUIREMENT NOT MET',
    title: 'Age Requirement Not Satisfied',
    description:
      'The 18+ check returned a negative result. Access was safely denied without exposing your real date of birth or age.',
    icon: XCircle,
    tone: 'warning',
    badgeText: 'Access Denied (Safe)',
  },
  rejected: {
    statusLabel: 'REQUEST REJECTED',
    title: 'Verification Declined',
    description:
      'You declined to share the requested verification check. No personal data or check results were transferred to EventPass.',
    icon: ShieldOff,
    tone: 'neutral',
    badgeText: 'Zero Data Shared',
  },
  pending: {
    statusLabel: 'AWAITING CONSENT',
    title: 'Request Still Processing',
    description: 'This verification request is awaiting an authorization decision in the digital wallet simulator.',
    icon: Clock,
    tone: 'info',
    badgeText: 'Pending Decision',
  },
} as const

export default function ResultPage({ id }: { id: string }) {
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<unknown>(null)

  const read = useCallback(async () => {
    setError(null)
    try {
      setResult(await api<VerificationResult>(`/${id}/result`))
    } catch (e) {
      setError(e)
    }
  }, [id])

  useEffect(() => {
    void read()
  }, [read])

  const state = result ? STATE_CONFIG[result.status] : null
  const hasClaims = result && Object.keys(result.claims).length > 0

  return (
    <Shell
      step={4}
      title={state ? state.title : 'Verification Result'}
      subtitle="The relying service (EventPass) has received the authorized proof outcome."
      showBack
      backHref="/event"
      backText="Start a New Verification"
    >
      {error ? <ErrorNotice error={error} retry={() => void read()} /> : null}
      {!result && !error && <Loading message="Loading finalized verification receipt…" />}

      {result && state && (
        <Card className={`result-card result-${state.tone}`}>
          {/* Status Header Banner */}
          <div className="status-hero">
            <div className={`status-icon-bubble ${state.tone}`} aria-hidden="true">
              <state.icon size={36} strokeWidth={2.2} />
            </div>
            <div className="status-headline">
              <div className="status-badge-row">
                <span className="status-kicker">{state.statusLabel}</span>
                <Badge className={`badge-outcome ${state.tone}`}>{state.badgeText}</Badge>
              </div>
              <h2 className="status-title">{state.title}</h2>
              <p className="status-desc">{state.description}</p>
            </div>
          </div>

          <Separator />

          {/* Official Privacy Receipt */}
          <div className="civic-receipt-panel">
            <div className="receipt-header">
              <FileText size={18} className="receipt-icon" aria-hidden="true" />
              <div>
                <h3 className="receipt-title">Official Privacy Receipt</h3>
                <span className="receipt-subtitle">Auditable record of data disclosed at the API boundary</span>
              </div>
            </div>

            <div className="receipt-content">
              {hasClaims ? (
                <div className="receipt-claims-section">
                  <span className="receipt-section-label">DATA DISCLOSED TO EVENTPASS:</span>
                  <div className="claims-list">
                    {Object.entries(result.claims).map(([key, val]) => (
                      <div className="claim-row" key={key}>
                        <span className="claim-label">
                          {claimLabels[key as keyof typeof claimLabels] || key}
                        </span>
                        <span className={`claim-value ${val ? 'positive' : 'negative'}`}>
                          {val ? 'Yes (Satisfied)' : 'No (Not Met)'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="receipt-empty-claims">
                  <ShieldCheck size={16} aria-hidden="true" />
                  <span>
                    {result.status === 'rejected'
                      ? 'No check result was shared. Request was rejected by user.'
                      : 'No verification result generated yet.'}
                  </span>
                </div>
              )}

              <div className="receipt-divider" />

              <div className="receipt-protected-section">
                <span className="receipt-section-label">ATTRIBUTES NEVER DISCLOSED:</span>
                <p className="protected-tags">
                  <span>Full Legal Name</span>
                  <span>Exact Date of Birth</span>
                  <span>National ID / Passport #</span>
                  <span>Home Address</span>
                  <span>Photo / Biometrics</span>
                </p>
              </div>

              <div className="receipt-audit-footer">
                <div className="audit-col">
                  <small>VERIFICATION ID</small>
                  <code>{result.verificationId}</code>
                </div>
                <div className="audit-col">
                  <small>DATA RETENTION</small>
                  <span className="retention-zero">0 Bytes of Personal Identity Stored</span>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="result-action-row">
            {result.status === 'pending' ? (
              <Button asChild className="btn-return-wallet">
                <Link href={`/wallet/${id}`}>
                  Return to Wallet Simulator
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <Button asChild className="btn-start-another">
                <Link href="/event">
                  <RotateCcw size={18} aria-hidden="true" />
                  Start Another Verification
                </Link>
              </Button>
            )}
          </div>

          {/* Collapsible Developer / Presentation Audit Details */}
          <details className="audit-details-collapse">
            <summary className="audit-summary">
              <span>View Technical API Audit (JSON Payload)</span>
              <ExternalLink size={14} aria-hidden="true" />
            </summary>
            <div className="audit-json-wrapper">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          </details>
        </Card>
      )}
    </Shell>
  )
}
