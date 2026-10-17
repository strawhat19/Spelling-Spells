# Notifications

Spelling Spells adopts the public announcement workflow from Domains Database and BengaliBlush, using its existing Supabase backend and Owner-only administrative policy. This is in-app publication; no email or push transport is configured.

## Surfaces And Actions

- The header bell opens a themed web popover or native modal, with unread status, individual read actions, Mark All Read, Reload and View All Notifications.
- `/notifications` lists the newest 100 active announcements. Unread counts describe that window. `/notifications/<slug>` loads the current published record directly, including older announcements outside that window. `/alerts` and `/notification` redirect to the list.
- Dashboard → Notifications opens `/admin/notifications`. The Owner manager has a 50-record cursor page, page search/status filters, Add/Edit, persisted Active/Inactive and confirmed Delete. Its table uses No., Title, Kind, Status, Updated and Actions; native uses equivalent cards.
- New notifications start Inactive. The editor supports title, unique lowercase slug, Announcement/Development, plain-text body, optional labelled internal/HTTPS link and trailing text. Making a record Active publishes it to all visitors. There is no per-record private audience or automated event producer.
- Stable IDs remain read after editing or republishing. Mark All Read sends only the IDs observed when the action starts, so later arrivals remain unread. Unknown/error read state does not become a zero badge or a successful read action.

## Persistence And Permissions

`src/shared/notifications/service.ts` owns Supabase subscriptions and mutations; `src/api/notifications.ts` is the UI facade. `NotificationsProvider` shares one public feed and the current account's read state across the shell, list and detail views.

`public.notifications` stores publication records with an atomically allocated matching number and `Notification_<number>_Announcement_<date>_<uuid>` ID. Unique slugs, field limits and safe links are enforced by the database and shared normalizer. Updates/deletes require the previously observed update timestamp. A private creation-attempt ledger makes retries of the same pending create idempotent.

Anonymous visitors can read published announcements only. An authenticated caller can read drafts only through current Owner access. Owner manager and mutation RPCs independently check the expected Auth identity, active account, Owner role, confirmed permanent identity and current session. Public wrappers use security invoker; privileged implementations live in the unexposed `app_private` schema with fixed search paths and explicit execute grants. Direct content and receipt writes are denied to browser roles.

`public.notification_receipts` contains private account/notification/read-time rows. Reads are scoped to the active account, including for Owners. Read mutations derive the account from the session, lock and validate every requested published notification, then merge receipts atomically. Receipt reads use bounded pages and reject histories beyond 10,000 records rather than presenting a partial history as complete.

Guests use the separate versioned `spelling-spells:notifications:guest:v1` device preference, retaining the latest 2,000 read IDs. Explicit session-storage mode remains session-only. Guest state is never imported on sign-in. Guest operations serialize reads/writes and use a browser Web Lock where available. Browser storage changes, focus/visibility and native foreground events refresh guest read state. Unreadable saved data is preserved and requires retry rather than being overwritten with an empty list.

Realtime publishes private receipt inserts and the public-safe `notification_feed_state` revision row. Each publication mutation changes that revision atomically, so public readers refetch after unpublish/delete without receiving draft content or private deleted-row payloads. Foreground and explicit Reload also refetch. There is no existing global Features module in this destination, so this focused addition does not create unrelated feature controls, plans, private inbox producers or delivery workers.

## Static Hosting

The dynamic route exports no build-time parameters and performs no cloud content reads during export. A generated `/notification-details` HTML shell renders the same detail component. The targeted Vercel rewrite sends `/notifications/:slug` requests to that shell; Expo Router initializes the client from the original browser URL. Newly published slugs therefore use the client lookup without requiring a new static page per announcement. Other static routes keep their existing hosting behavior. Notification pages and all backend requests stay outside the service worker's public offline-page cache.

References: [Expo static rendering](https://docs.expo.dev/router/web/static-rendering/), [Vercel rewrites](https://vercel.com/docs/routing/rewrites), [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes), [Supabase database functions](https://supabase.com/docs/guides/database/functions).

## Current Connection And Review Status

The additive migration was created with Supabase CLI 2.121.0 and applied through the connected Supabase migration tool to the existing Spelling Spells project `qtfajiuilwdtywkklbjq`. The local migration filename, `20261016215525_notifications_system.sql`, matches the authoritative applied version returned by the database.

Post-application metadata showed all three public tables with RLS enabled, receipt/feed-state Realtime membership, no direct content write privilege for `anon` or `authenticated`, and no anonymous execute privilege on the manager RPC. Immediately after installation, the announcement table contained zero records; no sample content, recipients, emails, push messages or Owner grants were created during installation.

Source review covered the reference workflow, public/private boundaries, scoped subscriptions, late account results, confirmed mutation behavior, guest reload/write ordering, browser locking, limits, accessible dismissal/focus and web/native implementations. Added the pinned React DOM type dependency for the portal. No test suite, compiler, build, browser or native-device checks have run for this addition, and no app deployment or commit was made. The database installation is confirmed; browser/native interactions, live account-to-account isolation, cross-device read sync and deployed deep links still need runtime review under the user's verification preference.

## Published Editorial Guidance

On 2026-10-17 at 00:58 UTC, the user-requested catalog note was published as **Fictional Worlds & Editorial Guides**, slug `catalog-editorial-guidance`, at `/notifications/catalog-editorial-guidance`:

> All effects belong to fictional worlds. Danger, utility, and skill levels are editorial guides, with linked sources inside each entry.

The persisted ID is `Notification_1_Announcement_2026-10-17_05bb5ba9-294e-40ab-a884-c78256d1e1be`. The content-only management transaction locked the existing counter, allocated the matching number, inserted the announcement and incremented the public feed revision atomically. The stable slug accepts identical retries without another insert or revision change; conflicting content aborts. No application identity was impersonated, and schema, permissions and read receipts were unchanged.

Post-publication reads confirmed one matching published record, counter `1` and feed revision `1`. A separate read-only transaction confirmed that the `anon` role can select it. The public catalog footer note was removed in source; saved-shelf storage notices remain. Bell rendering and browser/native interaction were not runtime-checked.

## Reference Source Evidence

The requested reverse-engineer-anything skill directs ordinary repository inspection for complete source repositories. Both references were inspected from current source; no runtime or shipped binary behavior is implied.

- Domains Database: `src/components/NotificationBell/`, `NotificationCard/`, `Notifications/`, `AdminNotifications/`, `NotificationEditor/`, `src/shared/notifications/`, `src/shared/firebase/notifications.ts`, `src/api/notifications.ts`, `firestore.rules` and `firestore.indexes.json` under `C:/Users/massa/OneDrive/Documents/XAMPP Apache/htdocs/apps/Apps/Library/Database/Domains-Database`.
- BengaliBlush: `src/app/components/navigation/notifications-menu/`, `notification-card/`, `src/app/components/notifications/`, `src/app/components/authentication/admin-notifications/`, `notification-editor/`, `src/shared/notifications/`, `src/shared/firebase/notifications.ts` and `firestore.rules` under `C:/Users/massa/OneDrive/Documents/XAMPP Apache/htdocs/apps/Apps/Library/Clients/Sadia/bengaliblush`.

The destination retains its stricter Owner-only management gate. Its account receipts improve on BengaliBlush's browser-global read preference; unknown counts and direct detail lookup avoid the reference limitations found during inspection.
