# DESIGN.md — Digital Identity Verification Simulator

**Recommended direction:** Civic Minimalism — a calm, modern digital-service interface.

**Ready component base:** shadcn/ui New York, neutral base, CSS variables, Tailwind CSS, Lucide icons.

**Scope:** EventPass, wallet consent, and verification results for Iteration 1.

This is a project-specific design specification, not an official shadcn preset. It replaces the provisional visual direction in the supplied hackathon plan. The simulation constraints, routes, team ownership, and agreed API contracts remain authoritative. Section 11 identifies one API alignment item without silently changing that contract.

**Repository placement:** the Integration Owner should put this content in `docs/DESIGN_SYSTEM.md`, because the existing developer task packets already read that path. Keep one authoritative design document; do not maintain two competing copies.

## 1. Product intent and design principles

The interface should help a person understand three things immediately:

1. Who is requesting a check?
2. What answer will be shared if they approve?
3. What happened after their decision?

The demonstration uses fake identities. The backend evaluates fake attributes; the EventPass result response exposes the requested boolean claim and safe request metadata. This is a selective-disclosure simulation, not cryptographic selective disclosure.

| Principle | Required implementation |
| --- | --- |
| Clear consent | Show the requester, requested check, and disclosure details before the decision buttons. |
| Visible privacy | Keep “What will be shared” and “What will NOT be shared” visible together. |
| Honest simulation | Display a small “Demo · simulated identities” notice on every core screen. |
| Calm hierarchy | Use a light canvas, white cards, navy actions, and short, direct copy. |
| Predictable interaction | One primary action per screen; stable layouts during loading and submission. |
| Respectful outcomes | Distinguish a failed requirement, a user rejection, and a technical error. |
| Small implementation | Reuse the existing stack and shared primitives; prioritize the three required demo paths. |

**Design keywords:** civic minimalism, modern digital services, privacy-first UX, consent interface, light theme, navy and slate, restrained cards, readable typography, explicit status.

Use original text wordmarks and Lucide icons. Do not introduce government seals, official-looking ID cards, biometric graphics, blockchain imagery, certification badges, or claims of production-grade security.

## 2. Foundation and implementation boundaries

- Keep Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, and Lucide.
- For a new shadcn foundation, select `new-york`, `neutral`, and CSS variables. The official configuration documents these options. [shadcn configuration](https://ui.shadcn.com/docs/components-json)
- If the project is already initialized, preserve its installed style, packages, and Tailwind version. Apply the design through its existing theme; do not regenerate components solely to change a style name.
- Use semantic tokens such as `bg-background`, `text-foreground`, and `bg-primary`. Define palette values centrally. This follows shadcn's theme approach. [shadcn theming](https://ui.shadcn.com/docs/theming)
- Ship one light theme for the MVP. No theme switcher or additional UI library.
- All verification logic stays in `server/features/verifications/**`; the visual specification does not move it into frontend components or Next.js Route Handlers.

## 3. Color system

The navy primary color anchors the interface. Green is reserved for a confirmed successful result; it must not imply that an unevaluated request has already passed.

| Semantic token | Value | Purpose |
| --- | --- | --- |
| `background` | `#F8FAFC` | Page canvas |
| `foreground` | `#0F172A` | Main text and headings |
| `card` | `#FFFFFF` | Main content surfaces |
| `card-foreground` | `#0F172A` | Text on cards |
| `primary` | `#1E3A5F` | Main buttons and brand accents |
| `primary-foreground` | `#FFFFFF` | Text on primary buttons |
| `secondary` | `#E2E8F0` | Secondary surfaces |
| `secondary-foreground` | `#1E293B` | Text on secondary surfaces |
| `muted` | `#F1F5F9` | Demo controls, quiet panels, skeletons |
| `muted-foreground` | `#475569` | Supporting text |
| `accent` | `#EFF6FF` | Informational highlights and selected options |
| `accent-foreground` | `#1E40AF` | Informational text |
| `border` | `#E2E8F0` | Decorative card borders and separators |
| `input` | `#64748B` | Interactive control boundaries |
| `ring` | `#2563EB` | Keyboard focus indicator |
| `success` | `#166534` | Successful result text and icons |
| `success-soft` | `#F0FDF4` | Successful result background |
| `warning` | `#92400E` | Unmet requirement text and icons |
| `warning-soft` | `#FFFBEB` | Unmet requirement background |
| `destructive` | `#B91C1C` | API error text and icons |
| `destructive-foreground` | `#FFFFFF` | Text on a solid destructive surface |
| `destructive-soft` | `#FEF2F2` | API error background |

`success`, `success-soft`, `warning`, `warning-soft`, and `destructive-soft` are project extensions. The Integration Owner registers them once. They are not assumed to be built-in shadcn variants.

The pale `border` token is decorative. Use `input` for an outline that is necessary to identify a control. Do not use pale borders as the only indication of selection or focus.

### Theme values

For a foundation using full CSS color values, merge these variables into its existing theme. Keep its imports and standard Tailwind token mappings. If an existing older theme wraps variables in `hsl(...)`, translate the colors to that convention instead of inserting hex values inside that wrapper.

```css
:root {
  color-scheme: light;
  --background: #F8FAFC;
  --foreground: #0F172A;
  --card: #FFFFFF;
  --card-foreground: #0F172A;
  --popover: #FFFFFF;
  --popover-foreground: #0F172A;
  --primary: #1E3A5F;
  --primary-foreground: #FFFFFF;
  --secondary: #E2E8F0;
  --secondary-foreground: #1E293B;
  --muted: #F1F5F9;
  --muted-foreground: #475569;
  --accent: #EFF6FF;
  --accent-foreground: #1E40AF;
  --border: #E2E8F0;
  --input: #64748B;
  --ring: #2563EB;
  --success: #166534;
  --success-soft: #F0FDF4;
  --warning: #92400E;
  --warning-soft: #FFFBEB;
  --destructive: #B91C1C;
  --destructive-foreground: #FFFFFF;
  --destructive-soft: #FEF2F2;
  --radius: 0.75rem;
}
```

For Tailwind v4, merge the following into the existing `@theme inline` block. For Tailwind v3, register equivalent semantic colors and radii in the existing configuration. Do not upgrade Tailwind for this design.

```css
@theme inline {
  --color-success: var(--success);
  --color-success-soft: var(--success-soft);
  --color-warning: var(--warning);
  --color-warning-soft: var(--warning-soft);
  --color-destructive-soft: var(--destructive-soft);
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}
```

Use `bg-success-soft text-success`, `bg-warning-soft text-warning`, and `bg-destructive-soft text-destructive` for status surfaces. Use neutral styling for user rejection. Keep status text opaque; do not fade it with opacity utilities.

## 4. Typography, spacing, and shape

Use the established project font. For a new foundation, use **Inter**, with `ui-sans-serif, system-ui, sans-serif` as fallbacks. Provision the font once through the shared layout; a missing font must not prevent the demo from working.

| Role | Size / line height | Weight | Tailwind direction |
| --- | --- | --- | --- |
| Page title | 30 / 36 px; 36 / 40 px from `sm` | 600 | `text-3xl sm:text-4xl font-semibold tracking-tight` |
| Section title | 20 / 28 px | 600 | `text-xl font-semibold` |
| Main body | 16 / 24 px | 400 | `text-base leading-6` |
| Labels and supporting copy | 14 / 20 px | 400–500 | `text-sm leading-5` |
| Nonessential metadata | 12 / 16 px | 400–500 | `text-xs leading-4` |
| Optional demo payload | 14 / 20 px | 400 | `font-mono text-sm` |

Use sentence case. Keep consent explanations at 14 px or larger. Reserve monospace for optional technical details.

| Element | Specification |
| --- | --- |
| Spacing scale | 4, 8, 12, 16, 24, 32, 48, 64 px using standard Tailwind utilities |
| Main card | `rounded-xl border bg-card shadow-sm` |
| Nested information panel | `rounded-lg`; no additional shadow |
| Button and select | `rounded-md`; minimum 48 px height |
| Button label | 16 px, medium weight |
| Badges | Compact, rounded; always contain text |
| Inline icon | Lucide, 20 px; standard consistent stroke |
| Result icon | Lucide, 32 px inside a 64 px status surface |
| Card padding | `p-6 sm:p-8` |
| Related elements | `gap-2` or `gap-3` |
| Content sections | `gap-6` or `space-y-6` |

No decorative gradients, glass effects, oversized shadows, animated backgrounds, or custom animation packages. Basic hover/focus changes are sufficient. Loading can use a static message and skeleton; avoid artificial delays.

## 5. Shared page shell and responsive rules

| Area | Mobile | Tablet and desktop |
| --- | --- | --- |
| Header | `px-4`, content can wrap | `px-6`, inner `max-w-5xl mx-auto` |
| Main wrapper | `px-4 py-6` | `sm:px-6 sm:py-12` |
| Event content | Full available width | `w-full max-w-2xl mx-auto` |
| Wallet content | Full available width | `w-full max-w-xl mx-auto` |
| Result content | Full available width | `w-full max-w-xl mx-auto` |
| Disclosure sections | Stacked, both visible | Remain stacked for predictable reading |
| Wallet actions | Equal-width full-row buttons stacked | Equal-width buttons side by side from `sm` |

Use a quiet header with the current surface name and the demo notice. EventPass and the wallet share typography and spacing, but each has its own label and icon so the transition is clear.

- Event and result: `Ticket` icon + **EventPass**.
- Wallet: `Wallet` icon + **Digital Wallet Simulator**.
- Demo notice: **Demo · simulated identities**.

Use normal document flow. Do not vertically center a tall consent card or pin the actions over its content. On small screens, the user scrolls through disclosure details to reach the decision buttons.

No sidebar, dashboard navigation, marketing hero, account menu, or additional landing page is needed. Long names and error text wrap. Keep DOM order and visual order consistent.

## 6. Screen A — EventPass

**Route:** `/event`

| Order | Content | Component / treatment |
| --- | --- | --- |
| 1 | Page heading: “Verify your age to continue” | One `h1` |
| 2 | “This demo event is for people aged 18 or older.” | Supporting paragraph |
| 3 | Event card: “EventPass · 18+ event” | `Card` + neutral `Badge` |
| 4 | “EventPass only needs a yes/no age-check result.” | Plain privacy explanation |
| 5 | “Your exact age, date of birth, ID number, and address are not included in the verification response.” | Supporting copy |
| 6 | Clearly separated “Demo controls” section | Muted panel |
| 7 | Labeled demo identity selector | Shared `Select` |
| 8 | “Verify with Digital ID” | Full-width primary `Button` |
| 9 | “You’ll review the request in the wallet simulator before sharing a result.” | Helper text |

**Selector label:** “Demo identity”

**Options:** Omar Hassan, Sara Ali, Alex Morgan. Default to Omar for a quick demo. Show names only; do not put exact ages or a full fake profile into frontend fixtures. Internal demo IDs are allowed only to create the simulated request.

Names in this selector are a deliberate demo-control exception. They are not evidence that the result endpoint discloses identity details. Keep the panel visibly separate from the event's verification experience.

**Interaction:** clicking Verify creates a request, disables the selector and button, and changes the button label to “Opening wallet…”. Navigate to `/wallet/[verificationId]` only after the API returns a verification ID. On failure, retain the selected identity and show an inline error with a retry action.

Do not invent an event date, location, price, payment flow, or ticket-purchase confirmation.

## 7. Screen B — Wallet consent

**Route:** `/wallet/[verificationId]`

| Order | Content | Component / treatment |
| --- | --- | --- |
| 1 | Heading: “Review this request” | One `h1` |
| 2 | “Demo identity” and the selected display name from wallet context | Muted identity row |
| 3 | Requester: “EventPass” | Request card heading |
| 4 | “EventPass wants to check whether you are 18 or older.” | Main request copy |
| 5 | “What will be shared” | Visible disclosure section |
| 6 | “What will NOT be shared” | Visible disclosure section |
| 7 | Consent explanation | Supporting paragraph |
| 8 | Reject and Approve | Decision buttons |

**What will be shared**

- Whether you are 18 or older: **Yes or No**.

**What will NOT be shared**

- Full name in the verification response.
- Exact age or date of birth.
- ID number.
- Address.
- Student or residency information for this age check.

**Consent explanation:** “Approving shares the age-check result with EventPass, including a ‘No’ result if the requirement is not met. Rejecting does not share an age-check result.”

The backend context currently supplies disclosure copy. The Integration Owner should align that copy with this wording, especially “18 or older”; feature developers should not maintain contradictory hard-coded claims.

**Button order:** Reject first, Approve second in both DOM and visual order. Stack on mobile; place side by side from `sm` with a 12 px gap.

- **Reject:** shared outline Button, `border-input`, normal foreground text. Rejection is a valid choice, so do not style it as a dangerous destructive operation.
- **Approve:** shared primary Button.
- Give both buttons equal dimensions and readable labels.
- Neither action is preselected, automatic, or triggered by a countdown.
- Do not show a green check beside the requested claim before evaluation.

During submission, disable both buttons. Use “Approving…” or “Rejecting…” on the chosen button and announce the operation. An API error keeps the request and disclosure text visible; it must not look like an unmet age requirement.

After a confirmed decision, navigate to `/event/result/[verificationId]`. The wallet can show the fake user's display name; the result screen must obtain its outcome from the result endpoint only.

## 8. Screen C — EventPass result

**Route:** `/event/result/[verificationId]`

Use a shared result composition: status icon, concise heading, explanation, disclosure summary, then recovery or demo action. Center the status header; left-align explanatory details.

| API outcome | Tone / Lucide icon | Heading | Explanation | Action |
| --- | --- | --- | --- | --- |
| `verified` | Success / `CircleCheck` | Age verified | “The 18+ requirement is met. Access granted for this demo.” | Try another demo identity |
| `failed` | Warning / `CircleX` | Age requirement not met | “The 18+ requirement is not met. Access was not granted.” | Try another demo identity |
| `rejected` | Neutral / `CircleSlash` | Verification rejected | “You declined to share an age-check result. Access was not granted.” | Start a new verification |
| `pending` | Informational / `Clock3` | Awaiting your decision | “This request has not been approved or rejected.” | Return to wallet |
| Not found | Neutral / `SearchX` | Verification not found | “We couldn’t find this verification request.” | Back to EventPass |
| API error | Destructive / `CircleAlert` | We couldn’t load the result | “Please try again.” | Retry |

**For an evaluated result, show a compact privacy receipt:**

| Receipt field | Successful check | Failed requirement |
| --- | --- | --- |
| EventPass received | “Age 18 or older: Yes” | “Age 18 or older: No” |
| Not included in the verification response | Name, exact age, date of birth, ID number, address, full profile | Same list |

For rejection, replace the evaluated receipt with **“No age-check result shared.”** For pending, show **“No age-check result yet.”** Neither state should display `ageOver18: false` as if the age check had run.

A successful age check does not establish someone's complete identity. Avoid “Identity verified,” “Government verified,” or claims about encryption and cryptographic proofs.

“Try another demo identity” and “Start a new verification” go to `/event`. Starting again creates a fresh request; it does not mutate a completed verification. Do not add a “Continue” button without an implemented destination.

**Optional judge detail:** once all three required paths work, add a native `details` disclosure labeled “Demo details” beneath the receipt. It can show an allowlisted rendering of the actual result response, including `claims.ageOver18`, without fetching wallet context. Keep technical keys and JSON out of the main user-facing explanation.

## 9. Components and state behavior

Initialize only **Button, Card, Badge, Select, Alert, Skeleton, and Separator**. Use a semantic HTML label with the Select's accessible labeling mechanism. Add no dialog, modal, or toast dependency for the core flow.

| Composition | Responsibility | Ownership |
| --- | --- | --- |
| Shared primitives and theme | Consistent controls, sizing, colors, focus | Developer A / Integration Owner |
| Demo identity selector | Demo choices and selected ID | Developer B |
| Event verification card | Event requirement and create action | Developer B |
| Verification result | Server-confirmed outcome and privacy receipt | Developer B |
| Wallet request card | Context, disclosure lists, consent actions | Developer C |

Keep compositions inside their existing feature folders. Extract additional shared wrappers only when they are actually reused; do not create an elaborate component framework for three pages.

| State | Required behavior |
| --- | --- |
| Initial loading | Skeleton matching the card's approximate shape plus a short loading message; no fabricated identity or result. |
| Create request in progress | Disable Verify and the selector; retain current values. |
| Decision in progress | Disable both decision buttons immediately; preserve disclosure content. |
| Recoverable read error | Inline Alert and Retry; retain the page heading and navigation. |
| Ambiguous submission failure | Re-read the existing request before allowing a repeated decision; the first decision may already have succeeded. |
| Already decided | Use the API's actual state and show a link to its result; never offer a second consent decision. |
| Business failure | Show the unmet requirement state; do not label it a server error. |
| Missing verification | Dedicated not-found content with a useful return action. |

Use the existing structured error contract. Do not render stack traces or internal database messages. A support reference can appear in a small error detail if useful.

## 10. Accessibility and interaction quality

- Use one `h1` per screen, logical section headings, real lists for disclosures, native buttons, and semantic links for navigation.
- Use explicit Select labeling and helper-text association. Verify keyboard opening, selection, and closing.
- Keep a visible focus indicator: 2 px ring with a 2 px offset on the surrounding surface. Do not remove focus styles.
- Use a project target of at least 48 px for button and select height; maintain sufficient hit area for any other standalone interactive control.
- Normal text must meet 4.5:1 contrast; large text may use the 3:1 threshold. Necessary control boundaries and visual states need 3:1 against adjacent colors. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- Express every outcome through text and an icon as well as color. Decorative icons are hidden from screen readers.
- Announce async status with one polite live region or `role="status"`; reserve `role="alert"` for actionable errors. Avoid duplicate announcements.
- On route changes, move focus appropriately to the new page heading or main content. Do not send keyboard focus directly to Approve.
- Ensure the flow works at 375 px, reflows at 320 CSS px, and remains usable with 200% text zoom. Do not truncate disclosure text or constrain cards to fixed heights.
- Preserve `prefers-reduced-motion` behavior. No motion is required to understand or finish the task.

These are acceptance targets, not a claim that an unimplemented application has passed an accessibility audit.

## 11. Two requirements to align before implementation

### Age threshold wording

The backend rule in the source plan is `age >= 18`. The UI must therefore say **“18 or older”** or **“18+”**, not “older than 18.” Keep existing API identifiers such as `age_over_18` and `ageOver18`; this is a copy clarification, not an API rename.

### Result-state contract

The source plan's result endpoint example shows `verified` and `claims` but does not fully specify pending, failed, and rejected result responses. The UI must distinguish these states without calling the wallet context endpoint or guessing from `verified: false`.

**Proposed minimal alignment for the Integration Owner to confirm in `docs/TEAM_CONTRACTS.md`:** expose the existing verification `status` through the result endpoint, with an optional safe `reasonCode`.

| State | `verified` | `claims` | Optional `reasonCode` |
| --- | --- | --- | --- |
| `pending` | `false` | `{}` | Omitted |
| `verified` | `true` | `{ "ageOver18": true }` | Omitted |
| `failed` | `false` | `{ "ageOver18": false }` | `CLAIM_NOT_SATISFIED` |
| `rejected` | `false` | `{}` | `USER_REJECTED` |

`verificationId` and `status` accompany each response. This proposed addition contains no raw identity attributes. The exact shared contract remains the Integration Owner's decision; feature developers must not silently add fields or infer statuses from query strings, local storage, or the selected demo identity.

If the agreed result API already represents these states differently, map its documented representation to the designs above. If it cannot distinguish them, resolve the contract gap before marking the required three-path demo complete. A generic “Verification not completed” is a temporary fallback, not a completed rejection/failure implementation.

## 12. Scope, ownership, and completion checklist

The Integration Owner controls `src/app/layout.tsx`, `src/app/globals.css`, `src/components/ui/**`, `components.json`, and `docs/DESIGN_SYSTEM.md`, along with shared dependencies and contracts. Developers B and C build within their assigned feature folders and use the shared system. Existing team ownership rules remain in force.

Build in this order: theme and necessary primitives; EventPass; wallet consent; result states; then integration and responsive polish. History, additional claims, expiry, and judge payload details stay optional until the three mandatory paths work. There is no expiry screen in the MVP because expiry is absent from the frozen status model.

- [ ] Omar → Approve → Age verified.
- [ ] Sara → Approve → Age requirement not met.
- [ ] Omar → Reject → Verification rejected, with no evaluated age claim shown.
- [ ] The wallet explains that approval may share either Yes or No.
- [ ] The UI uses “18 or older” consistently.
- [ ] EventPass results consume only the relying-party result endpoint.
- [ ] Result responses and receipts contain no raw identity attributes.
- [ ] Loading, read errors, not-found requests, pending requests, and duplicate decisions have deliberate behavior.
- [ ] Controls prevent duplicate submissions and support keyboard use.
- [ ] Core screens work at 375 px and desktop; narrow-width reflow and zoom do not hide content.
- [ ] Success, unmet requirement, rejection, and API error are distinguishable without color.
- [ ] Every visible action has an implemented effect or destination.
- [ ] The demo notice is visible and no real-wallet, official-identity, or cryptographic capability is implied.

**Source:** `digital-identity-verification-hackathon-plan(1).md`, supplied by the user. The visual choices in this document are recommendations tailored to that plan.
