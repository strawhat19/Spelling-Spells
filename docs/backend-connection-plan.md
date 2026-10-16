> Superseded for the active backend integration by [Supabase setup](supabase-setup.md) and [the 2026-10-16 source handoff](supabase-integration-handoff.md). Firebase-specific setup and validation below describe the earlier disconnected checkpoint; do not deploy them for the Supabase rollout.

# Connected Account Rollout

Status on 2026-10-15: the user requested publishing the latest safe frontend, then pausing this project. The first account stage is implemented but deliberately disconnected. `accountConnectionReleased = false` in `src/shared/firebase/config.ts` prevents Firebase initialization even when environment values are present. Releasing accounts requires a reviewed source change, not merely environment configuration. No Firestore rules or production environment configuration has been deployed by this rollout.

The unbilled `spelling-spells-prod` Firebase project, web app and Standard Firestore database in `us-east4` were created after approval. Its user store was verified empty, then Google and email/password sign-in were disabled with approval. Anonymous and phone sign-in are also off. The approved replacement `spelling-spells-app` could not be created because Google returned a terminal project-quota error; do not retry until capacity is established or repurpose an existing project without explicit selection. No Owner role, billing link, analytics token or provider-report connection exists.

## Minimum infrastructure

- Preserve Expo Router, React Native, TypeScript, Sass, the Midnight Archive theme, the v10 logo and public browsing. Do not add a store, payment processing, ads, chat or a generic admin framework.
- Use one dedicated Firebase project on Spark, one registered web app and one Standard Firestore database. Database location is a durable choice; the initial approved database uses `us-east4`. No Identity Platform upgrade, Functions, Storage, BigQuery, backups, TTL or paid extensions are needed for the initial account scope.
- Use Firebase Authentication for Google and email/password, including email verification and password reset. Firebase owns passwords and session tokens. Platform-specific adapters must not import web popup behavior into native screens.
- Use one shared SDK initialization boundary and the existing auth context. Hydration is not complete until both the Firebase identity and its authoritative private app account are available.
- Prefer the existing Vercel project for small private `/api` handlers. Verify Firebase ID token signatures and claims using the documented Google signing certificates, then access Firestore REST with the caller's ID token where needed. This preserves Security Rules enforcement without a downloaded Admin service-account key. Wrapper validation is defense in depth, never a replacement for restrictive rules.
- Do not put project credentials into the portable `ai/` pack. Public Firebase identifiers can use Expo's public environment names; any later reporting token belongs only in server-side production configuration.

## Data and authorization map

| Record | Boundary |
| --- | --- |
| `users/{appUserId}` | Private app-owned `User_Number_Account_Date_UUID` identity, matching number, immutable `firebase_uid`, provider-bound email and verification state, display name, avatar, role, active status and timestamps. New accounts are Subscribers. Self edits cannot change identity, role or active status. |
| `authMappings/{firebaseUid}` | Infrastructure lookup from Firebase UID to the app-owned account. Own exact-document read only; no public list and no remapping or client promotion. |
| `counters/users` | Infrastructure allocation key. Account, mapping and exactly-next counter advancement commit together, with before/after validation in both directions. No private profile fields in counter metadata. |
| `users/{appUserId}/savedSpells/{spellId}` | Private account-owned reference documents containing only `spellId` and `savedAt`. Existing catalog IDs are references, not newly allocated content identities. The bounded subscription is separate from guest/device preferences; explicit import merges missing references only. |
| Private submissions, later stage | Stable app-owned numbered identity, immutable author/intake, status, timestamps and bounded review data. Verified signed-in creation and Owner-only review. Retry attempts deduplicate against the originating account and payload. Not implemented or permitted by the current rules. |
| Published spells, later stage | Separate public-safe projection created only by an authorized approval transaction. No private submission notes, author email or account fields. Preserve the seeded catalog and existing slugs. Not implemented or permitted by the current rules. |

Only the active authoritative Owner receives moderation and reporting access. Browser capabilities are presentation helpers, not authorization. Private responses use `Cache-Control: private, no-store`; the public-only service worker must continue excluding account/API responses.

Owner bootstrap is a separate trusted setup operation after the intended person signs in and their actual Firebase UID is verified. An email match, first sign-up, client field, `roleVerified` flag or stale custom claim cannot grant Owner. No general role-management UI is required for this initial rollout.

JWT signature verification alone does not prove immediate token revocation. Privileged requests must resolve current account status/role; any stronger session-revocation requirement needs an explicit authoritative cutoff or supported revocation check.

## Staged implementation

1. Implement SDK/configuration, private account hydration, Google/email sign-in, email verification/reset, profile edits and account-scoped saved spells. Keep configuration-missing, access-denied, loading and network-error states distinct. Do not silently turn failures into guest success.
2. Offer explicit import of device bookmarks into the signed-in collection. Retain guest bookmarks on sign-out and clear old private rows, subscriptions, pending operations and account UI before a different account hydrates.
3. Connect private submission creation/history, bounded Owner review, safe approved publication and stable public URLs. A successful private save is not a claim of publication. Dynamic public entries require a real route fallback rather than relying only on the nine existing static exports.
4. Add only actual Owner business summaries and separately authorized Vercel traffic reports. Retain explicit unavailable runtime metrics when the provider entitlement is absent.

## Approval and release gates

- Project creation itself provisions automatic Firebase API keys/service identities. Obtain the concrete setup approval before creating the project, web app, providers, database or associated security configuration.
- Confirm the exact authorized domains, Google support email, chosen database region, restrictive rules/indexes and production environment binding. Do not authorize unrelated preview domains or other Firebase projects automatically.
- The user approved initial unbilled setup, with a separate billing account when an existing account already has five projects. The latest read-only inventory found one open account with five linked billing-enabled projects, a newly created open account with zero linked projects, and one closed account. Do not attach a sixth project, create financial commitments or enable paid usage without resolving the requested separate-account setup.
- Obtain permission for scoped emulator/security tests, production build and cloud-browser backend validation. Source review alone is not proof that auth, rules or persistence work.
- Test unauthenticated access, account isolation, self-promotion attempts, inactive roles, atomic allocation, duplicate submissions, stale async results, sign-out and actual server-confirmed saves before publishing a connected stage.
- The latest frontend may be published with the source-controlled release hold in place. Do not release connected account behavior until configuration, restrictive rules, source review and the permitted checks agree. A partial credential/configuration setup is not a release milestone.

## First-stage source and validation checkpoint

- Source includes Google/email authentication, verification/reset controls, authoritative private account hydration, immutable Subscriber defaults, profile editing and private saved spells. Native email authentication is supported with memory-only sessions; native Google sign-in remains explicitly unsupported rather than pretending a web popup is available.
- Web Auth persistence is session-scoped with a memory fallback. Firestore uses memory-only private cache. Private account state and pending operations are cleared or invalidated on identity changes; late credential requests cannot restore a signed-out session. A newer credential request waits for an already-sent older SDK credential request to settle safely, but local sign-out does not wait for Firestore hydration.
- Guest bookmarks remain separate. Import is explicit, and sign-out restores device bookmarks rather than leaking the previous account's collection. Save/clear/import feedback distinguishes pending, server-confirmed, cached and failed state.
- Restrictive rules and indexes are present in source only. They enforce coupled account/counter/mapping allocation, own private profile and saved-reference access, immutable role/status/identity fields, and default denial for other collections. Existing nine seed spell IDs are the allowed references; extending the catalog requires an intentional rules change.
- Approved combined checks passed 23/23: 14 Firestore emulator allow/deny cases, two emulator configuration cases, two reused-app boundary cases, three actual-service lifecycle regressions and two release-hold regressions. The hold tests exercise populated production/demo configuration and every public auth action while requiring zero SDK calls. TypeScript passed. The final production export passed 39 routes with deliberately populated fake Firebase configuration and an emulator flag; the source hold still prevents initialization. This is not browser behavior evidence.
- Connected-account emulator browser testing could not be completed because the execution environment isolated localhost processes and its terminal transport failed. No production test accounts were created. Emulator mode requires a development build, the exact demo project ID and an explicit flag; it cannot activate for production or a real project.
- Remaining connected-release gates: resolve the intended Firebase project and project quota, obtain working Vercel environment-variable access (the metadata-list action currently returns 403), configure the authorized domain and public Vercel values, deploy and verify rules/indexes, complete account browser validation, then remove the source-controlled release hold in a reviewed build. Owner assignment, moderation/publication and provider analytics are separate later stages. The user requested pausing after the disconnected frontend deployment; do not resume these steps without new instructions.

## Cost and analytics boundaries

Spark currently includes Standard Firestore allowances of 1 GiB stored data, 50,000 reads/day, 20,000 writes/day and 20,000 deletes/day. These are provider allowances, not a scaling guarantee. Bounded listeners, cleanup and memory-only private Firestore cache reduce unnecessary reads and shared-device exposure.

Vercel now exposes a public Web Analytics read API. Collection and report access remain separate: collection must be deliberately enabled, while a private Owner-only reporting handler requires authorized server-side Vercel access. Pro analytics event usage is listed at $0.03 per 1,000 events. Do not assume a read-only/project-only token scope exists without checking the actual creation flow. No analytics token, collection or paid add-on is enabled by this plan.

The operating target remains $50/month. Billing alerts are notifications, not hard spending caps. Any later Blaze upgrade must explain the pay-as-you-go exposure and agreed budget controls rather than promise a cap that the provider does not enforce.

## Primary references

- [Firebase API key provisioning](https://firebase.google.com/docs/projects/api-keys)
- [Firebase service identities](https://firebase.google.com/support/guides/service-accounts)
- [Firestore REST authentication and Security Rules](https://firebase.google.com/docs/firestore/use-rest-api)
- [Firebase ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Firebase pricing](https://firebase.google.com/pricing)
- [Firestore quotas](https://firebase.google.com/docs/firestore/quotas)
- [Vercel Web Analytics API](https://vercel.com/docs/analytics/web-analytics-api)
- [Vercel Web Analytics limits and pricing](https://vercel.com/docs/analytics/limits-and-pricing)
