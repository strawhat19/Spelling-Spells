# Spell Media

Spelling Spells keeps its full spell catalog and illustration metadata in the app bundle. Media extends existing spell records without changing their IDs, numbers, definitions, pronunciation notes or references.

## Registry And Fields

`src/shared/models/Spell.ts` exports `SpellMedia`; each `Spell` can have an optional `media` array. `src/shared/catalog/media.ts` exports `spellMedia`, keyed by the exact spell name. `seed.ts` attaches the matching entries and freezes their objects/arrays; `spellsAPI.getCatalog()` returns independent media copies alongside the existing catalog copies.

| Field | Meaning |
| --- | --- |
| `id` | Stable media identity, such as `lumos-illustration` |
| `type` | `image` or `video` |
| `url` | Local asset path or supported media URL; videos use a direct video-resource URL |
| `alt` | Descriptive image alternative or video label |
| `caption` | Optional explanatory copy |
| `credit` | Optional creator/origin attribution |
| `sourceUrl` | Optional separate media-source link |
| `poster` | Optional video poster image |

The current registry contains one original image per spell and no video entries. Its shared caption is “Original illustration inspired by the spell’s fictional effect”; its credit is “AI-generated illustration · Spelling Spells”. These illustrations interpret fictional effects and are separate from the spell entry’s primary references.

## Local Illustrations

Web paths map to files under `public/visuals/spells/`. Native bundles use the corresponding explicit map in `src/components/SpellMedia/assets.native.ts`.

| Spell | Web Asset Path |
| --- | --- |
| Lumos | `/visuals/spells/lumos.png` |
| Fus Ro Dah | `/visuals/spells/fus-ro-dah.png` |
| Brisingr | `/visuals/spells/brisingr.png` |
| Alohomora | `/visuals/spells/alohomora.png` |
| Wingardium Leviosa | `/visuals/spells/wingardium-leviosa.png` |
| Expelliarmus | `/visuals/spells/expelliarmus.png` |
| Expecto Patronum | `/visuals/spells/expecto-patronum.png` |
| Adurna | `/visuals/spells/adurna.png` |
| Jierda | `/visuals/spells/jierda.png` |

The gallery renders configured images/videos with captions and credits. Compact card mode renders the first eligible image, without the full captions. Images show themed skeletons while pending and an unavailable state on failure. Web videos expose browser controls without autoplay; native offers an external HTTPS video link and an optional poster. Videos are direct resources rather than embedded provider pages.

## Catalog And Account Boundary

A read-only verification on October 16, 2026 confirmed that the existing Supabase project has no full spell, world, catalog or media table in `public` or `app_private`. `app_private.published_spell_ids` contains one `spell_id` column and exactly the nine IDs already used by the bundled catalog and the existing account migration. `public.saved_spells` stores private account references to those eligible IDs, with saved-state timestamps and revisions; it does not store spell content or illustrations.

The full nine spells and three worlds remain in `src/shared/catalog/seed.ts`, loaded through `spellsAPI.getCatalog()`. Media metadata remains in the name-keyed registry, and image files remain local assets. Adding media to these existing IDs does not add database content or change saved references. No database write or migration was performed for this media addition or its read-only audit. Existing account setup is documented separately in [Supabase Setup](supabase-setup.md).

`api.getHealth()` and `api.getStatus()` describe only the bundled catalog and local/session device preferences. Their success/storage fields do not measure account-service connectivity; account services expose their own connection state.

## Source Status

All nine original PNG illustrations are saved at the paths above and were visually inspected. The built-in image-generation tool, exact prompts and asset provenance are recorded in [the artwork README](../public/visuals/spells/README.md) and [the prompt set](../public/visuals/spells/IMAGEGEN-PROMPTS.md). Source review covered the model, API projection, URL handling, loading/error states and web/native integration. No tests, compiler, build, browser or native-device checks were run for this addition.
