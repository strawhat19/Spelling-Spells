# Supabase integration handoff

Prepared on `integration/supabase-accounts` from main `064bc626637e2d1e25c95d71e45241bd358befa3` (2026-10-16). This branch replaces the inactive Firebase adapters with Supabase; the generic `ai/` pack is unchanged.

## Scope

- Google web OAuth and email/password account flows, email confirmation, resend, recovery, private editable profiles, and a trusted role/status boundary.
- Account spell bookmarks/favorites with realtime refresh, intentional additive device import and conflict-aware clear. Existing guest keys, history, theme and drafts stay separate.
- Existing Owner-only account pages and bounded account directory. Admin roles do not inherit the application's narrower Owner permissions. Feedback, submissions, provider analytics and native Google remain unavailable.
- No plan upgrade, DNS, Stripe, AdSense or unrelated resource changes.

## Observed cloud state

Read-only connected tools confirmed project `qtfajiuilwdtywkklbjq`, Piratechs organization `frqaxsbukfkwzsoaokmw`, Free, `us-east-1`, `ACTIVE_HEALTHY`, PostgreSQL 17.11. Initial inspection found no application tables, migrations, Auth users or published Realtime tables. The user later approved the exact reviewed migration; its successful application and postflight are recorded below. An enabled default publishable key exists (ID `fb4cfffa-70fe-4064-ac31-f9824932bde3`). With specific user approval, its existing value and the public project URL were written only to this task clone's ignored `.env.local`, then supplied in chat at the user's request. No secret or service-role credential was accessed or committed.

Vercel project `prj_Rkxn2SjuJtRsjHh4BiYyNs2qEJ0O`, team `team_2hW8Z1s5cxdaS56fE1tnAMI9` (`piratechs`), was serving READY deployment `dpl_5sQwWw1WcmcMngcuKT8j4RkpC7RY` from main `064bc626`, Node 24.x.

The read-only Vercel environment-name lookup (`GET /v10/projects/{idOrName}/env`, explicit project/team, `decrypt=false`) was **denied**, HTTP 403: “You don't have permission to list the project environment variable.” No values were retrieved. After the user requested production deployment and environment verification, one authorized retry of the same metadata lookup was denied again with the same HTTP 403. No CLI, alternate credentials, environment write or other route was used to bypass that denial. Supabase auth configuration has no available read-only connector operation; its provider/security state is unverified.

## Review and validation gate

AGENTS.md rule 1 requires permission for tests/builds/UI checks and review before committing. The user subsequently approved build and browser checks for this integration. `npm ci --ignore-scripts` completed, TypeScript (`tsc --noEmit`) passed, and Expo static export passed under the pinned Node 24.21.0 runtime, producing 46 routes including `/auth/callback` and `/reset-password`. `git diff --check` passed (only normal Windows line-ending notices). At the initial source checkpoint no commit or push was made. The user then requested production deployment, authorizing code review and commit preparation. Source comparison against the saved review patch confirmed the prepared work was unchanged before that release pass.

Independent source reviews covered the SQL/role design, auth lifecycle, private favorites and callback handling. Review findings fixed before build: clear uses the exact displayed snapshot, password recovery mutations use isolated verified credentials, and failed saved writes invalidate/refetch before further changes. Source review and export success do not establish database or OAuth behavior.

Browser verification passed against the final unconfigured local export: **12 checks**, headless Google Chrome **155.0.8059.80**, isolated temporary profile, all external requests blocked. Checks covered guest bookmark reload persistence, separate device shelf/no guest import, disabled signin/signup controls, direct private-route denial, callback fail-closed state, recovery gating, 400px layout overflow, unreadable local-data preservation and no uncaught page errors/backend requests. Desktop signup and mobile signin screenshots were visually inspected; the added resend button reuses the existing form styling.

Reproduce with `npm run test:web:unconfigured` after creating an unconfigured export and installing Chrome. The pinned Playwright development dependency and saved script are included. Task-local evidence is in ignored `test-results/unconfigured-browser/browser-smoke.json`, `signup-desktop.png` and `signin-mobile.png`.

The native browser-control helper failed to start (`cannot locate required Windows platform directory`, HRESULT `0x80070003`), so these checks used isolated headless Chrome. The first sandboxed attempt was blocked from localhost; the scoped authorized run succeeded. An initial smoke assertion expected the wrong dashboard wording; it was corrected after inspecting the actual rendered page, then the complete suite passed. These were local tooling/test issues, not claims about connected sign-in.
Migration SHA-256 for action-time approval: `ACF4B82734FF8C0B3EF81DED71ABCF10CE56B76F8088A1B94B53D570D9B06733`.

The live migration and read-only metadata/advisor checks have now run with specific approval. No local database migration, fixture-based authorization suite or authenticated end-to-end flow has run. The local SQL suite is guarded and unexecuted. Native runtime behavior remains unverified.
The retired `tests/firebase` suite tested the previous backend and was removed with those adapters. Its historical passes do not cover Supabase. The remaining release scenarios require an isolated local database or explicitly authorized target; the code/browser results above are complete:

1. Install the locked dependencies; run `npx tsc --noEmit` and `npm run export:web` under the pinned Node 24.21.0 runtime. Confirm static callback/recovery routes and no secret material in the export.
2. Apply the migration to a fresh local Supabase database and run the SQL security scenarios in `supabase/tests/`. Confirm guest/Subscriber/Owner allow-deny cases, role spoof attempts, identity-switch assertions, stale-clear conflict rollback and additive import.
3. Repeat grants, exposed schema/functions, RLS and advisor review after any separately approved future security change. Installed metadata and advisor results are recorded below; no frontend credential can bypass these rules. Public REST rejection of `app_private` is verified below.
4. In the user's explicitly named browser, test signup/confirmation/resend, password sign-in/reset, OAuth callback/cancel/error, profile reload, and account switching/sign-out during pending work. Production test-account creation and email sends require an explicitly approved test identity.
5. With two authenticated sessions, verify save/remove/import/clear convergence, websocket reconnect and expired sessions; verify a second account cannot read another account's data or privileged directory. Check role/status revocation with the separately approved trusted action.
6. Recheck guest bookmarks/history/theme/device profile/drafts and import originals. Test native email session behavior separately; native Google is intentionally unsupported until a callback is approved.

The exact migration, configuration and verified-owner approval sequence is in [Supabase setup](supabase-setup.md). The schema rollout and task-local public configuration are complete. Production deployment, OAuth grants, auth/security changes and role elevation remain pending. No Google sign-in, email delivery or realtime cloud sync has been demonstrated live.

## Production deployment request

Fresh read-only inspection after the deployment request confirmed that remote `main` and production still point to `064bc626637e2d1e25c95d71e45241bd358befa3` (`v0.0.0.9-SpellingSpellsDeviceProfile`). Production is READY at `https://spelling-spells.vercel.app`, deployment `dpl_5sQwWw1WcmcMngcuKT8j4RkpC7RY`. The integration branch was not present remotely. No unrelated workspace changes were found: the resumed full diff matched the saved review patch byte for byte.

The only required app environment names are `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Their **Production presence is unknown**, because the one permitted retry of `GET /v10/projects/{idOrName}/env` with `decrypt=false`, exact project `prj_Rkxn2SjuJtRsjHh4BiYyNs2qEJ0O` and team `team_2hW8Z1s5cxdaS56fE1tnAMI9`, was denied again: HTTP 403, "You don't have permission to list the project environment variable." No values were read and no write or alternative route was attempted.

The database migration is now installed, as recorded below. The user reported adding both public variables in Vercel; no new Vercel build/runtime has independently verified them. Production deployment remains held because public Auth settings show Google disabled and exact callback configuration/email delivery remain unverified. No new production deployment or merge has been made.

The deployment request authorizes the production code release and required public frontend configuration once access and working prerequisites are established. The user subsequently authorized the exact database/RLS/Realtime migration separately; that operation completed successfully. Provider/security settings, new secret credentials and Owner elevation still require exact scoped action-time approval. Source integration is committed locally as `62cd985d3e70d4979ac1cc53e451297922ef5926` (`v0.0.0.10-SpellingSpellsSupabaseIntegration`) on `integration/supabase-accounts`.

Local SQL validation is also unexecuted. A read-only Docker version check failed because the `docker_engine` named pipe does not exist/the Docker daemon is not running. No service was started and no local database or fixtures were created.

Fresh release checks under the production deployment request also passed: Node 24.21.0 TypeScript, 46-route static export, and all 12 isolated Chrome 155.0.8059.80 checks. Both callback/recovery HTML files exist. The export scan found no secret keys or service-role JWTs. Ignored evidence is saved in `test-results/release-checks.json` and `test-results/unconfigured-browser/`. These results cover the unconfigured build and do not establish live authentication, RLS, email delivery or Realtime.

## Approved database rollout

After the user approved the exact pending migration, preflight reconfirmed the intended healthy project, empty application schema/history and zero Auth users. The reviewed SQL hash matched `ACF4B82734FF8C0B3EF81DED71ABCF10CE56B76F8088A1B94B53D570D9B06733`. Supabase `apply_migration`, name `account_integration`, returned `success: true`; the operation was not retried.

Supabase recorded history version `20261016193413`, name `account_integration`. The originally reviewed local file `20261016133406_account_integration.sql` was renamed to `supabase/migrations/20261016193413_account_integration.sql` to match the installed history. The SQL hash is unchanged; no history repair or second DDL application was performed.

Independent read-only postflight confirmed:

- Exactly the three expected public and three private tables, with RLS enabled on all six; four policies match the reviewed source.
- Authenticated SELECT on `accounts`, `profiles` and `saved_spells`; profile UPDATE permits only `display_name` and `avatar_url`. No anonymous/PUBLIC table grants, browser authority writes, or private-table grants.
- All implementation functions have a fixed empty search path. Privileged implementations are private; public wrappers are `SECURITY INVOKER`. Neither `anon` nor `PUBLIC` can execute these functions. `authenticated` has only the intended helper/RPC execution grants; the private lock and trigger helpers have none.
- Realtime publication contains exactly `public.accounts`, `public.profiles` and `public.saved_spells`.
- Zero Auth users, app accounts, Owners and audit rows; the internal counter has one initial row and the published catalog contains nine IDs. No test user, email, role grant, credential or provider/security setting was created.

Advisor results after rollout were informational only:

- Security: the three private tables have RLS and no policies. This is the intended browser-deny design, alongside no table grants. [RLS policy notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Performance: `saved_spells_spell_id_fkey` has no covering index. The referenced catalog is nine immutable IDs and no catalog deletion path exists; consider a separately reviewed index migration as the catalog grows. No additional DDL was applied. [Foreign-key index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).
- Performance: `saved_spells_active_account_idx` has not been used in the empty new application. Retain it for the intended active-shelf query; reassess with actual workload. [Unused-index notice](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

These are metadata checks, not authenticated authorization, OAuth, email-delivery or two-session Realtime tests. Subsequent public endpoint checks below establish only specific public settings and schema routing. Vercel environment inspection remains denied; no retry or bypass was made. Production remains on the previous main commit until deployment prerequisites are resolved.

## User-reported Vercel variables and public Auth checks

The user reported adding the two public environment variables to Vercel for Spelling Spells. Treat this as user-reported configuration, not independent validation. Read-only inspection still found the existing READY production deployment `dpl_5sQwWw1WcmcMngcuKT8j4RkpC7RY` on main `064bc626637e2d1e25c95d71e45241bd358befa3`; remote main was unchanged and the integration branch was not yet published at that inspection.

Using only the existing ignored `.env.local` publishable key, read-only `GET /auth/v1/settings` returned `external.google=false`, `external.email=true`, `disable_signup=false` and `mailer_autoconfirm=false`. Google is therefore disabled; email/password signup is enabled and confirmation is required. No provider setting was changed, OAuth flow launched, email sent, test user/session created or key printed. A transient execution-tool transport failure occurred before any request; an infrastructure retry succeeded.

Read-only `GET /rest/v1/accounts?select=id&limit=0` with `Accept-Profile: app_private` returned HTTP 406 / `PGRST106`, `Invalid schema: app_private`. This confirms public REST does not accept the private schema. No additional DDL or schema-setting change was made.

The public settings endpoint does not reveal the callback allowlist, Google client configuration or SMTP sender readiness. The exact remaining setup is Google provider/client approval, Site URL `https://spelling-spells.vercel.app`, allowed app callback `https://spelling-spells.vercel.app/auth/callback`, the Google redirect `https://qtfajiuilwdtywkklbjq.supabase.co/auth/v1/callback`, and separately approved production email delivery. Keep email confirmation enabled. Current [Supabase SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp) restricts the built-in sender to organization member addresses and describes it as unsuitable for production delivery. No SMTP readiness or live OAuth/email/Realtime success is claimed. Preserve production while these prerequisites remain unresolved; source publication on the dedicated branch is for review.
