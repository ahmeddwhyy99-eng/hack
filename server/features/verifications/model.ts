import type { Claim, Status, VerificationResult, WalletContext } from '../../../src/shared/contracts'
export const users = {
  user_1: { name: 'Omar Hassan', age: 24, student: true, resident: true },
  user_2: { name: 'Sara Ali', age: 16, student: true, resident: true },
  user_3: { name: 'Alex Morgan', age: 31, student: false, resident: false },
}
export type RecordRow = { id: string; user_id: keyof typeof users; claim: Claim; status: Status; result: boolean | null; reason_code: VerificationResult['reasonCode'] | null; created_at: string; decided_at: string | null }
export const keys = { age_over_18: 'ageOver18', student_status: 'studentStatus', residency_status: 'residencyStatus' } as const
export function evaluate(row: RecordRow, decision: 'approve' | 'reject'): RecordRow {
  if (decision === 'reject') return { ...row, status: 'rejected', result: null, reason_code: 'USER_REJECTED', decided_at: new Date().toISOString() }
  const user = users[row.user_id]
  const result = { age_over_18: user.age >= 18, student_status: user.student, residency_status: user.resident }[row.claim]
  return { ...row, status: result ? 'verified' : 'failed', result, reason_code: result ? null : 'CLAIM_NOT_SATISFIED', decided_at: new Date().toISOString() }
}
export function resultFor(row: RecordRow): VerificationResult {
  return { verificationId: row.id, status: row.status, verified: row.status === 'verified', claims: row.result === null ? {} : { [keys[row.claim]]: row.result }, ...(row.reason_code ? { reasonCode: row.reason_code } : {}) }
}
export function contextFor(row: RecordRow): WalletContext {
  const fact = { age_over_18: 'you are 18 or older', student_status: 'you are a student', residency_status: 'you are a resident' }[row.claim]
  return { verificationId: row.id, status: row.status, user: { displayName: users[row.user_id].name }, relyingParty: 'EventPass', claim: row.claim,
    requestText: `EventPass wants to check whether ${fact}.`, sharedText: `Whether ${fact}: Yes or No.`,
    notShared: ['Full name in the verification response', 'Exact age or date of birth', 'ID number', 'Address', ...(row.claim === 'age_over_18' ? ['Student or residency information'] : ['Other identity attributes'])],
    consentText: `Approving shares the ${row.claim === 'age_over_18' ? 'age-check' : 'requested check'} result with EventPass, including a “No” result if the requirement is not met. Rejecting does not share a check result.` }
}
