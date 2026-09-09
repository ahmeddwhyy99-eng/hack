'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
  UserCheck,
  UserX,
  Shield,
  Info,
} from 'lucide-react'
import { Shell, ErrorNotice } from '@/components/shell'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { api } from '@/shared/api'

type DemoPersona = {
  id: 'user_1' | 'user_2' | 'user_3'
  name: string
  statusTag: string
  tagVariant: 'success' | 'warning' | 'neutral'
  eligibilityDescription: string
  expectedOutcome: string
}

const PERSONAS: DemoPersona[] = [
  {
    id: 'user_1',
    name: 'Omar Hassan',
    statusTag: 'Age 18+ Eligible',
    tagVariant: 'success',
    eligibilityDescription: 'Adult credential verified · Eligible for 18+ entry',
    expectedOutcome: 'Expected: Pass (Age Verified)',
  },
  {
    id: 'user_2',
    name: 'Sara Ali',
    statusTag: 'Age Requirement Unmet',
    tagVariant: 'warning',
    eligibilityDescription: 'Minor credential (under 18) · Demonstrates safe failure',
    expectedOutcome: 'Expected: Requirement Not Met',
  },
  {
    id: 'user_3',
    name: 'Alex Morgan',
    statusTag: 'Age 18+ Eligible',
    tagVariant: 'neutral',
    eligibilityDescription: 'Adult credential verified · Standard non-student profile',
    expectedOutcome: 'Expected: Pass (Age Verified)',
  },
]

export default function EventPage() {
  const [userId, setUserId] = useState<'user_1' | 'user_2' | 'user_3'>('user_1')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [error, setError] = useState<unknown>(null)
  const router = useRouter()

  async function startVerification(selectedUser = userId) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError(null)
    try {
      const data = await api<{ verificationId: string }>('', {
        userId: selectedUser,
        claim: 'age_over_18',
      })
      router.push(`/wallet/${data.verificationId}`)
    } catch (e) {
      setError(e)
      lock.current = false
      setBusy(false)
    }
  }

  return (
    <Shell
      step={1}
      title="Sign In with Secure Digital ID"
      subtitle="Select a simulated identity to request proof for EventPass (18+ Event)."
      wide
    >
      {/* Relying Party Context Banner */}
      <div className="civic-portal-banner">
        <div className="portal-icon">
          <Shield size={26} aria-hidden="true" />
        </div>
        <div className="portal-details">
          <div className="portal-header-line">
            <span className="portal-kicker">RELYING SERVICE AUTHENTICATION</span>
            <Badge className="badge-official">EventPass Portal</Badge>
          </div>
          <h2>Age Verification Gate</h2>
          <p>
            EventPass requires proof that you are <strong>18 or older</strong> to access tickets.
          </p>
        </div>
      </div>

      {/* Trust & Privacy Notice */}
      <div className="trust-callout">
        <Lock size={18} className="trust-icon" aria-hidden="true" />
        <div className="trust-body">
          <strong>Only the requested proof is shared</strong>
          <p>
            This is a fictional digital identity wallet demonstration. EventPass only receives a verified Yes/No result.
            Your exact birthdate, national ID, address, and profile are never disclosed.
          </p>
        </div>
      </div>

      <Card className="identity-selection-card">
        <div className="selection-header">
          <div>
            <h3 id="identity-group-label" className="selection-title">
              Choose Demo Identity
            </h3>
            <p className="selection-sub">
              Select one of three fictional personas to explore different verification outcomes.
            </p>
          </div>

          {/* Quick Demo Shortcut Button */}
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setUserId('user_1')
              void startVerification('user_1')
            }}
            className="quick-demo-btn"
            title="Fast-track to wallet consent with Omar Hassan"
          >
            <Sparkles size={15} aria-hidden="true" />
            <span>Use Omar Demo</span>
          </Button>
        </div>

        {/* Accessible Radio Cards */}
        <fieldset
          className="persona-radio-group"
          aria-labelledby="identity-group-label"
          disabled={busy}
        >
          {PERSONAS.map((persona) => {
            const isSelected = userId === persona.id
            const Icon = persona.tagVariant === 'warning' ? UserX : UserCheck
            return (
              <label
                key={persona.id}
                className={`persona-card ${isSelected ? 'selected' : ''}`}
                htmlFor={`persona-${persona.id}`}
              >
                <input
                  type="radio"
                  id={`persona-${persona.id}`}
                  name="demo-identity"
                  value={persona.id}
                  checked={isSelected}
                  onChange={() => setUserId(persona.id)}
                  className="sr-only"
                />

                <div className="persona-radio-indicator" aria-hidden="true">
                  <div className={`radio-dot ${isSelected ? 'active' : ''}`} />
                </div>

                <div className="persona-avatar" aria-hidden="true">
                  <Icon size={20} />
                </div>

                <div className="persona-info">
                  <div className="persona-name-row">
                    <span className="persona-name">{persona.name}</span>
                    <span className={`status-tag ${persona.tagVariant}`}>
                      {persona.statusTag}
                    </span>
                  </div>
                  <p className="persona-desc">{persona.eligibilityDescription}</p>
                  <p className="persona-expected">{persona.expectedOutcome}</p>
                </div>

                {isSelected && (
                  <div className="selected-check" aria-hidden="true">
                    <CheckCircle2 size={18} />
                  </div>
                )}
              </label>
            )
          })}
        </fieldset>

        <div className="identity-safe-notice">
          <Info size={14} aria-hidden="true" />
          <span>Fictional demo data only. No real ID numbers, addresses, or phone numbers exist in this system.</span>
        </div>

        <Separator />

        {error ? <ErrorNotice error={error} retry={() => void startVerification()} /> : null}

        <div className="flow-action-row">
          <Button
            type="button"
            className="btn-continue"
            disabled={busy}
            onClick={() => void startVerification()}
          >
            {busy ? 'Initiating Verification…' : 'Continue with Secure ID'}
            <ArrowRight size={18} aria-hidden="true" />
          </Button>
        </div>

        <p className="helper-text" role={busy ? 'status' : undefined}>
          {busy
            ? 'Creating secure request token. Redirecting to wallet simulator…'
            : 'Next: You will review and consent to the requested check in your digital wallet.'}
        </p>
      </Card>
    </Shell>
  )
}
