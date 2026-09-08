# MASTER_SPEC.md

# Digital Identity Verification Simulator — Master Specification

## 1. Purpose

Build a very small hackathon demo that simulates how a digital identity verification system could work.

This project uses **fake/demo identity data only**.

It is not intended to be:

- a real government identity system;
- a real digital wallet;
- a real credential platform;
- a real national identity integration;
- a production cryptographic identity system.

The project must be realistic enough for a hackathon demonstration while remaining simple enough to implement in approximately **4 hours**.

---

## 2. Core Product Idea

A third-party website needs to verify one fact about a user.

Example:

> Is this user over 18?

Instead of receiving the user's full identity information, the third-party website receives only the verification result it needs.

Example result:

```json
{
  "verified": true,
  "claims": {
    "ageOver18": true
  }
}
```

The relying website must not receive unnecessary identity details such as:

```text
full date of birth
exact age
ID number
address
full identity profile
```

The main product idea is:

> **Ask for proof, not the entire identity.**

---

## 3. Main Actors

The simulation contains three conceptual actors:

```text
Fake User
↓
Digital Wallet Simulator
↓
Third-Party / Relying Website
```

For the primary hackathon demo:

```text
Fake User
↓
Wallet Simulator
↓
EventPass
```

EventPass is a simulated 18+ event website.

---

## 4. Main Demo Flow

The application must demonstrate this exact conceptual flow:

```text
Demo Website
    ↓
User clicks "Verify Identity"
    ↓
Digital Wallet Simulator opens
    ↓
Wallet shows what information is requested
    ↓
User clicks Approve or Reject
    ↓
Backend checks fake identity data
    ↓
Demo Website receives verification result
    ↓
Success or failure is displayed
```

---

## 5. Primary Demo Scenario

The main relying website is:

```text
EventPass
18+ Event
```

The page should communicate:

```text
You must verify your age to continue.

[Verify with Digital ID]
```

When verification starts, the Wallet Simulator should clearly communicate:

```text
EventPass requests:

✓ Proof that you are over 18
```

It should also communicate that EventPass will not receive unnecessary personal details.

Example:

```text
The website will NOT receive:

- your full date of birth
- your ID number
- your address
```

The user then chooses:

```text
Reject
Approve
```

---

## 6. Required Fake Users

The system contains exactly three demo users.

### User 1

```text
ID: user_1
Name: Omar Hassan
Age: 24
Student: Yes
Resident: Yes
```

Structured form:

```json
{
  "id": "user_1",
  "name": "Omar Hassan",
  "age": 24,
  "student": true,
  "resident": true
}
```

---

### User 2

```text
ID: user_2
Name: Sara Ali
Age: 16
Student: Yes
Resident: Yes
```

Structured form:

```json
{
  "id": "user_2",
  "name": "Sara Ali",
  "age": 16,
  "student": true,
  "resident": true
}
```

---

### User 3

```text
ID: user_3
Name: Alex Morgan
Age: 31
Student: No
Resident: No
```

Structured form:

```json
{
  "id": "user_3",
  "name": "Alex Morgan",
  "age": 31,
  "student": false,
  "resident": false
}
```

These are fake/demo identities only.

Do not add real personal data.

---

## 7. Supported Claims

Support only:

```text
age_over_18
student_status
residency_status
```

Do not add additional claims unless the core demo is already complete and there is extra time.

---

## 8. Verification Logic

The verification logic is intentionally simple.

### Age over 18

```text
age_over_18
→ user.age >= 18
```

### Student status

```text
student_status
→ user.student === true
```

### Residency status

```text
residency_status
→ user.resident === true
```

No AI is required.

No complex identity standard is required.

No cryptography is required.

---

## 9. Required Verification Outcomes

The system must support exactly these core outcomes.

### Outcome A — User approves and claim is satisfied

Example:

```text
Omar
Age: 24
Claim: age_over_18
Decision: Approve
```

Expected:

```text
Verified
Access granted
```

Example relying-party result:

```json
{
  "verified": true,
  "claims": {
    "ageOver18": true
  }
}
```

---

### Outcome B — User approves and claim is not satisfied

Example:

```text
Sara
Age: 16
Claim: age_over_18
Decision: Approve
```

Expected:

```text
Verification failed
Age requirement not satisfied
Access denied
```

---

### Outcome C — User rejects

Example:

```text
Omar
Claim: age_over_18
Decision: Reject
```

Expected:

```text
Verification rejected
Access denied
```

---

## 10. Optional Failure Scenario

Only if there is extra time:

```text
Verification expired
```

Do not implement complicated credential, signature, document, biometric, or identity-provider failures.

---

## 11. Required Pages

Keep the frontend intentionally small.

### 11.1 EventPass Demo Website

Purpose:

```text
Third-party website requesting verification
```

Core content:

```text
EventPass
18+ Event
You must verify your age to continue.

[Verify with Digital ID]
```

The demo may also contain a clearly labeled fake-user selector.

---

### 11.2 Wallet Simulator

Purpose:

```text
Show what the relying website is requesting
and allow the user to approve or reject
```

Must show:

- selected fake user;
- relying party;
- requested claim;
- what will be shared;
- what will not be shared;
- Approve;
- Reject.

---

### 11.3 Result Screen

Purpose:

```text
Show the result received by EventPass
```

Required states:

```text
✓ Verified
```

or:

```text
✗ Verification failed
```

with a short, user-safe reason.

---

### 11.4 Admin / Debug Page

Optional only.

If implemented, keep it tiny.

Possible fields:

```text
Verification ID
User
Requested Claim
Result
Time
```

Do not build a large dashboard.

---

## 12. Privacy Requirement

This is the most important product requirement.

The relying website receives only the verification result it needs.

Example internal backend knowledge:

```text
Omar age = 24
```

The EventPass result should receive:

```json
{
  "ageOver18": true
}
```

It should not receive:

```json
{
  "age": 24
}
```

The result must not unnecessarily expose:

```text
name
userId
age
date of birth
student status
residency status
address
full identity profile
```

unless a specific demo surface explicitly requires that information and it is not the relying-party result.

---

## 13. Important Simulation Disclaimer

This project demonstrates the **product concept** of selective disclosure.

It does not implement cryptographic selective disclosure.

The backend may internally access fake identity attributes in order to evaluate a claim.

The privacy demonstration is that the relying-party result is deliberately limited to the requested claim result.

---

## 14. Backend Responsibilities

The backend only needs to:

1. create a verification request;
2. store/read the pending request;
3. receive Approve or Reject;
4. load the selected fake user;
5. evaluate the requested claim;
6. save the result;
7. expose a privacy-safe relying-party result.

Do not add unrelated backend complexity.

---

## 15. Required API Capability

The agreed API contract is defined in:

```text
docs/TEAM_CONTRACTS.md
```

The core capability includes:

```text
POST /api/verifications

GET /api/verifications/:id/context

POST /api/verifications/:id/decision

GET /api/verifications/:id/result
```

`TEAM_CONTRACTS.md` is the technical source of truth for exact request and response shapes.

---

## 16. Verification Persistence

Use Supabase only as needed.

The database should remain extremely small.

Primary table:

```text
verification_requests
```

Expected fields:

```text
id
user_id
claim
status
result
reason_code
created_at
decided_at
```

Fake users may remain directly in backend code.

Do not create unnecessary identity tables.

---

## 17. Authentication

Authentication is not required for the core hackathon demo.

Do not add:

```text
email/password login
OAuth
Supabase Auth flows
roles
permissions
sessions
```

unless a later challenge requirement explicitly requires them.

---

## 18. File Storage

File storage is not required.

Do not add Supabase Storage unless a later challenge requirement makes uploaded files necessary.

---

## 19. Required Technology Stack

### Frontend

Use:

```text
Next.js
React
TypeScript
Next.js App Router
Tailwind CSS
shadcn/ui
Lucide icons
```

Do not introduce another frontend framework or general-purpose UI library.

---

### Backend

Use:

```text
Express
TypeScript
Zod
Netlify Functions
serverless-http
```

Keep backend business logic in Express.

Do not duplicate ordinary backend business logic in Next.js Route Handlers.

---

### Database

Use:

```text
Supabase PostgreSQL
```

Use the Supabase JavaScript/TypeScript client.

Privileged Supabase access must remain server-side.

---

### Deployment

Use:

```text
Netlify
```

The Next.js frontend and Express API should deploy through the agreed Netlify structure.

Do not introduce another hosting platform unless strictly necessary.

---

### Testing

Use:

```text
Vitest where useful
manual browser testing
Postman when useful
```

The core end-to-end demo flow must always be manually verified.

---

## 20. Frontend Design System

All UI must follow:

```text
docs/DESIGN_SYSTEM.md
```

This file defines the shared:

```text
visual direction
colors
typography
spacing
radius
layout rules
responsive behavior
shared component rules
states
accessibility expectations
```

Frontend developers must not invent separate design systems.

---

## 21. Project Architecture

Preferred high-level structure:

```text
project-root/
│
├── docs/
│
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   └── shared/
│
├── server/
│   ├── app.ts
│   ├── lib/
│   ├── middleware/
│   └── features/
│
├── netlify/
│   └── functions/
│
├── package.json
└── ...
```

Feature-specific code should stay inside feature-specific areas whenever possible.

---

## 22. Team Development Model

The project is developed by exactly three developers working in parallel.

The preferred workflow is:

```text
small shared foundation
↓
stable contracts
↓
parallel feature development
↓
small pull requests
↓
integration
↓
working demo
```

Avoid long sequential development.

Avoid multiple developers editing the same central files.

---

## 23. Shared Team Documents

The project uses these shared documents:

```text
docs/MASTER_SPEC.md
docs/TEAM_CONTRACTS.md
docs/DESIGN_SYSTEM.md
docs/CURRENT_STATE.md
docs/TASK_BOARD.md
```

Their roles are:

### `MASTER_SPEC.md`

Stable product/challenge source of truth.

Contains:

```text
what is being built
why
scope
core flows
constraints
success criteria
```

---

### `TEAM_CONTRACTS.md`

Stable technical/team source of truth.

Contains:

```text
API contracts
shared types
error conventions
logging conventions
ownership rules
protected files
database conventions
Git/PR rules
```

---

### `DESIGN_SYSTEM.md`

Stable frontend/UI source of truth.

---

### `CURRENT_STATE.md`

Current implementation state.

Updated after every iteration.

---

### `TASK_BOARD.md`

Current tasks, owners, branch status, and PR status.

---

## 24. Logging Requirement

Important backend operations must produce concise structured logs.

Useful fields include:

```text
level
requestId
method
path
operation
verificationId
claim
result
errorCode
durationMs
```

Every important API request should preserve or generate a request ID.

Failures should return safe application errors with request IDs.

Do not log:

```text
secrets
service-role keys
authorization headers
cookies
environment variables
full request objects
unnecessary personal data
```

---

## 25. Error Handling

Frontend failures must not produce blank screens.

Backend failures must not return raw stack traces or raw database errors.

Use stable application error codes as defined in:

```text
docs/TEAM_CONTRACTS.md
```

---

## 26. Core Demo Acceptance Criteria

The prototype is successful if the following demo works.

### Omar

```text
1. Select Omar.
2. Open EventPass.
3. Click Verify with Digital ID.
4. Wallet Simulator appears.
5. Wallet says EventPass requests proof that the user is over 18.
6. Click Approve.
7. Backend evaluates Omar's fake identity.
8. EventPass displays Age Verified.
```

Expected:

```text
Omar age = 24
age_over_18 = true
```

---

### Sara

```text
1. Select Sara.
2. Start age verification.
3. Approve.
4. Backend evaluates Sara's fake identity.
5. EventPass displays that the age requirement is not satisfied.
```

Expected:

```text
Sara age = 16
age_over_18 = false
```

---

### Reject

```text
1. Start a verification.
2. Click Reject.
3. EventPass displays that verification was rejected.
```

---

## 27. Privacy Acceptance Test

Inspect the relying-party result.

For age verification it may contain:

```json
{
  "verified": true,
  "claims": {
    "ageOver18": true
  }
}
```

It must not reveal the user's exact age.

The relying-party result must not expose unnecessary raw identity attributes.

---

## 28. Responsive Requirement

The main demo flow must work on:

```text
mobile
desktop
```

At minimum verify approximately:

```text
375px mobile width
desktop browser
```

---

## 29. Explicitly Out of Scope

Do not build by default:

```text
real national identity integration
real government APIs
real wallet standards
blockchain
biometrics
production PKI
complex cryptography
SDK generation
API-key management
multiple organizations
large admin dashboards
complex authentication
extensive analytics
real credentials
real identity documents
```

---

## 30. Scope Priority

If time is limited, prioritize in this order:

```text
1. Omar age verification works
2. Sara age verification fails correctly
3. Reject works
4. privacy-safe result payload
5. responsive and clean UI
6. production diagnostics
7. optional extra claims
8. optional debug/history page
```

Optional features must never delay the core demo.

---

## 31. Main Judge Message

The product demonstrates how an application could verify a specific identity attribute without receiving unnecessary personal information.

The main message is:

> **Ask for proof, not the entire identity.**

---

## 32. Master Specification Change Rule

This document should remain stable across iterations.

Update it only if the challenge scope or product-level requirements genuinely change.

Do not put iteration-specific task assignments, branch status, PR status, or temporary implementation notes in this file.

Those belong in:

```text
CURRENT_STATE.md
TASK_BOARD.md
docs/tasks/iteration-*/
```
