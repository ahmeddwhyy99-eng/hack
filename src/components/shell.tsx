'use client'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { ShieldCheck, ArrowLeft, CircleAlert, Check } from 'lucide-react'
import { Badge } from './ui/badge'
import { Alert } from './ui/alert'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'
import { ApiError } from '@/shared/api'

export type StepNumber = 1 | 2 | 3 | 4

const STEPS = [
  { step: 1, label: 'Identity', detail: 'Choose demo identity' },
  { step: 2, label: 'Review', detail: 'Review requested data' },
  { step: 3, label: 'Consent', detail: 'Approve or reject' },
  { step: 4, label: 'Result', detail: 'Verification receipt' },
] as const

export function StepIndicator({ currentStep }: { currentStep: StepNumber }) {
  return (
    <nav aria-label="Verification progress" className="step-nav">
      <ol className="step-list">
        {STEPS.map(({ step, label, detail }) => {
          const isCurrent = step === currentStep
          const isDone = step < currentStep
          return (
            <li
              key={step}
              className={`step-item ${isCurrent ? 'current' : isDone ? 'done' : 'upcoming'}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="step-marker" aria-hidden="true">
                {isDone ? <Check size={14} strokeWidth={3} /> : step}
              </div>
              <div className="step-text">
                <span className="step-label">{label}</span>
                <span className="step-detail">{detail}</span>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function Shell({
  step = 1,
  title,
  subtitle,
  children,
  wide = false,
  showBack = false,
  backHref = '/event',
  backText = 'Back',
}: {
  step?: StepNumber
  title: string
  subtitle?: string
  children: React.ReactNode
  wide?: boolean
  showBack?: boolean
  backHref?: string
  backText?: string
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [title])

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="gateway-header">
        <div className="header-inner">
          <div className="brand-group">
            <Link href="/event" className="brand" aria-label="SecureID Gateway home">
              <div className="brand-badge">
                <ShieldCheck size={20} aria-hidden="true" />
              </div>
              <div className="brand-copy">
                <span className="brand-title">SecureID Gateway</span>
                <span className="brand-sub">Civic Verification Simulator</span>
              </div>
            </Link>
          </div>
          <div className="header-meta">
            <Badge className="demo-badge">DEMO MODE</Badge>
            <span className="trust-pill" title="No real personal data or government records are accessed">
              Zero-Knowledge Verification
            </span>
          </div>
        </div>
      </header>

      <main id="main" className={wide ? 'main wide' : 'main'}>
        <StepIndicator currentStep={step} />

        {showBack && (
          <Link className="back-link" href={backHref}>
            <ArrowLeft size={16} aria-hidden="true" />
            {backText}
          </Link>
        )}

        <div className="page-heading">
          <p className="eyebrow">STEP {step} OF 4 · {STEPS[step - 1].detail.toUpperCase()}</p>
          <h1 ref={heading} tabIndex={-1}>
            {title}
          </h1>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>

        {children}
      </main>

      <footer className="gateway-footer">
        <div className="footer-inner">
          <p className="footer-motto">Ask for proof, not the entire identity.</p>
          <p className="footer-note">
            Fictional civic authentication simulator for demonstration only. No government databases, real identities,
            passwords, or cryptographic keys are used.
          </p>
        </div>
      </footer>
    </>
  )
}

export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  const isNotFound = error instanceof ApiError && error.code === 'NOT_FOUND'
  const isConflict = error instanceof ApiError && error.code === 'ALREADY_DECIDED'
  const title = isNotFound
    ? 'Verification Request Not Found'
    : isConflict
      ? 'Request Already Decided'
      : 'Service Notice'

  const message =
    error instanceof Error
      ? error.message
      : 'Unable to communicate with the verification engine. Please retry.'

  return (
    <Alert role="alert" className="error-alert">
      <CircleAlert aria-hidden="true" size={20} />
      <div className="alert-body">
        <strong>{title}</strong>
        <p>{message}</p>
        {error instanceof ApiError && error.requestId && (
          <small className="audit-id">Audit Ref: {error.requestId}</small>
        )}
        {retry && (
          <Button variant="outline" onClick={retry} className="retry-btn">
            Retry Connection
          </Button>
        )}
      </div>
    </Alert>
  )
}

export function Loading({ message = 'Loading verification request…' }: { message?: string }) {
  return (
    <div className="card loading-card" role="status">
      <p className="loading-message">{message}</p>
      <Skeleton />
      <Skeleton />
    </div>
  )
}
