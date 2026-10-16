# Supabase account integration

The implementation targets only project `qtfajiuilwdtywkklbjq` in Piratechs (`frqaxsbukfkwzsoaokmw`), US East, Free plan, and the existing frontend at `https://spelling-spells.vercel.app`. No plan changes, DNS changes, other projects, Stripe or AdSense are part of this rollout. The approved schema migration is installed; authentication, Google OAuth and online syncing still require live verification.

## Current rollout status

On 2026-10-16, the user specifically approved the reviewed schema/RLS/Realtime migration. It was applied once successfully to the healthy target project. Read-only postflight confirmed all six expected tables have RLS, the reviewed policies and grants match, and Realtime includes exactly `accounts`, `profiles` and `saved_spells`. Auth users, app accounts and Owners remain zero. No provider/security configuration or Owner elevation was performed. Build/browser results, advisor findings and remaining blockers are in [the integration handoff](supabase-integration-handoff.md).

The reviewed file was originally generated as `20261016133406_account_integration.sql` using Supabase CLI 2.121.0. The successful remote application recorded version `20261016193413`, name `account_integration`; the local file is now `supabase/migrations/20261016193413_account_integration.sql` to match that history and avoid replaying the same DDL. Its SQL bytes are unchanged: SHA-256 `ACF4B82734FF8C0B3EF81DED71ABCF10CE56B76F8088A1B94B53D570D9B06733`. Do not reapply it to this project. No local Supabase database was started; the transactional authorization suite remains unexecuted.

The existing public URL and publishable key were written, with specific user approval, only to this task clone's ignored `.env.local`. Neither value is committed. The user subsequently reported adding both public variables in Vercel; this has not been independently verified through a new build/runtime. The denied Vercel environment-list operation was not retried or bypassed. Production still serves the previous main commit.

A read-only public Auth settings request confirmed Google is disabled, email/password and signup are enabled, and email confirmation is required. Public REST rejected `app_private` with HTTP 406 / `PGRST106`, confirming that schema is not accepted as exposed. The settings response does not establish callback allowlists, Google client configuration or SMTP readiness. Google provider setup, exact callbacks, email delivery and authenticated tests remain deployment prerequisites; production was preserved.

## Data and access contract

| Record | Identity and fields | Authorized use |
| --- | --- | --- |
| `public.accounts` | Stable `User_Number_Account_YYYY-MM-DD_UUID` app ID, unique integer number, unique external `auth_uid`, canonical email, role, active status and timestamps | Own account SELECT, including inactive status; active, email-confirmed Owner with an existing Auth session can SELECT the directory. No browser INSERT, UPDATE or DELETE. |
| `public.profiles` | `account_id`, display name, HTTPS avatar URL, immutable private visibility and timestamps | Own SELECT; verified active Owner directory SELECT; own active account can UPDATE only `display_name` and `avatar_url`. No credentials, role or authority fields. |
| `public.saved_spells` | Composite `(account_id, spell_id)` key, `is_saved`, save/update timestamps and monotonic revision | Own active account SELECT; mutations only through scoped RPCs. Owner directory access does not grant access to other users' favorites. |
| `app_private.counters` | Atomic app record allocation | Internal only; no browser grants or RLS policies. |
| `app_private.published_spell_ids` | Exact IDs from the existing published spell catalog | Internal validation only. Add new eligible IDs through a reviewed future migration when the catalog changes. |
| `app_private.role_change_audit` | Trusted actor/target, before/after role/status, reason and timestamp | Internal only. Bootstrap writes an audit row in the same transaction as its grant. |

Every table has RLS enabled. Explicit grants accompany policies because new Supabase projects may not automatically grant Data API access to new tables. Anonymous visitors have no account-table grants. All privileged implementation functions live in `app_private`, whose public REST schema routing was verified to be unexposed, use a fixed empty `search_path`, and explicitly derive identity from `auth.uid()`. Only the required functions have `authenticated` execution grants. Keep `app_private` out of Data API exposed schemas. Public RPC wrappers use `SECURITY INVOKER` and delegate to these bounded implementations.

New permanent email accounts always become active private Subscribers. Provider metadata initializes safe display values only; `role`, `active`, account ID, number and authorization never come from metadata or email matching. `ensure_account` serializes simultaneous identity callbacks and atomically creates the app record, profile and counter update. Existing IDs are not regenerated. `auth_uid` is the explicit external provider ID, not the application primary key. Existing Firebase app-account IDs are not automatically migrated or matched by email; a future identity/data migration requires an explicit, verified mapping.

The existing narrower Owner-only directory remains Owner-only. Admin, Developer, Subscriber and Member roles gain no directory or role-management privilege through this integration. There is no browser-facing role/status mutation or account-delete endpoint. Initial Owner setup is separate; future role management must preserve the last active Owner, protect elevated targets and write an immutable audit in its own reviewed procedure.

### RPC contracts

| RPC | Arguments | Result |
| --- | --- | --- |
| `ensure_account` | `p_expected_auth_uid uuid` | One row as `SETOF public.accounts`; caller loads its private profile separately. |
| `set_saved_spell` | `p_spell_id text`, `p_is_saved boolean`, `p_expected_auth_uid uuid` | `void`; repeated desired state is a no-op. |
| `import_saved_spells` | `p_spell_ids text[]`, `p_expected_auth_uid uuid` | `void`; additive, deduplicated import, preserves existing saved records. |
| `clear_saved_spells` | `p_expected jsonb`, `p_expected_auth_uid uuid` | `void`; JSON array of `{ "spell_id": "…", "revision": 1 }` must match the complete current active set exactly. |

The expected UID is an assertion against `auth.uid()`, never a choice of actor. A request that starts before an account switch and receives the next user's token is rejected. Saved mutations lock the current account row, so concurrent changes and the 500-active-spell limit are checked transactionally. Clear rejects a stale snapshot if any row revision or the active set changed. Retrying a successful clear with its old payload can conflict; refresh and deliberately retry instead of assuming replay idempotency. Single-state saves and additive imports are idempotent for unchanged desired records.

### Local data and realtime

Guest favorites retain their current device storage. Signing in does not silently copy, delete or replace either local or cloud records. The account import action deliberately adds recognized local references to the current account; it leaves the device copy intact. Invalid or unreadable local data is not replaced by an empty collection. An existing saved collection belongs to its original account, and account changes clear private subscription state before the next account loads.

Removal writes `is_saved = false` tombstones and increments revisions. There are no client hard deletes. The migration adds only `accounts`, `profiles` and `saved_spells` to `supabase_realtime`. Clients subscribe to account-scoped INSERT/UPDATE changes and re-read authorized current rows. The account directory uses a bounded page; saved queries use a 500-record window plus one-row overflow detection. A successful REST read is not evidence that Realtime is subscribed. Connection errors, reconnection and server confirmation must remain visible in the application.

Supabase Postgres Changes cannot filter DELETE events and cannot authorize deleted rows through ordinary SELECT RLS. Tombstones avoid this in normal app use. Do not introduce physical deletion, cascades, tombstone compaction, or a wildcard DELETE subscription into these published tables without a separately reviewed cleanup and privacy design. Foreign-key deletion is restricted, so deleting an Auth identity requires a deliberate lifecycle plan. Deleting an Auth user also does not automatically revoke every existing access JWT. Sensitive Owner directory reads additionally require the JWT's session ID to exist in `auth.sessions`; ordinary token expiry and backend role/status checks still apply.

## Exact live approvals required

Prepare the full values and target at action time, then obtain specific approval before each applicable operation:

1. **Schema/security rollout — completed with specific approval:** the reviewed migration was applied once to `qtfajiuilwdtywkklbjq`, creating the tables, internal functions, scoped RPCs, RLS policies/grants and three-table Realtime publication membership described above. No Owner was assigned. Further live DDL/security changes require a new exact scope and approval; do not replay the installed migration. The user chose this rollout before the local SQL suite could run.
2. **Public frontend configuration and deployment:** set only `EXPO_PUBLIC_SUPABASE_URL=https://qtfajiuilwdtywkklbjq.supabase.co` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<enabled project publishable key>` in the selected Spelling Spells Vercel environments, then approve the production deployment scope. A publishable key is public by design; never substitute service-role, secret, database password or OAuth client secret. `.env.example` remains blank and no actual credentials are committed.
3. **Auth settings:** enable email/password with email confirmation retained, configure Site URL `https://spelling-spells.vercel.app`, and allow the exact application callback `https://spelling-spells.vercel.app/auth/callback`. Add specific localhost or preview callback URLs only when explicitly approved and needed; do not wildcard preview URLs. Any password, redirect, signup, session, CAPTCHA, SMTP or security policy change must be named separately; do not weaken defaults to make sign-in pass.
4. **Google credentials/provider grant:** select or create a specifically approved Google OAuth client, approve its branding/consent and credential actions, authorize the frontend origin `https://spelling-spells.vercel.app`, and use Supabase's callback `https://qtfajiuilwdtywkklbjq.supabase.co/auth/v1/callback` as the Google redirect. Configure Google credentials only in the selected Supabase Auth provider. Keep the OAuth client secret out of frontend, Git and logs. Native Google sign-in and recovery are unsupported pending separately approved deep links/client configuration and real verification. A native email signup can confirm its address in the browser and then sign in with email/password in the native app; a browser confirmation does not establish a native session.
5. **Owner elevation:** the intended owner is `rakib987@gmail.com`. After this person signs in and confirms the address, freshly read the exact `auth.users.id`, email and `email_confirmed_at`, hydrate the app account, present the UUID and exact role change, and request specific approval. Only then adapt and run `supabase/bootstrap-owner.sql.example` as trusted database administration. The script independently checks exact UUID, confirmed address, nonanonymous identity, active app account and absence of another active Owner, then audits the change. It is excluded from automatic migrations. No ownership is granted from a typed email, editable metadata, or first signup.

6. **Public email delivery:** Supabase's default Free SMTP is best effort, restricted to organization member addresses and limited to two emails per hour. Public email signup/confirmation/recovery requires a separately approved custom SMTP provider, sender identity and credentials configured server-side in this project. No SMTP credentials or provider were configured. Do not claim public email delivery works from successful source integration or a single organization-member message. See [Supabase SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp).

No live approval is implied by source work or by the earlier approval to create the Free project. Auth user creation, test accounts, Google consent grants and role elevation require their own approval where applicable. If a tool denies an action, report the exact action, target, reason, completed independent work and whether the result is denied, pending or uncertain before retrying.

## Validation still required

Repository `AGENTS.md` rule 1 says: "Do not verify, test, build, or run UI checks unless I ask; let me review the diff and verify before committing." The user subsequently approved build/browser checks, requested deployment and approved the exact migration; see [the integration handoff](supabase-integration-handoff.md) for completed checks. The approved live migration and read-only metadata/advisor checks passed. The remaining authenticated scenarios below are a release checklist; no fixture-based SQL authorization or live user flow has run.

- Review the diff first. Authorize the project's TypeScript/source checks, Expo static web export, relevant existing tests, and a Supabase database authorization suite. Retired Firebase modules, rules/configuration and obsolete Firebase rules tests are removed as part of the provider replacement; Firebase tests would not validate Supabase RLS. `supabase/tests/account_security.sql` is an unexecuted transactional regression script covering the main allow/deny paths below. Real concurrent sessions, SMTP, OAuth, UI and Realtime need the remaining separately authorized checks.
- In an approved isolated database, apply the generated migration transactionally, inspect migration history, and run Supabase security/performance advisors. Confirm no execution grants to `PUBLIC`/`anon`, only intended authenticated table/column grants, RLS on all tables, no Data API exposure of `app_private`, and only three intended publication tables.
- Exercise two Subscriber sessions A/B, an Admin session, a verified Owner session and a revoked/expired Owner session. A must not read B's account/profile/favorites or mutate B through guessed IDs. Admin cannot list users. Owner can list accounts/profiles but cannot read another user's favorites. Anonymous users cannot read private tables or invoke privileged functions. Revoked Owner session cannot list users. Direct profile attempts to change `account_id`, privacy, timestamps, role, number or status must fail.
- Run simultaneous `ensure_account` calls for the same UID and for different UIDs; assert one stable account/profile per UID, unique matching app numbers/IDs, Subscriber defaults despite malicious `role`/`active` metadata, and no Owner after signup. Check inactive-account hydration and denied private writes.
- Race save/import/clear from two sessions of the same account. Check repeated saves/imports, invalid spell IDs, empty import, 500-item bounds, retained tombstones, revision changes, stale clear rejection including concurrent additions, and rejected `p_expected_auth_uid` mismatch. No bulk request may replace a complete saved-ID array.
- Verify email signup/confirmation, password sign-in, wrong-password feedback, reset/verification return handling, sign-out and account switching. Use only explicitly authorized accounts and delivery destinations. Test Google with an approved account and actual OAuth consent; configuration alone is insufficient evidence.
- In two approved browser sessions, observe a confirmed subscription and cross-device save/unsave/profile updates; disconnect/reconnect, revoke role/deactivate an account and switch accounts while requests are pending. Confirm stale callbacks cannot restore prior private state and reconnect re-reads catch missed changes. Report Realtime working only after this passes.
- Check the existing visual design and local saved records before/after sign-in and explicit import, including failure/retry and malformed local-storage recovery. Perform browser work only in the browser the user specifies; no unrelated tabs/apps.

### Local transactional authorization script

After validation approval, apply the migration in an isolated **local** Supabase database. Use current CLI help before choosing startup/reset commands. Then execute the source regression script with `psql`, using local credentials interactively or in `.pgpass`, never command-line production secrets:

```sh
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres \
  --set=spelling_spells_local_test=APPROVED_LOCAL_ONLY \
  --file=supabase/tests/account_security.sql
```

The script refuses to run without its explicit local-only flag or against a non-loopback host/nonstandard local database port. Never forward production through a local tunnel. It inserts four `.invalid` Auth fixtures and sessions without sending email or granting OAuth consent, creates application accounts through the authenticated RPCs, assigns test-only Owner/Admin roles as the local database administrator, exercises authorized and denied operations, then rolls back every fixture/helper/mutation. It also refuses to overwrite a fixture UUID already present. `ON_ERROR_STOP` aborts on any failure; closing that failed session rolls back its open transaction. These guards reduce accidental target errors; the operator must still verify the local database connection before running.

It does not verify actual Google/password sign-in, email transport, Realtime connections or simultaneous database transactions. It has **not been executed** and compatibility with the installed local Auth schema remains part of the approved first run.

Example **read-only** rollout inspection SQL, to run only when validation is authorized:

```sql
select schemaname, tablename, rowsecurity
from pg_tables where schemaname in ('public', 'app_private') order by schemaname, tablename;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' order by tablename, policyname;

select grantee, table_schema, table_name, privilege_type
from information_schema.role_table_grants
where table_schema in ('public', 'app_private')
  and grantee in ('anon', 'authenticated', 'PUBLIC') order by table_schema, table_name, grantee;

select pubname, schemaname, tablename from pg_publication_tables
where pubname = 'supabase_realtime' order by schemaname, tablename;

select id, email, email_confirmed_at from auth.users
where lower(email) = 'rakib987@gmail.com';
```

Read-only inspection does not establish that writes, concurrency or RLS attacks passed. Record actual approved results and remaining limitations separately from implementation completion.

## Official references

Implementation was informed by current Supabase documentation accessed through its documentation connector: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes), [Securing your API](https://supabase.com/docs/guides/api/securing-your-api), [Database Functions](https://supabase.com/docs/guides/database/functions), [Google Auth](https://supabase.com/docs/guides/auth/social-login/auth-google) and the [changelog](https://supabase.com/changelog). Use current CLI `--help` before choosing rollout commands.
