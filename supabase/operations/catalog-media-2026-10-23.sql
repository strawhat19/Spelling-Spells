-- Applied to qtfajiuilwdtywkklbjq on 2026-10-23 after image publication and user release approval.
-- Historical single-use transaction; do not reapply against the advanced revisions.
-- Existing identities, publication status, sources and other payload fields stay unchanged.
begin;
set local spelling_spells.catalog_media_approved = 'APPROVED_MEDIA_RELEASE';
set local lock_timeout = '5s';
set local statement_timeout = '30s';
do $media_update$
declare
  requested record;
  saved public.catalog_spells%rowtype;
begin
  if current_setting('spelling_spells.catalog_media_approved', true) is distinct from 'APPROVED_MEDIA_RELEASE' then
    raise exception 'Catalog Media Release Requires Approval And Published Image Files';
  end if;
  for requested in select * from jsonb_to_recordset($media_manifest$
[
  {
    "id": "Spell_10_Crimson-Bands-of-Cyttorak_2026-10-21_f8a2d690-8ca7-4d06-9a86-32c5cb004010",
    "number": 10,
    "name": "Crimson Bands of Cyttorak",
    "slug": "crimson-bands-of-cyttorak",
    "status": "published",
    "revision": 1,
    "media": [
      {
        "alt": "Luminous crimson binding bands tightly encircling a weathered stone pillar",
        "type": "image",
        "id": "crimson-bands-of-cyttorak-illustration",
        "url": "/visuals/spells/crimson-bands-of-cyttorak.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ]
  },
  {
    "id": "Spell_11_Shield-of-the-Seraphim_2026-10-21_f8a2d690-8ca7-4d06-9a86-32c5cb004011",
    "number": 11,
    "name": "Shield of the Seraphim",
    "slug": "shield-of-the-seraphim",
    "status": "published",
    "revision": 1,
    "media": [
      {
        "alt": "A circular golden-orange magical shield scattering incoming blue-violet sparks",
        "type": "image",
        "id": "shield-of-the-seraphim-illustration",
        "url": "/visuals/spells/shield-of-the-seraphim.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ]
  },
  {
    "id": "Spell_12_Winds-of-Watoomb_2026-10-21_f8a2d690-8ca7-4d06-9a86-32c5cb004012",
    "number": 12,
    "name": "Winds of Watoomb",
    "slug": "winds-of-watoomb",
    "status": "published",
    "revision": 1,
    "media": [
      {
        "alt": "A teal and gold magical wind funnel lifting debris through a ruined stone courtyard",
        "type": "image",
        "id": "winds-of-watoomb-illustration",
        "url": "/visuals/spells/winds-of-watoomb.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ]
  },
  {
    "id": "Spell_13_Astral-Projection_2026-10-21_f8a2d690-8ca7-4d06-9a86-32c5cb004013",
    "number": 13,
    "name": "Astral Projection",
    "slug": "astral-projection",
    "status": "published",
    "revision": 1,
    "media": [
      {
        "alt": "A pale-blue astral silhouette rising from a resting robed figure in a violet sanctum",
        "type": "image",
        "id": "astral-projection-illustration",
        "url": "/visuals/spells/astral-projection.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ]
  },
  {
    "id": "Spell_14_Mellon_2026-10-21_f8a2d690-8ca7-4d06-9a86-32c5cb004014",
    "number": 14,
    "name": "Mellon",
    "slug": "mellon",
    "status": "draft",
    "revision": 1,
    "media": [
      {
        "alt": "A moonlit stone doorway with silver tree and star motifs and a narrow welcoming seam of light",
        "type": "image",
        "id": "mellon-illustration",
        "url": "/visuals/spells/mellon.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ]
  },
  {
    "id": "Spell_15_Naur-an-edraith-ammen_2026-10-21_f8a2d690-8ca7-4d06-9a86-32c5cb004015",
    "number": 15,
    "name": "Naur an edraith ammen",
    "slug": "naur-an-edraith-ammen",
    "status": "draft",
    "revision": 1,
    "media": [
      {
        "alt": "An amber campfire flaring among snowy ground and wet ancient tree roots at night",
        "type": "image",
        "id": "naur-an-edraith-ammen-illustration",
        "url": "/visuals/spells/naur-an-edraith-ammen.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ]
  },
  {
    "id": "Spell_16_Annon-edhellen-edro-hi-ammen_2026-10-21_f8a2d690-8ca7-4d06-9a86-32c5cb004016",
    "number": 16,
    "name": "Annon edhellen, edro hi ammen",
    "slug": "annon-edhellen-edro-hi-ammen",
    "status": "draft",
    "revision": 1,
    "media": [
      {
        "alt": "A cloaked traveler raising a hand toward a firmly closed stone gate with a faint silver-blue spell glimmer",
        "type": "image",
        "id": "annon-edhellen-edro-hi-ammen-illustration",
        "url": "/visuals/spells/annon-edhellen-edro-hi-ammen.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ]
  },
  {
    "id": "Spell_17_Shutting-Spell_2026-10-21_f8a2d690-8ca7-4d06-9a86-32c5cb004017",
    "number": 17,
    "name": "Shutting-Spell",
    "slug": "shutting-spell",
    "status": "draft",
    "revision": 2,
    "media": [
      {
        "alt": "Violet binding light sealing an old stone door against an orange glow beyond",
        "type": "image",
        "id": "shutting-spell-illustration",
        "url": "/visuals/spells/shutting-spell.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ]
  },
  {
    "id": "Spell_18_Soul-Self_2026-10-21_f8a2d690-8ca7-4d06-9a86-32c5cb004018",
    "number": 18,
    "name": "Soul Self",
    "slug": "soul-self",
    "status": "published",
    "revision": 1,
    "media": [
      {
        "alt": "A vast violet spectral raven spreading its wings above a seated hooded figure",
        "type": "image",
        "id": "soul-self-illustration",
        "url": "/visuals/spells/soul-self.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ]
  },
  {
    "id": "Spell_19_Empathy_2026-10-21_f8a2d690-8ca7-4d06-9a86-32c5cb004019",
    "number": 19,
    "name": "Empathy",
    "slug": "empathy",
    "status": "published",
    "revision": 1,
    "media": [
      {
        "alt": "Two robed figures linked by violet and gold light across a moonlit ruined garden",
        "type": "image",
        "id": "empathy-illustration",
        "url": "/visuals/spells/empathy.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ]
  },
  {
    "id": "Spell_20_Empathic-Healing_2026-10-21_f8a2d690-8ca7-4d06-9a86-32c5cb004020",
    "number": 20,
    "name": "Empathic Healing",
    "slug": "empathic-healing",
    "status": "published",
    "revision": 1,
    "media": [
      {
        "alt": "A hooded healer drawing violet light from a seated traveler's injured forearm",
        "type": "image",
        "id": "empathic-healing-illustration",
        "url": "/visuals/spells/empathic-healing.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ]
  },
  {
    "id": "Spell_21_Azarath-Metrion-Zinthos_2026-10-21_f8a2d690-8ca7-4d06-9a86-32c5cb004021",
    "number": 21,
    "name": "Azarath Metrion Zinthos",
    "slug": "azarath-metrion-zinthos",
    "status": "published",
    "revision": 1,
    "media": [
      {
        "alt": "A hovering hooded figure holding a violet energy orb in a ruined stone hall",
        "type": "image",
        "id": "azarath-metrion-zinthos-illustration",
        "url": "/visuals/spells/azarath-metrion-zinthos.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ]
  }
]
$media_manifest$::jsonb)
    as entry(id text, number bigint, name text, slug text, status text, revision bigint, media jsonb)
  loop
    select * into saved from public.catalog_spells where id = requested.id for update;
    if not found then raise exception 'Catalog Entry Missing: %', requested.name; end if;
    if saved.number is distinct from requested.number or saved.name is distinct from requested.name
      or saved.slug is distinct from requested.slug or saved.status is distinct from requested.status
      or saved.revision is distinct from requested.revision
      or coalesce(nullif(saved.payload -> 'media', 'null'::jsonb), '[]'::jsonb) <> '[]'::jsonb then
      raise exception 'Catalog Entry Changed; Review Before Adding Media: %', requested.name;
    end if;
    perform app_private.validate_catalog_payload(jsonb_set(saved.payload, '{media}', requested.media, true));
    update public.catalog_spells set
      payload = jsonb_set(payload, '{media}', requested.media, true),
      revision = revision + 1, updated_at = clock_timestamp()
    where id = requested.id;
  end loop;
end;
$media_update$;
commit;
