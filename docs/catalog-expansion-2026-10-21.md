# Catalog Expansion Handoff — October 21, 2026

Branch: `codex/catalog-expansion-20261021`. Existing uncommitted package, auth-setup, scrollbar and parchment changes were preserved. No merge, push, deployment, DNS, Auth configuration, live SQL, billing, ads or payment changes are part of this work. Shared `AGENTS.md` and `ai/` were not edited.

The October 19 checkpoint, migration draft and named branch could not be recovered from this checkout and inspected refs. [The research register](catalog-sources.md) records the new source review and its limits instead of claiming recovery of unavailable work.

## Source Implementation

| Requirement | Result |
| --- | --- |
| Database catalog | Versioned catalog migration, normalized universes/sources/entries, public published-only reads, paginated loading, explicit failure/retry and no seed substitution |
| Stable references | Original nine IDs, numbers and slugs retained; favorite foreign keys move to catalog entries without deleting existing saves; new IDs and numbers allocated atomically |
| Owner workflow | Catalog under Dashboard; manage universes/sources, save entries as drafts, review, approve, reject, publish and unpublish with optimistic revisions |
| Private contributions | Signed-in submission, account-scoped retry UUID, own submission history and Owner decisions; approved submissions link an approved catalog entry; publication is a separate action |
| Permissions | RLS plus least-privilege grants; privileged RPCs require a current confirmed, nonanonymous session and active trusted Owner; ordinary users cannot directly edit or publish |
| Content | Twelve new researched candidates; eight primary-supported, four Tolkien candidates awaiting primary-text checks. All expansion imports start as drafts. No new artwork or asserted pronunciation |
| Browsing | Database-backed browse, caster/type/continuity search, universe filters/details, favorite references and direct entry routes |
| Disclosures | About, Terms, Privacy, editorial guidance and contribution copy describe actual storage, review, pronunciation uncertainty and fictional editorial levels |
| SEO | Entry/universe metadata and canonical URLs, CreativeWork/CollectionPage JSON-LD, generated public sitemap, private noindex and robots exclusions |

## Database Review And Import

`supabase/migrations/20261021074834_catalog_expansion.sql` is **prepared, not applied to the hosted project**. It must follow the existing four migrations. Review the exact migration and generated import together before authorizing a live operation.

The migration first preserves legacy favorite references using nine draft placeholders. Import the complete legacy content before serving a production catalog. Do not stop between migration and import: public catalog reads will otherwise be empty. Test against a disposable Supabase project before scheduling the production change.

Generate the reviewable seed SQL with `npm run catalog:seed`. This command writes a file; it does not connect to a database or execute SQL. The default leaves entries in draft. The explicit legacy-publication option may preserve publication of the original nine only after that content has been reviewed; it never publishes the twelve expansion records. Review script help and the generated header before using that option. Imports must remain guarded against overwriting Owner edits.

Commands to prepare review artifacts only:

```powershell
npm run catalog:seed
node scripts/catalog-seed.cjs --help
node scripts/catalog-seed.cjs --preserve-legacy-publication --output supabase/generated/catalog-legacy-publication.sql
```

The generated SQL requires `SET spelling_spells.catalog_import_approved = 'APPROVED_CATALOG_IMPORT';` in the same database session before application. That guard is an intentional acknowledgment, not proof of user approval. After separate approval, apply the reviewed migration first and the selected reviewed import second through a trusted database connection. No command above applies either artifact. Do not create Owner content between the migration and initial import: number/slug collisions deliberately fail the transaction for review instead of replacing another record.

The generated manifest has 21 entries, six universes and 22 sources. Source numbers follow their fixed first-encounter order and UUIDs derive from their HTTPS URLs. Preserve that existing order when appending future seed references; do not reorder the legacy manifest and thereby renumber sources. Owner-created records use the database counters.

Do not put service-role keys into Expo public environment variables, source files or browser storage. Owner access is the existing trusted server role; neither first signup nor editable profile metadata grants it.

## Editorial Use

1. In Catalog, create or select a universe and HTTPS source record.
2. Save an entry with its stable URL slug, original summary/effect, type, caster, continuity and linked sources. Unsupported pronunciation stays unavailable; any reading aid is labelled approximate.
3. Send it to review, verify the references, approve, then publish separately. An edit returns it to draft. Rejected or unpublished entries do not appear in public database queries.
4. For a reader suggestion, use Requests → Prepare Entry, verify and save the draft, approve the entry, then approve the suggestion with that linked entry. Publish the entry separately. Rejection and changes-requested retain an honest private history.

Existing contact intake remains a separate private Owner inbox. A confirmed contact save does not imply an email was sent. The isolated SQL checks exercise retry-safe contact saves and Owner review; hosted submission and delivery need the staging checks below.

## Static Export And Publication Timing

`npm run export:web` first fetches the **anonymous published catalog** using only the public project URL and publishable key, then exports Expo and finalizes sitemap/robots metadata. Production and ordinary local builds fail for a missing migration. Missing configuration, permission errors, malformed records and incomplete reads fail every normal catalog build. A failed read never silently exports the legacy seed.

Vercel previews may export before the separately approved catalog migration: when `VERCEL_ENV` is exactly `preview` and catalog reads return HTTP 404 with Supabase `PGRST205` or `42P01`, preparation emits an explicit warning and an empty `preview-shell` snapshot. The manifest records `reason: catalog-schema-unavailable` and a null catalog timestamp. No spell/universe detail pages are invented. Every concurrent read settles first; a permission, network or other server failure still fails the preview even if another table is missing. Once all tables are available, previews export the actual anonymous published catalog normally. Vercel documents this environment indicator in its [system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables#vercel_env).

This fixes the branch preview build sequence without applying SQL. Runtime browsing/editor requests still report the missing catalog migration; a successful shell export is not evidence of database connectivity or a release-ready catalog. Production still needs the approved migration/import before its build.

The generated `src/shared/catalog/buildSnapshot.ts` contains only the public build snapshot. Its checked-in baseline is empty. Do not commit generated fixture or production snapshots accidentally. Build metadata is written under ignored `test-results/catalog-build`, and final output under ignored `dist`.

For an explicitly isolated build, set `CATALOG_BUILD_FIXTURE` to a public-only fixture JSON. `node scripts/prepare-catalog-build.cjs --shell` is an explicit empty-shell preparation mode, not the default production path. A fixture export is test output and must never be deployed as production content.

Static entry/universe pages are generated from the anonymous snapshot. Rewrites serve the entry/universe shell for a newly published slug absent from that export, and the browser resolves current publications from the database. Realtime feed revisions, focus refresh and a visible-page 60-second fallback refresh invalidate loaded catalogs.

**Rebuild and redeploy after publishing, editing or unpublishing** to update pre-rendered HTML, social metadata and the sitemap and to remove stale exported content. A previously exported page can contain its old public text until that rebuild, even though current database reads stop returning an unpublished entry. Unknown dynamic paths show client-side not-found/noindex after hydration; the static fallback cannot provide a true database-aware HTTP 404. Server rendering would be a separate architectural change. Do not claim instantaneous search-engine removal or server-side publication enforcement for old static HTML.

## Validation Evidence

Checks use synthetic identities and disposable in-memory PostgreSQL only. Browser transport fixtures are labelled synthetic and block external fetch, beacon and WebSocket requests. They exercise rendering and interaction, not hosted Auth or PostgREST authorization. SQL tests exercise actual PostgreSQL functions/grants/RLS with fixture Auth tables and claims.

- `npx tsc --noEmit`: passed across web/native source.
- `npm run test:catalog`: 26 contracts passed, including public/private projections, direct slugs, Owner capability gates, actor/revision forwarding, 4,000-record boundaries, build failures without fallback, source binding, metadata generation and actual Helmet JSON-LD rendering/escaping.
- `npm run test:catalog:security`: all five migrations and the authorization/moderation/favorites/submissions/contact assertions passed in disposable PGlite PostgreSQL. All 21 imported payloads pass SQL validation; repeated imports preserve Owner spell/source/universe edits, status and joins. The import guard rejects an unacknowledged application.
- `node supabase/tests/run-catalog-security.cjs --initial-legacy-publication`: passed separately; exactly nine legacy publications and twelve expansion drafts, with later imports preserving Owner edits/statuses.
- `CATALOG_BUILD_FIXTURE=test-results/catalog-fixture/public.json` with `npm run export:web`: passed, exporting 50 static routes. The fixture contains only one static spell; the second publication is deliberately absent from the snapshot for dynamic-fallback testing. Exported entry/universe HTML contains JSON-LD, and the sitemap covers only public canonical routes.
- Preview-build follow-up: all three configured public catalog endpoints were checked with `select=id&limit=0`; each returned HTTP 404 / `PGRST205`, confirming the pending schema without reading records. `VERCEL_ENV=preview npm run export:web` then passed locally with 48 shell routes and the explicit migration warning. Nine additional preview-boundary regressions passed, bringing the complete catalog suite to 35 passing tests. The source snapshot was restored afterward. A new hosted Vercel deployment has not been triggered or verified by this fix.
- `git diff --check`: passed; shared guidance has no diff. Existing Git LF/CRLF notices and Metro's NO_COLOR/FORCE_COLOR warning are environment notices rather than compiler errors.

The isolated browser pass additionally confirmed:

- Published-only browsing/search, universe detail and a new direct slug absent from the static snapshot, with canonical metadata and CreativeWork JSON-LD.
- Subscriber favorite save and persistence after reload; Subscriber editor access denied with `noindex, follow`.
- Private contribution → Owner receipt → prepared draft → review → approval → linked submission approval → separate publication → new direct page → unpublish → client not-found/noindex. A separate submission was rejected with a saved Owner note.
- A guest contact save appeared in the Owner inbox; marking it Read persisted after reload. No email was sent.
- Private submission history, public catalog and account layout at 390px had no horizontal overflow after responsive styles settled. Existing artwork, palette and parchment edges were retained.
- A missing-table fixture produced an explicit error/retry, cleared entries and showed `Catalog unavailable`, without legacy seed substitution.

The browser fixtures retained 11 synthetic mutations, one favorite, approved/rejected submissions and a read contact. Evidence is under ignored `test-results/catalog-browser-evidence.json` and `test-results/catalog-review-results.jpg`; the fixture server was stopped. The checked-in source snapshot was restored to empty after the export.

No hosted Auth callback, real-user submission, production SQL execution, Vercel deployment, hosted Realtime delivery or native-device interaction is claimed by these checks. The browser harness supplies synthetic transport/session responses; actual permission enforcement is supported separately by the PostgreSQL checks, not by the harness. Vercel filesystem/rewrites were modeled locally and still require the approved hosted smoke check. The latest local `dist` is the preview shell export; earlier fixture-browser evidence is retained separately under `test-results`.

## Go-Live Approval Checklist

No action in this checklist has been performed automatically.

- [ ] Review this branch and exact SQL; separately authorize staging setup and migration/import execution, then verify ordinary/Owner access through real Supabase Auth, PostgREST and Realtime.
- [ ] Recheck existing nine summaries, source accuracy and media provenance. Verify the four Tolkien candidates against lawful primary texts before changing their evidence status. Review the eight supported candidates in their specific continuities before publication.
- [ ] Test staging sign-in/sign-out/verification/session expiry, own-account favorites across reload, revoked Owner denial, private submission review, contact inbox and external link behavior. Use disposable accounts and records.
- [ ] Confirm ownership of `spellingspells.com`; separately approve DNS/TLS and hosting attachment, preferred host and redirects. Change `app.json` siteUrl only when that canonical origin is confirmed, then rebuild sitemap/metadata and inspect redirects/direct detail URLs.
- [ ] Separately approve Supabase Site URL and exact production redirect allowlist, such as `https://spellingspells.com/auth/callback`; preserve deliberately scoped localhost callbacks (including the active port) for development. Review the provider's callback configuration separately. Do not replace development redirectTo with the production origin.
- [ ] Review original content, navigation, About/Contact/Privacy/Terms, rights and audience before any AdSense application. There is no guaranteed approval or magic minimum entry count. Do not put ads on empty, private or review screens.
- [ ] Before serving personalized ads in the EEA, UK or Switzerland, review Google's current certified CMP/TCF requirement and the audience's applicable consent rules. Update privacy disclosures for the actual ad technology and data uses before activation. No ads, CMP or AdSense application are enabled by this branch.
- [ ] Keep Stripe deferred until a concrete paid feature justifies it. No checkout, entitlements, subscription or payment collection is activated here.
- [ ] Approve the reviewed commit for deployment only after hosted checks. Record the actual deployment commit and migration/import versions; rebuild after publication changes.

Supabase requires redirectTo to match its allowed redirects and uses Site URL as a fallback; review the [official redirect guide](https://supabase.com/docs/guides/auth/redirect-urls). Google's [eligibility guidance](https://support.google.com/adsense/answer/9724), [publisher policies](https://support.google.com/adsense/answer/10502938) and [certified CMP requirements](https://support.google.com/adsense/answer/13554116) were reviewed for this checklist. They are readiness criteria, not an approval prediction or legal conclusion.

## Operating Target

Target: **under $50/month total**. No purchase, upgrade or spending commitment was made. Actual current plan, usage, quotas and invoices were not verified; this document does not claim a zero-cost deployment. Before approval, total hosting, Supabase, domain renewal, bandwidth/storage and any optional services; set available usage alerts and review limits. Avoid adding paid reporting, media processing, email delivery or automation implicitly. At higher catalog sizes, replace the explicit 4,000-row reader/build limit with server-side pagination rather than exporting a partial archive.
