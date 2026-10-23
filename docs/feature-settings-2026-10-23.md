# Feature Settings

## Source Scope

`/features` adds an Owner-only Features table, last under Dashboard. `/admin/features` redirects to the canonical route. The shared route registry supplies access, labels, icons, auth return destinations and account-shell detection. The page is excluded from sitemap generation and disallowed in generated robots metadata.

Theme Toggle is the first managed feature. Its global setting controls the header icon, mobile navigation button, Profile theme section and device-profile theme button on web and native. The table shows No., Feature, Description, Value, Plans and Actions, with saved status, Disable/Enable controls and a settings gear. Settings include Description, Minimum Role and an optional independent allowed-role list.

Feature visibility uses the explicit order Guest < Member < Subscriber < Developer < Admin < Owner. Both the minimum and allowed-role list must match. A null list means all roles; an empty list means no roles. This ordering affects this feature only: Admin and Developer do not gain Owner routes or configuration access. Unknown, inactive or unverified account authority is ineligible. Guests qualify only after a confirmed signed-out state.

Plans remain Free And Above. This focused request does not add plan restrictions, trusted subscription state, payments or entitlements.

## Theme Behavior

The provider order is Auth, Feature Flags, then Theme. The app starts dark with optional theme controls hidden until confirmed settings and viewer authority resolve. Disabled, ineligible, missing or unavailable feature state forces the effective theme to `night`, without changing the stored theme preference. Reenabling an eligible viewer restores that preference. The shared theme setter also rejects actions while unavailable, so a stale rendered button cannot change the effective theme.

Public browsing and the Owner Features page remain usable in dark mode. Feature errors appear in the management page; optional controls do not silently fall back to browser-only flags.

## Persistence And Authority

Applied migration: `supabase/migrations/20261023160524_feature_settings.sql`. The source filename matches the version recorded by Supabase.

The feature configuration is a versioned public-safe singleton in `public.feature_settings` at scope `global`, with a stable app-owned identity, matching number, server timestamps and optimistic revision. Its JSON policy stores enabled, description, minimumRole and nullable roles for `themeToggle`. It contains no credentials or account lists. The initial confirmed policy enables Theme Toggle for Guest and above.

Browser roles can read the exact public singleton but cannot insert, update or delete it directly. The Owner save RPC validates a current permanent session, expected identity, authoritative active Owner account, verified email, supported policy shape and expected revision. Saves retain identity and creation metadata and return the committed row. Concurrent changes fail with a reload message; failed drafts are preserved.

Clients subscribe to singleton updates and refetch authoritative settings. App/browser focus and visible 60-second polling provide refresh fallback. A successful Owner mutation immediately publishes its returned row to the shared provider; catalog/UI preferences do not establish authority. Configuration read errors keep the effective feature disabled. A confirmed missing singleton is distinct from an unavailable schema or denied/failed read: it shows setup needed and stays dark. A failed editor save preserves its draft; Discard Draft & Reload explicitly closes the editor and refreshes the saved revision for conflict recovery.

## External Setup And Review

The user approved applying the prepared migration to project `qtfajiuilwdtywkklbjq`. Supabase returned success on October 23, 2026, and migration history records `feature_settings` at version `20261023160524`. The migration creates the settings table, initial Theme Toggle policy, Owner save RPC, restrictive grants/RLS and realtime publication membership. The initial saved policy enables Theme Toggle for Guest and above; the shared provider still uses dark mode until settings and viewer authority resolve.

The database migration was applied, and its recorded version was retrieved for source/history alignment. A later readback reconfirmed the migration history, the revision-1 singleton with Theme Toggle enabled for Guest and above, and membership in the `supabase_realtime` publication. [The release public-key readback](../supabase/generated/catalog-media-public-2026-10-23.json) independently confirmed the same revision-1 Guest-and-above policy.

The user approved the frontend release. Vercel deployment `dpl_2XoMhbRmFMFMeix21xmcJSMFeeVG` became Ready and was confirmed behind [the production site](https://spelling-spells.vercel.app) for that release, including Features and the shared theme consumers. A later approved catalog release superseded it with Ready deployment `dpl_ASW6zhGEdHaypsdxFHDfMKq23NCq`, now confirmed behind production; [Spell Media](spell-media.md) records the release sequence. No local test suite, standalone compiler check, browser/native UI checks or authenticated management actions were run. Build success and public settings readback do not establish end-to-end Owner editing or realtime UI behavior.
