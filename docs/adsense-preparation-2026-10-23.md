# AdSense Submission Preparation — October 23, 2026

The requested stage is preparation for `https://spellingspells.com`, without a publisher ID. This source does not create an AdSense account, request review, publish consent messages or install advertising. Google approval is not inferred from these changes or the number of entries.

## Current Evidence

| Boundary | State |
| --- | --- |
| Public content | Anonymous catalog audit returned 30 published entries and 34 sources; published entries include AI illustration credits. Drafts remain excluded |
| Policies/navigation | About, Contact, Terms, Privacy, Help and Editorial Guidelines exist with complete sections and internal navigation |
| Source preparation | Public snapshot grids, static Contact guidance, source/rights disclosures, Google privacy resources, crawler metadata and guarded publisher support are prepared |
| Publisher/account | No ID supplied; no account setup, verification or review status recorded |
| Consent/serving | No ad-serving loader, ad units or CMP publication added; advertising remains inactive |
| Export validation | Approved local export passed: 97 HTML routes, 20 artifact checks and nine isolated publisher checks |
| Deployment | These preparation changes have not been deployed |

The [read-only live baseline](adsense-baseline-2026-10-23.json) records the existing site before these changes: public index HTML has no spell/world links, unknown detail URLs return 200, and `/ads.txt` correctly returns 404 without a seller. Valid published detail pages already have canonical metadata and readable HTML. This baseline does not validate the new source.

## Prepared Changes

- Public Spell Index and Worlds show the published build snapshot before client hydration; private Saved readiness is unchanged.
- Contact keeps useful static guidance visible while its existing form/feature access resolves. Submission remains guarded and confirms only committed saves.
- Editorial Guidelines explain bounded source verification, official editorial references versus inspected original works, continuity comparisons, illustration limitations and useful correction requests.
- Privacy retains its actual Supabase/Stripe/storage disclosures, describes future advertising conditionally and provides user-activated Google data-use/settings links on web and native.
- Notifications and notification detail workflows are noindex and omitted from the generated sitemap. Robots excludes private/API/billing workflows while public content and rendering assets remain crawlable.
- Spell/world catch-all rewrites are removed. API and notification rewrites remain. Unknown static detail paths should receive hosting 404 responses rather than successful generic pages; actual HTTP status requires a permitted release/readback.
- Pricing metadata describes current Starter tools without the old ad-free preview promise. Billing, entitlements, roles and pricing are otherwise unchanged.
- Canonical, sharing and structured-data URLs read the same `app.json` origin as the sitemap generator, avoiding stale Expo Constants metadata. Generic detail-loading pages and the internal router sitemap are noindex.

Catalog publication, edits and unpublishing require a rebuild/redeploy so static HTML and sitemap match. A newly published slug will return 404 on a direct visit until its static release exists; client navigation can read a newer catalog. Do not use a successful client navigation as proof of exported content or indexing.

## Publisher Configuration

`ADSENSE_PUBLISHER_ID` is a public build-time identifier, not a credential. Its blank template is in `.env.example`; leave it unset as requested. The build accepts the account's own `pub-` identifier with 16 digits, optionally prefixed `ca-`, and rejects malformed/all-zero values. Format validation does not establish ownership or approval.

The normal `npm run export:web` finalization calls `scripts/finalize-adsense-build.cjs` after Expo exports HTML:

1. Read only this named value from `.env`/`.env.local`, with explicit process environment taking precedence.
2. Remove stale AdSense verification tags from exported HTML. Add exactly one `google-adsense-account` tag per HTML head only with valid configuration.
3. Preserve any legitimate seller entries maintained in `public/ads.txt`; append the configured Google DIRECT seller record without duplication. With no configuration and no seller source file, emit no `ads.txt`, allowing the host's real 404.
4. Write public `dist/adsense-build.json` preparation metadata. It is not an approval, consent or ad-delivery report.

No ad-serving JavaScript is part of this process. A verification tag or seller record does not request ads. Later publisher configuration must be applied to the intended Production build environment and followed by an authorized rebuild/release.

## Validation Performed

The user approved the focused local export and publisher/artifact checks. The first export exposed 47 canonical URLs using the old hosting origin through Expo Constants, despite the configured custom domain. The public URL helper now reads `app.json` directly. Generic loading views also gained noindex metadata. The corrected export and direct inspection of its generated files passed all 20 artifact checks at `2026-10-23T21:22:03.955Z`.

The final export contains 97 HTML pages and bundle `entry-5071dab6bca6b87833e07c610ecd64bf.js`. All 47 intended public routes have a title, canonical URL at `https://spellingspells.com` and index metadata. Initial index HTML links all 30 published spells and five worlds. All six information pages contain every policy/help section. Contact guidance is present while the unresolved form stays gated. Fifteen private, notification, utility, error and generic detail routes are noindex. Sitemap/robots match the intended public inventory; every exported HTML page has no publisher verification tag or ad loader, and `dist/ads.txt` is absent.

Nine isolated publisher checks passed for invalid/all-zero input, supported prefixes, stale metadata cleanup, idempotent configured output, clearing configuration, preserving manual sellers, environment precedence and output-path restrictions. Synthetic identifiers were confined to ignored fixtures and never entered the production export or local publisher configuration. The actual local configuration remains unset and valid for preparation.

Evidence: [final validation](adsense-validation-2026-10-23.json), [initial findings](adsense-validation-initial-2026-10-23.json), and ignored `test-results/adsense-publisher-checks.json`. The export refreshed the generated public catalog snapshot. The only build warnings observed concerned terminal color variables; no export errors remained. No standalone typecheck, browser UI/native runtime check, account creation, private form submission, Stripe transaction, AdSense review request or live ad traffic was performed. Hosting behavior after these changes, including actual unknown-route 404 and response headers, remains unverified until an authorized release.

## Account Holder Handoff

When an ID and release are authorized:

1. Use the intended existing AdSense account and real account-holder details. Confirm eligibility and avoid duplicate accounts; do not invent payee, address, age, tax or legal acceptance data.
2. Add `spellingspells.com`, supply the real publisher ID, rebuild/release and inspect initial HTML plus root `/ads.txt` over HTTPS. The meta-tag connection method supports verification without installing an ad loader.
3. Confirm the actual site verification status and request review only when authorized. Record Google's response; do not promise approval, review timing or a fixed qualifying content/traffic count.
4. Before any separately requested ad serving, review Google's applicable consent requirements, choose the actual supported CMP and publish appropriate messages/choices. Google-certified TCF consent requirements and applicable US state choices are not fulfilled by this preparation or a local banner.
5. Keep any future ads off private, authentication, payment, error and low-value workflows. Define any ad-free plans through trusted entitlement policy in that separate serving scope; this preparation sells no ad removal.

The entries are concise curated reference material. Original summaries, useful context and credits help readers, but do not prove Google approval or rights to another creator's work. Review intended monetized material and rights claims before submitting; preserve drafts and source limitations rather than manufacturing filler or credentials.

## Official References Reviewed

- [Eligibility](https://support.google.com/adsense/answer/9724?hl=en), [site readiness](https://support.google.com/adsense/answer/7299563?hl=en), [content rejection guidance](https://support.google.com/adsense/answer/81904?hl=en)
- [Connect using code, ads.txt or a meta tag](https://support.google.com/adsense/answer/7584263?hl=en), [ads.txt guide](https://support.google.com/adsense/answer/12171612?hl=en)
- [Publisher policies](https://support.google.com/adsense/answer/10502938?hl=en), [intellectual property](https://support.google.com/publisherpolicies/answer/10402772?hl=en), [replicated content](https://support.google.com/publisherpolicies/answer/11190248?hl=en)
- [Privacy disclosures](https://support.google.com/publisherpolicies/answer/10437794?hl=en), [certified CMP requirements](https://support.google.com/adsense/answer/13554116?hl=en), [European message publication](https://support.google.com/adsense/answer/10960768?hl=en), [US state messages](https://support.google.com/adsense/answer/10961479?hl=en)
