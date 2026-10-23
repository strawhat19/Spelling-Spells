# Pricing Plans

## Implemented Scope

The landing page and `/pricing` share a Supabase-backed plan catalog with parchment styling on web and matching native views. Header/footer navigation includes Pricing. `/plan`, `/plans`, `/upgrade`, `/upgrades`, `/membership`, `/memberships`, `/subscription`, and `/subscriptions` redirect to `/pricing` through Expo routes and permanent Vercel redirects in source configuration.

The Owner dashboard has a Plans item at `/admin/plans`. `/plans` remains a public pricing alias. Active, verified Owners can add, edit, publish, hide, and delete plans. The editor supports names, descriptions, optional benefit lines, prices in USD, monthly/yearly/one-time intervals, display order, featured styling, and the ad-free offer flag. New plans start hidden; deleting all plans leaves an empty catalog without restoring defaults.

## Live Database

Supabase project `qtfajiuilwdtywkklbjq` has migration `20261023064550_pricing_plans_catalog.sql` applied. The local filename matches the recorded live migration version.

| Plan | Price | Published | Featured | Ad-Free Offer |
| --- | --- | --- | --- | --- |
| Free | $0 | Yes | No | No |
| Starter | $1/month | Yes | Yes | Yes |

`public.pricing_plans` stores the catalog. Records have app-owned `Plan_<number>_<name>_<date>_<uuid>` IDs, immutable sequential numbers and slugs, optimistic revisions, and server timestamps. The catalog supports up to 100 plans, 16 benefits per plan, 80-character names/slugs, 600-character descriptions, and 160-character benefits. Price limits are $0–$1,000,000; display order is 0–10,000, with record number breaking ties. USD is the supported currency.

RLS permits public reads of published plans and trusted Owner reads of hidden plans. Browser roles have SELECT permission only. The save/delete RPCs validate the current permanent session, matching authenticated identity, active verified Owner account, input constraints, and expected record revision. Creation allocates the next number under a counter lock. Confirmed RPC responses determine UI success; failed drafts remain available.

`public.pricing_plan_feed` exposes only a public invalidation revision. A database trigger advances it after catalog writes. Clients refetch through their permitted reads when the feed changes, on app/browser focus, and every 60 seconds while visible. Same-client saves also invalidate subscriptions. A realtime connection failure falls back to focus and interval refetching; HTTP catalog readiness does not assert realtime connection health.

## Payments And Advertising

Stripe, checkout, subscriptions, webhooks, entitlements, and Google AdSense are not connected. Editing or publishing a plan does not upgrade accounts or remove ads. Paid offers show Coming Soon, and public copy states that subscriptions and advertising are not active. Free offers show Sign Up Free and Sign In when signed out, wait for account hydration, and link to the public spell library when signed in.

Starter now includes custom collections, personal notes, flashcard practice with mastery tracking, and grimoire export. The source includes a separate Device-Local Preview link to `/grimoire`, with shared web/native tools and explicit local-storage disclosures. See [Starter Tools](starter-tools-2026-10-23.md) for scope and data boundaries. This preview does not assign subscription access or sync local records to an account.

Future billing requires trusted server-side subscription state and provider event handling before paid access can be granted. Future AdSense integration requires its account/site setup and an actual advertising consumer that respects trusted ad-free access. Catalog flags alone are offer metadata.

## Evidence And Limits

- The migration applied successfully and live readback confirmed both plans, counters, revisions, policies, grants, RPC definitions, constraints, and the realtime feed publication.
- An anonymous REST read returned HTTP 200 with Free at 0 cents and Starter at 100 cents/month, including the expected visibility/ad-free flags.
- Public, shared service, and Owner editor integrations were reviewed from source. No authenticated management RPC was exercised.
- No tests, builds, browser/device checks, or frontend deployment were performed. Vercel redirects are configured in source and require deployment to affect hosted traffic.
- The Starter benefits content update returned revision 2 at 100 cents/month on October 23, 2026. Collections, notes, practice/mastery and export are implemented in source as an explicit device-local preview; frontend deployment and runtime validation remain pending.
