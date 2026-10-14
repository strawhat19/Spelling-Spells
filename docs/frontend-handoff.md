# Frontend Handoff

## Scope delivered in source

This is a frontend-preparation milestone, not a connected-service launch. The existing Expo Router / React Native / TypeScript / Sass architecture, Midnight Archive design, v10 logo, bundled catalog and local preference format remain in place.

- `/signin` and `/signup`: themed Google/email account forms. Credential fields and account actions are disabled while the adapter is disconnected. No password or session store has been added.
- `/profile` and `/profile/connections`: account shell, profile/settings layout, and accurate provider availability. No secrets can be entered or saved through the preview.
- `/dashboard` and `/analytics`: Owner workspace and report layouts with explicit unavailable metrics. Public setup previews contain no private records or simulated traffic.
- `/saved`: device-local shelf with filters, sorting, storage-state labels, individual bookmarks and confirmed clear-all. The existing preference v1 record and saved spell IDs are preserved.
- `/spell/<slug>`: stable canonical spell paths and static route parameters for the nine bundled records. Legacy `/spell?id=...` links remain readable. Titles/descriptions come from actual records; no unconfirmed custom origin is invented.
- `/submit`: source-linked new-spell/correction draft composer, validation, preview, deliberate device-only save and clear. Unsaved drafts survive internal navigation in memory; they are not submitted. Storage failures remain visible and preserve original malformed disk data.
- `/submissions` and `/review`: private history/Owner-review boundaries and a clearly labeled non-operational workflow preview. No populated fake queue or pretend approval actions.

## Module boundaries

The `src/shared/authentication` adapter is intentionally disconnected and never emits an authenticated account. `AuthProvider` is the sole account boundary. Capability helpers are UI readiness only; they are not a replacement for server authorization. Owner access requires an active account with a trusted verified Owner role. No first-signup or client email bootstrap exists.

`src/shared/submissions` defines draft, record, status and service contracts. Its online operations always return unavailable. The device draft is separate from server records and has no author/role grant. A future server must derive the actor from the verified session, allocate stable record identity atomically, validate/limit input, enforce review capability, and make repeated intake retry-safe before these methods become operational.

The draft storage key is `spelling-spells:submission-draft:v1`. It is device-wide, not a private signed-in account record; the UI warns against entering personal information or credentials. Clearing browser/app storage removes it. An in-memory revision guard prevents an older save completion from replacing more recent draft edits.

Navigation UI preferences use `spelling-spells:account-navigation:v1:<scope>` and remain device settings, not authorization. Existing bookmark and theme keys are unchanged. AppShell header measurements use a distinct `--header-offset` token to keep account positioning separate from the header's base size.

The production service worker now caches only explicit public pages and assets and rotates the prior cache. Account, draft, API and reporting requests bypass it. Production verification must still confirm cache behavior on the actual host.

## Deferred connection checklist

1. Obtain the user's explicit resume for Firebase/account setup and required validation. Select the project/billing resources through the authorized setup flow, respecting the operating budget.
2. Enable the actual Google and email providers, confirm allowed origins and platform flows, configure a trusted Owner UID bootstrap, and implement server-owned roles and restrictive rules. Never use the frontend role as authority.
3. Implement private profile, account-scoped saves, submissions and review adapters with bounded queries. Preserve local bookmarks and draft data; never upload automatically without a deliberate user action.
4. Add analytics collection only after provider setup and disclosures. Provider traffic reports require an authenticated server-only boundary; a mounted tracker is not internal report access. No analytics SDK, report token, traffic ingestion or paid analytics add-on is installed by this milestone.
5. Set the verified public origin in `expo.extra.siteUrl` only when hosting is confirmed. Until then web sharing uses its actual browser origin and native sharing sends a spell note.
6. The production Expo export is now authorized and has passed. Obtain separate permission for TypeScript, platform and browser acceptance checks. After repository publication access is resolved, deploy to the selected Vercel project and verify exact commit, routes, offline behavior, metadata, account gates and device saves. The domain, Stripe and AdSense remain separate later milestones.

## Validation and publication status

Source has been independently reviewed. On 2026-10-14, the user authorized repository publication and Vercel deployment on a `.vercel.app` address. The necessary production command `npm run export:web` passed, producing 39 static routes and the `dist/` output. Dependencies were installed from the existing lockfile with `npm ci --ignore-scripts --no-audit --no-fund`; the local environment ran Node 24.19.0, within the package engine range (the repository's preferred Node pin remains 24.21.0). Npm's cache was relocated to a writable temporary directory after the first install attempt could not write its default home cache.

Tests, lint, standalone type checks, dev servers, browser interaction checks and native UI/runtime checks have not been run. Production static rendering passed; no connected-service or browser interaction pass is implied.

`vercel.json` specifies the existing `npm run export:web` build, `npm ci` installation, `dist` output and clean URLs. Read-only Vercel discovery confirms the intended `piratechs` team; no existing project matching “spell” was found. No Vercel project was created because the requested sequence is repository publication first, then deployment.

Changes are local commits on `codex/frontend-launch`. Native push lacked an authenticated credential; the GitHub connection rejected branch/tree writes with `403 Resource not accessible by integration`. No remote branch, pull request, deployment or external-service configuration has been created. Resolve repository Contents write permission before publication; do not bypass that denial through another route.
