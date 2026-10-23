# Spell Media

## Current Catalog — October 23, 2026

The runtime catalog is database-backed. The released catalog has 34 entries with image metadata and HTTPS references linked through `catalog_spell_sources`: 30 published and four Tolkien research drafts. The [thirteen-entry addition](catalog-additions-2026-10-23.md) appended illustrated, referenced spells after the earlier 21-entry media release documented below. All previous entries and the four draft publication decisions were preserved.

The local catalog provides one original illustration for each entry. All 34 PNGs total 89,465,005 bytes. Images are 1672 × 941, except Astral Projection, Shutting-Spell and Petrificus Totalus at 1672 × 940. The original nine assets and their metadata are unchanged. The twelve images from the earlier media release and thirteen subsequent additions were generated individually with the built-in image-generation tool and visually inspected.

Final deployment `dpl_ASW6zhGEdHaypsdxFHDfMKq23NCq` is Ready and confirmed behind [the production site](https://spelling-spells.vercel.app). Its anonymous static snapshot contains 30 entries and five universes. [Final image evidence](../supabase/generated/catalog-additions-final-hosted-2026-10-23.json) confirms all 34 PNGs returned HTTP 200 with matching byte counts and SHA-256 hashes. [Served-page evidence](../supabase/generated/catalog-additions-pages-2026-10-23.json) confirms all 30 public detail pages contain the correct accessible heading, their own image element and all saved reference links. These are HTTP checks, not browser or native UI checks.

## Registry And Rendering

`src/shared/models/Spell.ts` defines `SpellMedia`. The name-keyed registry in `src/shared/catalog/media.ts` supplies media for the original seed and expansion builders. Explicit expansion media, including an empty array, takes precedence over the registry.

Web files live under `public/visuals/spells/`. Native uses the literal require map in `src/components/SpellMedia/assets.native.ts`. Existing cards show the first image; detail views show the gallery, alternative text, captions and credits. Existing URL handling, loading skeletons and unavailable states remain in place.

The credit is “AI-generated illustration · Spelling Spells”; the caption is “Original illustration inspired by the spell’s fictional effect”. These are original interpretations, not official franchise images. Spell references remain separate from art provenance: no generated image claims a publisher reference as its `sourceUrl`.

[The artwork README](../public/visuals/spells/README.md) links exact prompts and original generated paths. [The earlier media manifest](../supabase/generated/catalog-media-manifest-2026-10-23.json) records the first 21 identities, media values, dimensions, byte counts and SHA-256 hashes; [the additions manifest](../supabase/generated/catalog-additions-2026-10-23.json) records the subsequent thirteen.

## Source Coverage

Existing source records, URLs, ordering and entry/source links are preserved. The [original source review](catalog-originals-sources-2026-10-23.md) and [expansion source review](catalog-expansion-sources-2026-10-23.md) describe each entry’s supported scope.

| Entry(s) | Reference Containing The Spell Or Ability |
| --- | --- |
| Lumos | [Official Wand-Lighting Charm fact file](https://www.harrypotter.com/fact-file/spells/the-wand-lighting-charm) |
| Fus Ro Dah | [Bethesda language interview](https://elderscrolls.bethesda.net/en-AU/news/1rL4bCScN6RYXaXQb4ownj/how-bethesda-game-studios-made-skyrims-dragon-language), Lending A Voice |
| Brisingr | [Paolini FAQ](https://www.paolini.net/faq/), ancient-language question |
| Alohomora; Wingardium Leviosa | [Official Philosopher’s Stone spell guide](https://www.harrypotter.com/features/guide-to-the-spells-creatures-and-potions-of-philosophers-stone) |
| Expelliarmus | [Official signature-spell feature](https://www.harrypotter.com/features/expelliarmus-exploring-harry-potters-signature-spell) |
| Expecto Patronum | [Official Patronus feature](https://www.harrypotter.com/features/what-is-a-patronus) |
| Adurna; Jierda | [Author’s dictionary](https://www.paolini.net/fans/invented-languages-inheritance-cycle/ancient-language/english-ancient-language-dictionary/), water and break/hit rows |
| Crimson Bands of Cyttorak | [Marvel Cyttorak history](https://www.marvel.com/articles/comics/cyttorak-history-hosts-juggernaut-cain-marko-colossus-doctor-strange?linkId=208887688), Who Is Cyttorak? |
| Shield of the Seraphim; Winds of Watoomb | [Official Tony’s Workshop PDF](https://cdn.marvel.com/u/prod/marvel/i/pdf/MMRPG_Tonys_Workshop_20250327.pdf), PDF pages 1–2 |
| Astral Projection | [Official on-screen Strange profile](https://www.marvel.com/characters/doctor-strange-stephen-strange/on-screen?mobile-app=true&theme=dark%2F1000), Tools Of The Trade / Strange Tales |
| Mellon | [Doors of Durin secondary reference](https://tolkiengateway.net/wiki/Doors_of_Durin), History |
| Naur an edraith ammen; Annon edhellen, edro hi ammen | [Parf Edhellen’s ammen entry](https://www.elfdict.com/w/ammen), phrases with Tolkien bibliography locators |
| Shutting-Spell | [Forest-Hill’s Connotations journal article](https://www.connotations.de/article/lynn-forest-hill-hey-dol-merry-dol-tom-bombadils-nonsense-or-tolkiens-creative-uncertainty-a-response-to-thomas-kullmann/), Strangeness And Nonsense, page 95 explicitly names the working |
| Soul Self; Empathy; Empathic Healing | [Official DC Universe Online Raven spotlight](https://www.dcuniverseonline.com/news/2013-august-20-raven-character-spotlight-dcuo) |
| Azarath Metrion Zinthos | [McDuffie’s Fear Itself script](https://dwaynemcduffie.com/wp-content/uploads/2025/06/WEBSITE_TT_ep205_Fear_Itself_SCRIPT_D2.pdf), PDF page 5 / printed page 5 |

The two Marvel HTML pages return HTTP 403 to direct research fetches; their official indexed text was inspectable and contains the named abilities. The Marvel PDF and DC/script references were accessible. Forest-Hill’s secondary journal article directly returned HTTP 200 and explicitly names Gandalf’s shutting-spell behind the Chamber of Mazarbul door. No easily available complete lawful primary-text passage was inspected for the four Tolkien candidates; they remain drafts. A source link does not change verification or publication status.

The journal reference was added to the live Shutting-Spell draft through [the reference-only transaction](../supabase/operations/catalog-shutting-spell-source-2026-10-23.sql). Atomic source allocation created Source 23; the existing chapter reference remains first. That transaction raised the draft to revision 2; the subsequent media update raised it to revision 3. Live source IDs, its source projection and the entry/source join agree. The reference transaction changed no schema, role or publication status. The seed remains the original import baseline; runtime references come from the live catalog.

## Earlier 21-Entry Media Release

[The before snapshot](../supabase/generated/catalog-before-media-2026-10-23.json) contains only catalog identities, media and reference metadata, with no account data.

[The approved media SQL](../supabase/operations/catalog-media-2026-10-23.sql) was committed after image publication, with its approval marker set locally to the transaction. It updated only the twelve empty media arrays and their revisions/timestamps. It preserved identities, publication statuses, sources, definitions and all other payload fields. Its row locks, revision/identity/status/existing-media guards and deployed payload validator were retained. The Shutting-Spell guard expected revision 2 after the reference addition. No schema or catalog reimport was performed.

Vercel deployment `dpl_8XETdCPJfjHUQMvd5H8rnnUh3DA1` built successfully and was promoted to [the production site](https://spelling-spells.vercel.app). Before the database update, GET requests to all 21 registered image paths returned HTTP 200 with SHA-256 hashes matching the local manifest. The same resource checks passed again on the final post-update deployment; [hosted image evidence](../supabase/generated/catalog-media-hosted-2026-10-23.json) records that final readback.

The first staging build failed because an unanchored `supabase/` ignore rule also excluded client modules under `src/shared/supabase/`; it was not promoted. The corrected root-anchored `/supabase/` rule excludes operational files while retaining those modules. The deployment also excludes local evidence, instructions and artwork prompt Markdown while keeping all PNGs and required build scripts.

The post-update build `dpl_2XoMhbRmFMFMeix21xmcJSMFeeVG` at [the deployment URL](https://spelling-spells-3voi2n5ih-piratechs.vercel.app) became Ready and was confirmed behind the production site for that release. Its 54-second build finalized an anonymous static snapshot with 17 published entries and five universes after the database media update. The thirteen-entry release above supersedes that production deployment.

## Earlier Media Evidence And Limits

Local artifact review confirms 21 media records and 21 corresponding PNG files, with dimensions and hashes in the manifest. Generation agents visually inspected each new final asset. [The applied-transaction evidence](../supabase/generated/catalog-media-applied-2026-10-23.json) confirms twelve updated entries, 21 with images, 21 with source references, 17 published and four drafts. Full before/after payload comparison found no non-media, identity, publication-status or source-join differences.

[The public-key readback](../supabase/generated/catalog-media-public-2026-10-23.json) returned 17 published entries, each with an image and source reference, 19 visible sources and no drafts. It also confirmed the revision-1 global Theme Toggle policy enabled for Guest and above. Hosted resource and database checks establish availability and persisted state; they do not establish browser rendering or interactions.

[Served-page evidence](../supabase/generated/catalog-media-pages-2026-10-23.json) confirms all 17 published detail URLs returned HTTP 200 with the correct accessible heading, the entry’s own image element and every saved reference as a link. The check excludes the decorative aria-hidden heading copy. The public build manifest is an anonymous snapshot of 17 published entries. This inspects HTTP markup, not browser paint, animation or interaction.

No local test suite, standalone compiler check, browser/native UI checks, authenticated management flow or commit was run for this release. The successful final Vercel build, confirmed production deployment, hosted image requests, served HTML and database readbacks are the release evidence.
