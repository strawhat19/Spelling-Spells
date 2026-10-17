# Contacts

The public `/contact` form stores name, email, subject and message in `public.contacts`. `/contact-us` aliases this page. The Owner workspace exposes its private review table through **Feedback → Contacts**. Spell contribution review remains **Requests** and is a separate form family.

## Persistence Contract

`src/api/contacts.ts` exposes the shared contacts service to both web and native views. A save is reported only after the server returns a committed record receipt. The form retains failed or unconfirmed drafts and preserves the same request UUID for unchanged retries. No contact form fields are silently persisted to device storage.

The backend accepts exactly `name`, `email`, `subject`, `message` and the empty `website` honeypot. Limits are 80, 254, 160 and 5000 characters respectively. Text is trimmed, email is lowercased, unsupported control characters and invalid email shapes are rejected, and a filled honeypot cannot create a record. A bounded JSON payload prevents oversized pre-normalization input. The caller cannot choose a role, status, record number or actor.

The `submit_contact` RPC derives the optional actor from `auth.uid()`, asserts it matches the expected nullable identity captured before submission, and checks a signed-in identity against its real current session. The expected UID is an assertion, never an actor assignment. Under transaction-scoped advisory locks it deduplicates the stable UUID against normalized fields and actor. Identical retries return only the existing ID, number and creation time; mismatched UUID reuse fails. It allocates the number from `app_private.counters` and commits `Contact_<number>_Submission_<UTC date>_<UUID>` with the same number atomically. The request UUID and actor remain private on the contact row.

New attempts are limited to three per normalized email within ten minutes, serialized across concurrent requests. This is basic server-side throttling and a honeypot, not comprehensive bot or IP protection. Changing an email can bypass this throttle. No external CAPTCHA, rate-limit service or email delivery was requested or added.

## Private Review

Only the existing active, verified Owner policy can read contacts. Anonymous users have no table privileges; other signed-in roles are filtered by RLS. Browser INSERT, UPDATE and DELETE privileges are absent. The public receipt never contains the original form fields, actor, request token, or another contact's data.

`get_owner_contacts` verifies the real current Owner and expected Auth UID, then returns at most 51 rows ordered by descending number. The service exposes 50 and a cursor when another page exists. Any page search and status filtering covers only loaded records, not a global total.

Response parsing preserves original stored strings and checks field lengths by Unicode code point, matching PostgreSQL `char_length`. It does not rerun the stricter browser form validator or trim a persisted record, so valid server intake cannot invalidate an entire review page because of JavaScript UTF-16 lengths or different whitespace rules.

`set_contact_status` locks the current actor account and contact row, rechecks Owner access, verifies the expected timestamp, and allows only New, Read or Archived. It returns the actual saved record. Original fields, ID, number, request UUID, submitted actor and creation time are immutable. No delete, content edit, email reply or automatic announcement is provided.

Contacts INSERT and UPDATE events are included in the existing `supabase_realtime` publication. The Owner service uses events only to invalidate a bounded authoritative query, never as displayed row data. It clears private records and cancels pending work on sign-out, account change or lost capability. Foreground refresh and Reload can recover from unavailable live updates; database publication alone is not proof of browser or native subscription behavior.

## Installation And Validation

The Supabase CLI generated `20261017020431_contact_intake.sql` after discovering `migration new --help`. The reviewed migration was applied once on 2026-10-16 (America/New_York) to Supabase project `qtfajiuilwdtywkklbjq`, following the user's request for a real database-backed contact form. The remote history recorded `20261017020852_contact_intake`; the unchanged SQL file is now `supabase/migrations/20261017020852_contact_intake.sql` to match that history. Do not reapply it. The migration adds this contact table, its counter, strict RLS, private functions with empty search paths, public invoker wrappers, explicit grants and realtime membership. It does not alter existing Auth providers, Owner assignments, account roles, notifications or spell request storage.

Read-only database metadata confirmed the installed migration, RLS, the Owner-only SELECT policy, authenticated SELECT as the only browser table grant, the immutable-submission trigger, the new counter at zero and Contacts Realtime membership. Public wrappers are invokers; private implementations are definers with empty search paths. Anonymous execution in `app_private` is limited to `submit_contact`; preflight confirmed no anonymous private function access before the new schema usage grant. No synthetic contacts, credentials, fabricated sessions or Owner impersonation were used.

The security advisor reported no Contacts finding. Existing project findings remain unchanged: four intentionally private RLS tables without browser policies ([advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)) and disabled leaked-password protection ([Supabase remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)). No Auth settings were changed.

Source and database installation are complete. Form submission, retry behavior, Owner status changes, browser/native rendering and actual Realtime delivery remain runtime-unverified. No UI verification, test suite, test submission, transactional write test or build was run for this work, as requested.
