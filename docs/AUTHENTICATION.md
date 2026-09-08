# Membership authentication: local setup and architecture

MemberSpace is an independent relying-party application in `apps/member-portal/`. It has its own Express process, routes, environment, and server-side sessions. The identity service owns registration, password validation, consent, and membership data. Both use the existing React Card/Button primitives, Lucide icons, and CSS; sharing presentation code does not share authentication state or database access.

This is a working development authentication system. Use test accounts. It implements a deliberately limited OAuth-style confidential-client authorization-code flow with S256 PKCE, not a complete OpenID Connect provider: there are no ID tokens, discovery, refresh tokens, email verification, password recovery, MFA, or dynamic client registration. The portal knows only a membership boolean, not a stable identity identifier.

## 1. Required software

- Node.js **22.13 or newer**; Node 24 recommended. `node:sqlite` is included; its experimental warning on some Node versions is expected.
- npm (included with Node), and a terminal. Windows PowerShell works.
- No separate database installation is required for local SQLite mode.
- For Supabase mode, an existing project and SQL-editor administrative access.

From the repository root (the folder containing the main `package.json`):

```sh
node --version
npm install
npm run auth:setup
```

`auth:setup` creates `server/auth/.env` and `apps/member-portal/.env` with the same randomly generated client secret. It never prints the secret and refuses to overwrite either existing file. These files and `.data/` are ignored by Git. The examples contain no working secrets. Avoid printing or sharing the generated environment files.

If configuring manually, copy each `.env.example` to `.env` and populate the same randomly generated secret in both files. Do not use the client ID as a secret. Shell environment variables override values in `--env-file`; remove stale shell values if configurations disagree.

## 2. Database configuration and migrations

### SQLite (default local setup)

The provider's `.env` contains:

```dotenv
AUTH_STORE=sqlite
AUTH_DB_PATH=.data/auth.sqlite
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

The provider creates the directory and schema on first startup. Accounts, Argon2id hashes, provider sessions, authorization transactions, hashed authorization codes, and hashed access tokens persist across restarts. SQL uses parameterized statements. The local database contains private account data: keep it out of public directories, source control, and shared backups. SQLite schema creation is idempotent; it does not alter the legacy verification table.

### Supabase

1. Run **`supabase/auth-schema.sql`** in the Supabase SQL editor. This adds `auth_users`, `auth_records`, and an atomic `consume_auth_record` function.
2. Set both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in **`server/auth/.env` only**.
3. Restart the provider. Both values configured select Supabase; partial configuration fails startup. No silent memory fallback is used for real accounts.
4. RLS is enabled. `anon` and `authenticated` have no access to these tables or the consume function. Only the server service role can use them.
5. If also using the legacy simulator with Supabase, run `supabase/schema.sql` too.

SQLite and Supabase are separate databases: switching modes does not copy users. Expired records are always rejected. SQLite prunes expired records during writes. Schedule the documented cleanup SQL in Supabase to remove expired records periodically.

The portal receives **no database credentials**. Its own sessions and pending login state are held in process memory; restarting it safely logs out portal users. Multiple portal instances require a shared session store before deployment.

## 3. Environment reference

| Variable | Provider | Portal | Meaning |
| --- | --- | --- | --- |
| `AUTH_ORIGIN` | Yes | Yes | Provider origin, default `http://localhost:3001` |
| `RP_ORIGIN` | Yes | Yes | Portal origin, default `http://localhost:4000` |
| `AUTH_CLIENT_ID` | Yes | Yes | Registered client, default `memberspace` |
| `AUTH_CLIENT_SECRET` | Yes | Yes | Matching random secret, at least 32 characters |
| `AUTH_STORE` | Yes | No | Explicit `sqlite` for local persistent storage |
| `AUTH_DB_PATH` | Yes | No | SQLite file path relative to repository root |
| `SUPABASE_URL` | Optional | **No** | Server-only Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | **No** | Server-only administrative credential |

Origins must have no trailing slash, path, credentials, or query. Only HTTPS is accepted except HTTP on `localhost` or `127.0.0.1`. Exactly one client and one callback (`RP_ORIGIN` + `/callback`) are allowlisted. Wildcards and user-controlled redirect destinations are not supported. Changing a port requires matching origin updates in **both** environment files and restarting both applications.

## 4. Start the applications in separate terminals

First stop the earlier `npm run dev` with Ctrl+C: it already uses port 3001.

**Terminal 1 — identity service:**

```sh
cd "path/to/Turbo-main 2"
npm run auth:dev
```

**Terminal 2 — independent MemberSpace portal:**

```sh
cd "path/to/Turbo-main 2"
npm run portal:dev
```

Alternatively, run `npm run dev` from `apps/member-portal`. It launches only the external app using the root-installed dependencies.

The same commands work in PowerShell:

```powershell
Set-Location 'C:\path\to\Turbo-main 2'
npm run auth:dev
# In a SECOND PowerShell terminal:
Set-Location 'C:\path\to\Turbo-main 2'
npm run portal:dev
```

| URL | Application |
| --- | --- |
| `http://localhost:4000/` | External login page — start here |
| `http://localhost:4000/protected` | Protected membership resources |
| `http://localhost:4000/callback` | Registered callback; do not visit manually |
| `http://localhost:3001/auth` | Identity service overview |
| `http://localhost:3001/auth/login` | Login within a pending authorization flow |
| `http://localhost:3001/auth/register` | Registration within a pending authorization flow |
| `http://localhost:3001/auth/logout` | Provider logout confirmation |

Servers bind to `127.0.0.1` for local development. They are different processes and do not require the Next.js development server. Use one hostname consistently; do not alternate `localhost` and `127.0.0.1`.

**Optional Terminal 3 — original Next.js simulator:**

```sh
npm run demo:dev
```

Open `http://localhost:3000/event`. Its three fake identities and age/student/residency API behavior remain unchanged. The new provider process also mounts `/api/verifications` for compatibility. Its legacy store uses the existing explicit memory default locally or Supabase when configured. The membership flow uses none of these fake identities or verification endpoints.

## 5. Register and assign membership

1. Visit `http://localhost:4000/` and select **Log in with Identity service**.
2. The browser moves to port 3001. Select **Create an account**.
3. Register `member@example.test` with a unique test password of 12–128 characters.
4. Select **Log in** and enter the same credentials. Registration does not grant membership or silently log you in.
5. Read the consent screen. It shares only **Active membership: Yes or No**. Choose **Approve**.
6. The browser returns through `/callback` to `/protected`. A new user sees **Active membership required** (HTTP 403), demonstrating successful login without permission.
7. In another terminal at the repository root, activate the account:

```sh
npm run membership -- member@example.test active
```

8. Refresh the member page. It now grants access and explains why.
9. Revoke membership and refresh again:

```sh
npm run membership -- member@example.test inactive
```

The same commands work in PowerShell. This is an administrative CLI that uses the provider database configuration; it is never exposed as a public HTTP route. It fails if the email is not registered. For Supabase, an administrator may alternatively update `auth_users.active_membership` in the SQL editor. Never put passwords in SQL or command arguments.

## 6. Flow and security decisions

1. The portal creates a random browser-bound state and PKCE verifier, stores them server-side for ten minutes, and redirects to the provider with the S256 challenge.
2. The provider validates client ID, exact redirect URI, scope, response type, and S256 before showing any credentials form. Invalid requests stay at the provider and never redirect.
3. Registration stores only email and an Argon2id password hash (19 MiB memory, two iterations, one lane) plus inactive membership. Login verifies hashes. Unknown users perform dummy-hash verification and receive the same message as an incorrect password. Registration gives an enumeration-resistant response and never overwrites an account.
4. Login rotates the provider session. A user must explicitly approve or reject sharing. CSRF tokens are tied to server-held transactions/sessions; cross-origin POSTs are denied.
5. Approval produces a random, **60-second**, single-use code bound to client, callback, challenge, and provider session. Only the code, state, and issuer appear in the callback URL. Codes are stored as SHA-256 digests and consumed atomically before exchange checks. Passwords, emails, membership results, and access tokens never appear in URLs.
6. The portal checks state and issuer, consumes its login transaction, and exchanges the code with its server-held client secret and verifier. It does not authenticate passwords.
7. The provider issues an opaque five-minute access token. The portal keeps it server-side and sets a new random session cookie. Token introspection returns only validity metadata and the `active_membership` claim. Protected access requires both to be true; database or network errors fail closed.
8. The provider session lasts 30 minutes. Tokens stop working after provider logout or session expiry. Portal sessions last at most five minutes and are not silently refreshed.
9. Portal logout removes its session immediately and revokes the token. Provider logout is a separate, explicit CSRF-protected action and invalidates tokens tied to that session. If revocation cannot reach the provider, the UI explains that the orphaned token expires within five minutes; the portal is already logged out.

Cookies are `HttpOnly`, `SameSite=Lax`, without a Domain attribute; HTTPS additionally enables `Secure` and `__Host-` names. Local HTTP is solely for loopback development. Ports do not isolate cookies on one hostname; separate cookie names prevent collisions here, but a deployed portal and provider should use separate trusted hostnames with HTTPS. Do not host untrusted applications on the same cookie domain.

There is no browser cross-origin API fetch: redirects navigate across origins, forms post to their own origin, and exchange/introspection are backend calls. Therefore **no Access-Control-Allow-Origin header is emitted**. Do not add wildcard credentialed CORS. CSP allows only local styles/scripts and the single registered callback for form redirects. No analytics or third-party resources load on callback pages. Referrer policy is `no-referrer`; sensitive responses use `no-store`.

Rate limiting bounds authentication traffic and credential attempts. It is per-process/per-IP for this development deployment. Before internet deployment, add distributed and account-aware abuse prevention, email verification, recovery, MFA as needed, operational monitoring, a shared portal session store, secret rotation, TLS/proxy configuration, and an independent security review. Opaque bearer tokens must remain server-side and are replayable if stolen until expiry/revocation; PKCE and atomic codes prevent authorization-code replay, not theft of an already-issued bearer token.

References: [OAuth Security BCP (RFC 9700)](https://www.rfc-editor.org/rfc/rfc9700.html), [PKCE (RFC 7636)](https://www.rfc-editor.org/rfc/rfc7636.html), [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

## 7. Validation

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

Integration tests use isolated SQLite databases and exercise the provider and portal through HTTP requests. They cover registration, hash storage, duplicate accounts, bad credentials/unknown users, CSRF, callback/client validation, S256 enforcement, concurrent code redemption, expiry, provider logout, portal logout, consent rejection, minimal claims, protected access, and immediate membership revocation. Existing verification tests remain included. Live Supabase requires separately running these flows against a configured project.

## 8. Troubleshooting

- **Environment file missing:** run `npm run auth:setup` once from the repository root. If one file exists, copy the missing example manually and set the matching secret. Do not delete working secrets just to rerun setup.
- **Client secret/configuration error:** both files must agree on client ID, secret, origins, and callback. Restart both servers after edits. Never paste secrets into issue reports.
- **Database unavailable:** check the SQLite directory is writable or both Supabase credentials are present. In Supabase, run the authentication migration including the consume function and grants. Do not disable RLS to fix configuration errors.
- **SQLite module unavailable:** update Node to at least 22.13. An experimental-module warning alone is not a failure.
- **Argon2 binary installation fails:** rerun `npm install` on a supported Node/platform combination. If npm requires approval for package lifecycle scripts, review and allow the official `argon2` build script. A source build on Windows may require Visual Studio C++ Build Tools and Python.
- **403/CORS:** use the browser redirect flow, not browser JavaScript that posts credentials to another origin. Ensure `AUTH_ORIGIN` matches the actual form origin. Do not enable `*` CORS.
- **Cookies missing / state mismatch:** use the same hostname throughout; enable first-party cookies; do not manually open `/callback`. Starting a second login replaces the first pending flow in that browser. Start a fresh login after a portal restart.
- **Authorization expired:** codes expire after 60 seconds and transactions after ten minutes. Restart from MemberSpace; copying an old callback URL cannot replay it.
- **Inactive membership:** login and authorization are different. Activate the registered account with the administrative membership command, then refresh. Ensure the command and provider use the same database.
- **Service unavailable on protected page:** leave the provider running, confirm origins/secret match, then retry. Access is deliberately denied when membership cannot be confirmed.
- **Port conflict (`EADDRINUSE`):** stop the old `npm run dev` and any previous provider instance with Ctrl+C. macOS/Linux: `lsof -nP -iTCP:3001 -sTCP:LISTEN`. PowerShell: `Get-NetTCPConnection -LocalPort 3001 -State Listen`. Stop only the process you recognize, or change ports in both `.env` files.
- **HTTPS deployment:** the development launchers bind loopback. Put each behind a correctly configured TLS reverse proxy and use separate HTTPS origins; configure rate-limit proxy trust for the exact proxy topology before exposure. No production hosting change is included in this implementation.

### Real-browser tests

```sh
npx playwright install chromium
npm run test:e2e
```

The browser suite starts two dedicated processes on ports **3101** and **4100**, uses only `.data/e2e.sqlite`, generates test-only accounts, and checks the redirect flow and horizontal layout at 320px, 375px, and 1280px. It never reads either application's real `.env` file. Screenshots go to ignored `test-results/` folders. Test database rows are disposable and remain separate from `.data/auth.sqlite`.

If the bundled browser does not support your OS but Google Chrome is installed:

```sh
# macOS/Linux
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e
```

```powershell
# PowerShell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_CHANNEL
```

Tests use an isolated browser profile, not your personal Chrome profile.

## Changed file map

| Files | Purpose |
| --- | --- |
| `server/auth/app.tsx` | Provider registration, login, consent, code exchange, introspection, revocation, logout |
| `server/auth/config.ts` | Strict origin and client configuration |
| `server/auth/dev.ts` | Separate provider entrypoint and legacy API mounting |
| `server/auth/store.ts` | Persistent SQLite/Supabase stores with atomic code consumption |
| `server/auth/.env.example` | Server-only provider configuration template |
| `server/auth/auth.test.ts` | Security and provider/portal HTTP integration coverage |
| `apps/member-portal/app.tsx` | Independent relying-party login, callback, sessions, protected access, logout |
| `apps/member-portal/dev.ts`, `apps/member-portal/package.json` | Independent application launcher |
| `apps/member-portal/.env.example` | Portal-only configuration template; no database secrets |
| `shared/auth-ui/page.tsx` | Shared server-rendered React layout and credential forms |
| `shared/auth-ui/security.ts` | Cookie/CSRF helpers, CSP, request-origin checks, CSS and loading behavior |
| `src/components/ui/button.tsx`, `src/components/ui/card.tsx` | Relative utility imports so existing components work outside Next.js too |
| `scripts/setup-auth.ts`, `scripts/membership.ts` | Safe local configuration generation and administrative membership assignment |
| `supabase/auth-schema.sql` | Provider database migration and restricted atomic-consume function |
| `e2e/membership.spec.ts`, `playwright.config.ts` | Separate-process browser testing at three viewport widths |
| `vitest.config.ts` | Keep server tests separate from browser tests |
| `package.json`, `package-lock.json` | Argon2/rate-limit/browser-test dependencies and runnable commands |
| `tsconfig.json` | Type-check both applications, shared code, tools, and tests |
| `.gitignore` | Exclude account databases, secrets, and browser artifacts |
| `README.md`, `docs/AUTHENTICATION.md` | Quick start, full instructions, architecture, limitations, and troubleshooting |
