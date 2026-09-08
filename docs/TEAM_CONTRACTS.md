# API and integration contracts

Established during implementation because the referenced contract was absent from the supplied repository. Implements the result-state alignment proposed in DESIGN_SYSTEM.md.

All paths are same-origin. JSON requests only. Demo-only; no authentication or real personal data.

## Requests

- `POST /api/verifications`: `{ "userId": "user_1", "claim": "age_over_18" }`. Returns 201 `{ "verificationId": "<uuid>", "status": "pending" }`.
- `GET /api/verifications/:id/context`: wallet-only context with `verificationId`, `status`, `user: { displayName }`, `relyingParty`, `claim`, `requestText`, `sharedText`, `notShared: string[]`, `consentText`. Never returns raw fake attributes.
- `POST /api/verifications/:id/decision`: `{ "decision": "approve" | "reject" }`. Returns `{ verificationId, status }`. Only pending requests may change; repeated or concurrent losing decisions return 409.
- `GET /api/verifications/:id/result`: `{ verificationId, status, verified, claims, reasonCode? }`. EventPass results use only this endpoint.

Claims: `age_over_18`, `student_status`, `residency_status`. Result keys respectively: `ageOver18`, `studentStatus`, `residencyStatus`.

| Status | verified | claims | reasonCode |
| --- | --- | --- | --- |
| pending | false | empty | omitted |
| verified | true | requested boolean true | omitted |
| failed | false | requested boolean false | CLAIM_NOT_SATISFIED |
| rejected | false | empty | USER_REJECTED |

No name, user ID, exact age, birth date, address, or unrelated claim appears in relying-party responses. The frontend identity selector contains only the three approved display names and demo IDs. Wallet display names come from backend context.

## Errors and diagnostics

Errors: `{ error: { code, message, requestId } }`. Codes: INVALID_REQUEST (400), NOT_FOUND (404), ALREADY_DECIDED (409), SERVICE_UNAVAILABLE (503). Clients may also report NETWORK_ERROR. All API responses disable caching. Request IDs accept only short alphanumeric/underscore/hyphen values, otherwise generated UUIDs. Logs contain request ID, method, operation, status and duration, never bodies or credentials.

After uncertain submission, the wallet re-reads context before enabling another decision. If this read fails, decisions remain disabled until Retry succeeds. Already-decided context offers the result link.

## Persistence and integration

Business logic belongs in `server/features/verifications`. Express owns all endpoints; Next.js rewrites are transport only. Supabase stores one `verification_requests` table; fake profiles stay server-side. Decisions use an atomic conditional update on pending status. RLS is enabled without public policies; privileged credentials are server-only. Memory storage is for a single local process and resets on restart; it is prohibited on Netlify.

Shared integration areas correspond to the ownership described in MASTER_SPEC.md. This workspace implementation covers all feature areas under the user's request. Initial source delivery targets `main` in `ahmeddwhyy99-eng/hack`. No feature PRs or live deployment were created.
