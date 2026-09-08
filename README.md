# EventPass — Digital Identity Verification Simulator

A working demo of requesting a yes/no claim instead of a complete identity. Uses exactly three fictional identities. It demonstrates selective disclosure at the API boundary, not cryptographic selective disclosure.

## Run locally

Requires Node.js 20.19+ (Node 22 recommended).

```sh
npm install
npm run dev
```

Open http://localhost:3000/event. Next.js serves the UI and proxies `/api` to Express on port 3001. Without Supabase variables, local development uses ephemeral in-memory storage. Restarting the API clears requests.

Try Omar → Approve (passes), Sara → Approve (fails), and Omar → Reject (no claim shared). Alex also passes the age check. Student and residency checks are supported by the API.

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm start
```

## Supabase and Netlify

1. Run `supabase/schema.sql` in your Supabase SQL editor.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the server environment. Never use a `NEXT_PUBLIC_` prefix for these values. For local use, export the variables in your shell before starting the app.
3. Import the repository into Netlify. `netlify.toml` configures the Next.js build and Express function redirect. Netlify's Next.js adapter handles the frontend.
4. Set the two Supabase variables in Netlify for functions. Memory storage is deliberately disallowed there.
5. Deploy and repeat the three demo paths.

Live Supabase setup and deployment require your own service configuration. No credentials are included.

## Structure

- `src/app`: Next.js App Router pages and theme.
- `src/features`: EventPass, wallet consent, privacy receipt.
- `src/components/ui`: small shadcn-style primitives with Radix Slot buttons and native accessible controls.
- `src/shared/contracts.ts`: public TypeScript contract.
- `server/features/verifications`: fake data, claim evaluation, API tests.
- `server/lib/store.ts`: memory and Supabase persistence.
- `netlify/functions/api.ts`: serverless Express adapter.
- `docs/TEAM_CONTRACTS.md`: API shapes and error behavior.
- `docs/DESIGN_SYSTEM.md`: supplied authoritative design.

This is an unauthenticated hackathon simulator, not real identity infrastructure. Optional expiry, history, and account features are intentionally outside the core demo.

## Presentation flow

The entry screen is a fictional sign-in experience: it collects no passwords, SMS codes, ID numbers, or real personal data. Select **Sign in with Digital Identity**, choose one of the three demo identities, review the sharing boundary, then continue to explicit **Approve** / **Reject** consent. **Use Omar demo** opens Omar's review screen; it never approves automatically.

The four-step indicator marks the current stage. Results distinguish success, an unmet requirement, rejection, pending decisions, and service unavailability. Each includes a privacy receipt and **Start another verification**. Pending requests can return to the wallet or refresh. An unavailable service produces an unknown disclosure outcome until retry confirms the server result; it does not imply rejection. Following an ambiguous decision error, the wallet re-reads the request before allowing another submission.

For explicit local memory mode, export `VERIFICATION_STORE=memory` and leave both Supabase variables unset. With both Supabase variables configured, requests persist in Supabase. The existing three fake identities remain server-defined; no demo users table is required. The service-role key is used only by the Express store, never the browser.
