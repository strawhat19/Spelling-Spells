# Starter Catalog Import — October 23, 2026

The user authorized filling and importing a useful starting library, including the original catalog, with future growth through user contributions. The import was applied to the existing Spelling Spells Supabase project, `qtfajiuilwdtywkklbjq`. The catalog migration was already installed; no schema, account, role, credential or deployment changes were needed.

## Committed Data

| Record | Before | After |
| --- | --- | --- |
| Published entries | 0 | 17 |
| Draft entries | 9 placeholders | 4 complete research drafts |
| Universes | 0 | 6 |
| Source records | 0 | 22 |
| Entry/source links | 0 | 31 |
| Saved bookmarks | 1 | 1 |

All nine original IDs, numbers and slugs remain intact. Their placeholders were filled in place, preserving the existing bookmark foreign key. New entries occupy numbers 10–21. Catalog counters now store 21 spells, 6 universes and 22 sources, so future allocations continue beyond the imported records.

The published library covers Harry Potter, The Elder Scrolls, Inheritance Cycle, Marvel and DC / Teen Titans. It includes effects, definitions, use/context, language, entry type, continuity, references, and supported caster examples. Unknown casters and unsupported pronunciation remain explicitly unavailable rather than invented. Danger, utility and skill levels are editorial browsing aids.

The four Tolkien entries remain private drafts: Mellon; Naur an edraith ammen; Annon edhellen, edro hi ammen; and Shutting-Spell. Their descriptions and secondary references are imported, but complete primary-text review is still required before publication.

Source reviews: [original nine](catalog-originals-sources-2026-10-23.md) and [expansion entries](catalog-expansion-sources-2026-10-23.md).

## Import Artifacts

- [Pre-import catalog snapshot](../supabase/generated/catalog-before-import-2026-10-23.json) contains the nine original public-catalog placeholders, with no account or bookmark contents.
- [Applied starter SQL](../supabase/generated/catalog-starter-2026-10-23.sql) records the exact data transaction and its transaction-local approval marker.
- `node scripts/catalog-seed.cjs --publish-verified --output supabase/generated/catalog-starter-2026-10-23.sql` generates the reviewed-publication variant only; the explicit transaction-local approval marker was added for this authorized application. Generation itself never connects to the database.

The normal generator still defaults to drafts. The explicit `--publish-verified` option selects verified entries for publication; it does not overwrite existing non-placeholder entries or their publication decisions. Accepted payloads are checked with the deployed `app_private.validate_catalog_payload` function, and publication requires a verified record, continuity, a universe and matching source links. Validation and counter advancement occur before the transaction commits.

## Readback And User Growth

The committed transaction returned 17 published entries, 4 drafts, no remaining placeholders and the unchanged bookmark count. A separate request using only the configured public publishable key returned 17 published entries, 5 publicly visible universes and 19 publicly visible sources, with no missing world or source links. The remaining universe and sources belong to unpublished drafts and remain hidden by the existing policies. Catalog feed revision advanced to 102 at `2026-10-23T05:38:04.3428Z`.

The existing Contribute route, `/submit`, accepts suggestions from active signed-in accounts. My Submissions remains account-private. Live schema inspection confirmed the submission/review/catalog RPCs, own-account and Owner read policies, atomic allocation counters, current-session/Owner checks and the catalog Realtime feed. The Owner can prepare a catalog entry from a suggestion, verify it, approve it and publish it separately. This import does not make user submissions public automatically.

No sample user submission was created. No build, UI/device check, commit or deployment was run. Static HTML, social metadata and the sitemap still need the normal authorized rebuild/deployment to reflect the new catalog; current runtime browsing reads the live catalog. The current public reader has a 4,000-record window, so a substantially larger library will eventually need paginated browsing.
