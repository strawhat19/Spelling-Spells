# Users Sign-In Methods

The Users directory reads a bounded `get_account_sign_in_methods(p_account_ids, p_expected_auth_uid)` RPC for the current page of at most 50 accounts. It returns only app account IDs and linked provider names. Google is derived from an actual Google identity; Email + Password requires an email identity and an existing password hash. Both methods can appear for a linked account. An email address or an email-only OTP identity does not imply a password.

The projection uses the existing active verified Owner check, including the current real session, and rejects a mismatched expected Auth UID. Its privileged implementation remains in the unexposed `app_private` schema with an empty search path; the public wrapper executes as its caller. No Auth table access, credential values, identity metadata, session details or additional role permissions are granted to clients.

Installed migration: `supabase/migrations/20261017013943_account_sign_in_methods.sql`, originally prepared with Supabase CLI 2.121.0 and renamed to match the successful remote migration history. It was applied once to `qtfajiuilwdtywkklbjq` on 2026-10-16 (America/New_York) to finish the requested provider icons after the Google account displayed the unavailable shield. The migration creates only the two read functions and their narrow execution grants. It does not modify accounts, authentication settings, credentials, identities or stored records. Do not replay it against this project.

Read-only postflight confirmed both functions, their empty search paths, the private definer/public invoker split, no anonymous execution grant and remote migration version `20261017013943`. A management read of the same provider projection confirmed account No. 2 has Google and account No. 1 has Email + Password. Click Reload Users to fetch the now-available lookup. If a provider read fails, the table uses a neutral Sign-In Method Unavailable indicator instead of guessing Email + Password. Provider names refresh with directory reloads and existing account/profile invalidations; no Auth identity Realtime subscription is added.

No build, tests, application UI checks or authenticated Owner RPC execution were run. Database installation, function metadata and the stored provider projection were checked; completed browser/native rendering remains unverified.

The read-only security advisor reported the existing [Leaked Password Protection Disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) warning and four informational notices for intentionally policy-free internal RLS tables. It reported no finding for the new functions. No security settings were changed.

Official references: [Supabase Identities](https://supabase.com/docs/guides/auth/identities), [Password Security](https://supabase.com/docs/guides/auth/password-security), [Database Functions](https://supabase.com/docs/guides/database/functions).
