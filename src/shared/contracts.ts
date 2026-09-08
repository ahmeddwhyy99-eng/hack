export const claims = ['age_over_18', 'student_status', 'residency_status'] as const
export type Claim = typeof claims[number]
export type Status = 'pending' | 'verified' | 'failed' | 'rejected'
export type VerificationResult = {
  verificationId: string
  status: Status
  verified: boolean
  claims: Partial<Record<'ageOver18' | 'studentStatus' | 'residencyStatus', boolean>>
  reasonCode?: 'CLAIM_NOT_SATISFIED' | 'USER_REJECTED'
}
export type WalletContext = {
  verificationId: string
  status: Status
  user: { displayName: string }
  relyingParty: 'EventPass'
  claim: Claim
  requestText: string
  sharedText: string
  notShared: string[]
  consentText: string
}
export const claimLabels = { ageOver18: 'Age 18 or older', studentStatus: 'Student status', residencyStatus: 'Residency status' }
