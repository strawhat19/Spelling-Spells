-- Applied October 23, 2026 after explicit release approval and publication of the thirteen image resources.
-- Appends thirteen reviewed entries; existing records, publication decisions and references are untouched.
-- Historical approved operation; baseline guards reject replay against the released catalog.
begin;
set local spelling_spells.catalog_additions_approved = 'APPROVED_THIRTEEN_SPELLS';
set local lock_timeout = '5s';
set local statement_timeout = '30s';
do $append_spells$
declare
  entry jsonb;
  reference jsonb;
  source_ids jsonb;
  saved_payload jsonb;
  source_number bigint;
  spell_counter bigint;
  resolved_source_id text;
begin
  if current_setting('spelling_spells.catalog_additions_approved', true) is distinct from 'APPROVED_THIRTEEN_SPELLS' then
    raise exception 'The Thirteen-Spell Release Requires Approval And Published Images';
  end if;
  perform 1 from app_private.counters where name in ('catalog_sources', 'catalog_spells') order by name for update;
  if (select count(*) from app_private.counters where name in ('catalog_sources', 'catalog_spells')) <> 2 then
    raise exception 'Catalog Allocation Counters Missing';
  end if;
  select number into spell_counter from app_private.counters where name = 'catalog_spells';
  if spell_counter is distinct from 21 or (select coalesce(max(number), 0) from public.catalog_spells) <> 21
    or (select count(*) from public.catalog_spells) <> 21 then
    raise exception 'Catalog Changed Or Batch Already Added; Review Before Allocating Numbers 22 Through 34';
  end if;
  update app_private.counters set number = number + 13 where name = 'catalog_spells';
  for entry in select value from jsonb_array_elements($additional_spell_payloads$
[
  {
    "syllables": [],
    "breakdown": [],
    "pronunciation": "",
    "etymologyStatus": "Unconfirmed",
    "pronunciationStatus": "unavailable",
    "etymology": "Etymology has not been independently established for this entry.",
    "pronunciationNote": "No supported phonetic transcription was inspected for this entry. No pronunciation is asserted.",
    "number": 22,
    "danger": 2,
    "utility": 5,
    "name": "Accio",
    "slug": "accio",
    "kind": "Charm",
    "accent": "wind",
    "medium": "Books",
    "category": "Summoning",
    "skill": "Intermediate",
    "entryType": "spell",
    "worldId": "harry-potter",
    "casters": [
      "Harry Potter"
    ],
    "aliases": [
      "Summoning Charm"
    ],
    "evidenceStatus": "verified",
    "language": "Fictional incantation",
    "sourceTitle": "Harry Potter and the Goblet of Fire",
    "continuity": "Harry Potter · Goblet of Fire (Book)",
    "effect": "Draws an object toward the spell caster",
    "definition": "The Summoning Charm brings a chosen object to the caster.",
    "usage": "Harry uses the charm to fetch his Firebolt during the Triwizard Tournament. The official fact file notes that distraction can prevent a successful cast.",
    "sources": [
      {
        "label": "HarryPotter.com · The Summoning Charm (Accio)",
        "url": "https://www.harrypotter.com/fact-file/spells/the-summoning-charm"
      },
      {
        "label": "HarryPotter.com · Why Latin Was So Important To The Harry Potter Books",
        "url": "https://www.harrypotter.com/features/why-latin-was-so-important-to-the-harry-potter-books"
      }
    ],
    "media": [
      {
        "alt": "A summoned object flying toward an outstretched hand",
        "type": "image",
        "id": "accio-illustration",
        "url": "/visuals/spells/accio.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ],
    "id": "Spell_22_Accio_2026-10-23_9f30574b-478e-461c-959e-000000000022",
    "sourceIds": []
  },
  {
    "syllables": [],
    "breakdown": [],
    "pronunciation": "",
    "etymologyStatus": "Unconfirmed",
    "pronunciationStatus": "unavailable",
    "etymology": "Etymology has not been independently established for this entry.",
    "pronunciationNote": "No supported phonetic transcription was inspected for this entry. No pronunciation is asserted.",
    "number": 23,
    "danger": 1,
    "utility": 5,
    "name": "Reparo",
    "slug": "reparo",
    "kind": "Charm",
    "accent": "light",
    "medium": "Books",
    "skill": "Beginner",
    "category": "Repair",
    "entryType": "spell",
    "worldId": "harry-potter",
    "aliases": [
      "Mending Charm"
    ],
    "casters": [
      "Harry Potter"
    ],
    "evidenceStatus": "verified",
    "language": "Fictional incantation",
    "sourceTitle": "Harry Potter and the Half-Blood Prince",
    "continuity": "Harry Potter · Half-Blood Prince (Book)",
    "effect": "Mends certain broken or torn objects",
    "definition": "A charm that repairs physical damage to an object.",
    "usage": "Harry rejoins the covers of Advanced Potion-Making with Reparo. Repairing an object's exterior does not necessarily restore damaged magic within it.",
    "sources": [
      {
        "label": "HarryPotter.com · The Mending Charm (Reparo)",
        "url": "https://www.harrypotter.com/fact-file/spells/the-mending-charm"
      },
      {
        "label": "HarryPotter.com · Why Latin Was So Important To The Harry Potter Books",
        "url": "https://www.harrypotter.com/features/why-latin-was-so-important-to-the-harry-potter-books"
      }
    ],
    "media": [
      {
        "alt": "Broken pieces joining together in a glow of repair magic",
        "type": "image",
        "id": "reparo-illustration",
        "url": "/visuals/spells/reparo.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ],
    "id": "Spell_23_Reparo_2026-10-23_9f30574b-478e-461c-959e-000000000023",
    "sourceIds": []
  },
  {
    "syllables": [],
    "breakdown": [],
    "pronunciation": "",
    "etymologyStatus": "Unconfirmed",
    "pronunciationStatus": "unavailable",
    "etymology": "Etymology has not been independently established for this entry.",
    "pronunciationNote": "No supported phonetic transcription was inspected for this entry. No pronunciation is asserted.",
    "number": 24,
    "danger": 1,
    "utility": 5,
    "casters": [],
    "name": "Protego",
    "slug": "protego",
    "kind": "Charm",
    "medium": "Books",
    "accent": "shield",
    "category": "Defense",
    "skill": "Intermediate",
    "entryType": "spell",
    "aliases": [
      "Shield Charm"
    ],
    "worldId": "harry-potter",
    "evidenceStatus": "verified",
    "language": "Fictional incantation",
    "sourceTitle": "Harry Potter and the Order of the Phoenix",
    "continuity": "Harry Potter · Order of the Phoenix (Book)",
    "effect": "Deflects or reduces the effect of certain incoming spells",
    "definition": "The Shield Charm forms an invisible defense around its caster.",
    "usage": "Members of Dumbledore's Army learn the charm for protection. The cited reference distinguishes this individual shield from wider-area variants; it does not promise protection against every spell.",
    "sources": [
      {
        "label": "HarryPotter.com · The Shield Charm (Protego)",
        "url": "https://www.harrypotter.com/fact-file/spells/the-shield-charm"
      }
    ],
    "media": [
      {
        "alt": "A luminous shield intercepting incoming magical sparks",
        "type": "image",
        "id": "protego-illustration",
        "url": "/visuals/spells/protego.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ],
    "id": "Spell_24_Protego_2026-10-23_9f30574b-478e-461c-959e-000000000024",
    "sourceIds": []
  },
  {
    "syllables": [],
    "breakdown": [],
    "pronunciation": "",
    "etymologyStatus": "Unconfirmed",
    "pronunciationStatus": "unavailable",
    "etymology": "Etymology has not been independently established for this entry.",
    "pronunciationNote": "No supported phonetic transcription was inspected for this entry. No pronunciation is asserted.",
    "number": 25,
    "danger": 4,
    "utility": 3,
    "name": "Stupefy",
    "slug": "stupefy",
    "accent": "wand",
    "medium": "Books",
    "category": "Stunning",
    "entryType": "spell",
    "skill": "Intermediate",
    "kind": "Stunning Spell",
    "worldId": "harry-potter",
    "aliases": [
      "Stunning Spell"
    ],
    "casters": [
      "Harry Potter"
    ],
    "evidenceStatus": "verified",
    "language": "Fictional incantation",
    "sourceTitle": "Harry Potter and the Goblet of Fire",
    "continuity": "Harry Potter · Goblet of Fire (Book)",
    "effect": "Renders a susceptible target unconscious",
    "definition": "A Stunning Spell used to incapacitate a target.",
    "usage": "Harry casts Stupefy at a Blast-Ended Skrewt in the maze, but its armour reflects the spell. The official spell guide notes that Stunning Spells can also cause injury, particularly when several strike together.",
    "sources": [
      {
        "label": "HarryPotter.com · Your Guide To The Best Spells, Stupefy",
        "url": "https://www.harrypotter.com/features/your-guide-to-the-best-spells-in-harry-potter"
      },
      {
        "label": "HarryPotter.com · Triwizard Tournament Moments, Skrewt Excerpt",
        "url": "https://www.harrypotter.com/features/twelve-of-our-favourite-moments-from-the-triwizard-tournament-tasks"
      }
    ],
    "media": [
      {
        "alt": "A red stunning spell directed toward an armored training dummy",
        "type": "image",
        "id": "stupefy-illustration",
        "url": "/visuals/spells/stupefy.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ],
    "id": "Spell_25_Stupefy_2026-10-23_9f30574b-478e-461c-959e-000000000025",
    "sourceIds": []
  },
  {
    "syllables": [],
    "breakdown": [],
    "pronunciation": "",
    "etymologyStatus": "Unconfirmed",
    "pronunciationStatus": "unavailable",
    "etymology": "Etymology has not been independently established for this entry.",
    "pronunciationNote": "No supported phonetic transcription was inspected for this entry. No pronunciation is asserted.",
    "number": 26,
    "danger": 1,
    "utility": 3,
    "aliases": [],
    "casters": [],
    "medium": "Books",
    "accent": "wand",
    "skill": "Intermediate",
    "name": "Riddikulus",
    "slug": "riddikulus",
    "category": "Defense",
    "entryType": "spell",
    "worldId": "harry-potter",
    "evidenceStatus": "verified",
    "kind": "Boggart-Banishing Charm",
    "language": "Fictional incantation",
    "sourceTitle": "Harry Potter and the Prisoner of Azkaban",
    "effect": "Gives a Boggart a comic form so laughter can make it disappear.",
    "definition": "A charm used to turn a frightening Boggart into something amusing.",
    "continuity": "Harry Potter Book Continuity · Harry Potter and the Prisoner of Azkaban",
    "usage": "Lupin teaches the charm in his class. Rowling's account explains that the caster laughs at the changed Boggart to make it disappear. The described target is a Boggart; this entry does not generalize the charm to unrelated creatures.",
    "sources": [
      {
        "label": "J.K. Rowling · Boggart, Original Writing",
        "url": "https://www.harrypotter.com/writing-by-jk-rowling/boggart"
      },
      {
        "label": "Official Harry Potter Encyclopedia · Boggart-Banishing Charm",
        "url": "https://www.harrypotter.com/fact-file/spells/the-boggart-banishing-charm"
      }
    ],
    "media": [
      {
        "alt": "A frightening apparition transformed into a comical shape",
        "type": "image",
        "id": "riddikulus-illustration",
        "url": "/visuals/spells/riddikulus.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ],
    "id": "Spell_26_Riddikulus_2026-10-23_9f30574b-478e-461c-959e-000000000026",
    "sourceIds": []
  },
  {
    "syllables": [],
    "breakdown": [],
    "pronunciation": "",
    "etymologyStatus": "Unconfirmed",
    "pronunciationStatus": "unavailable",
    "etymology": "Etymology has not been independently established for this entry.",
    "pronunciationNote": "No supported phonetic transcription was inspected for this entry. No pronunciation is asserted.",
    "number": 27,
    "danger": 1,
    "utility": 4,
    "name": "Nox",
    "slug": "nox",
    "aliases": [],
    "skill": "Beginner",
    "medium": "Books",
    "accent": "light",
    "category": "Light",
    "entryType": "spell",
    "worldId": "harry-potter",
    "evidenceStatus": "verified",
    "kind": "Wand-Extinguishing Charm",
    "language": "Fictional incantation",
    "casters": [
      "Harry Potter",
      "Hermione Granger"
    ],
    "effect": "Turns off the magical light at the tip of the caster's wand.",
    "definition": "The counter-charm that ends the wand illumination produced by Lumos.",
    "sourceTitle": "Harry Potter and the Prisoner of Azkaban",
    "continuity": "Harry Potter Book Continuity · Harry Potter and the Prisoner of Azkaban",
    "usage": "The official reference associates Harry and Hermione with extinguishing their wand lights near the Shrieking Shack. This entry describes ending Lumos rather than creating a wider field of darkness.",
    "sources": [
      {
        "label": "Official Harry Potter Encyclopedia · Wand-Extinguishing Charm",
        "url": "https://www.harrypotter.com/fact-file/spells/the-wand-extinguishing-charm"
      }
    ],
    "media": [
      {
        "alt": "A wand's last point of light fading in a dark archive",
        "type": "image",
        "id": "nox-illustration",
        "url": "/visuals/spells/nox.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ],
    "id": "Spell_27_Nox_2026-10-23_9f30574b-478e-461c-959e-000000000027",
    "sourceIds": []
  },
  {
    "syllables": [],
    "breakdown": [],
    "pronunciation": "",
    "etymologyStatus": "Unconfirmed",
    "pronunciationStatus": "unavailable",
    "etymology": "Etymology has not been independently established for this entry.",
    "pronunciationNote": "No supported phonetic transcription was inspected for this entry. No pronunciation is asserted.",
    "number": 28,
    "danger": 3,
    "utility": 3,
    "aliases": [],
    "skill": "Beginner",
    "medium": "Books",
    "accent": "shield",
    "category": "Binding",
    "entryType": "spell",
    "worldId": "harry-potter",
    "kind": "Full-Body Bind Curse",
    "evidenceStatus": "verified",
    "name": "Petrificus Totalus",
    "slug": "petrificus-totalus",
    "casters": [
      "Hermione Granger"
    ],
    "language": "Fictional incantation",
    "sourceTitle": "Harry Potter and the Philosopher's Stone",
    "definition": "A curse that temporarily holds a person's body motionless.",
    "effect": "Immobilizes the body while leaving the person's eyes able to move.",
    "continuity": "Harry Potter Book Continuity · Harry Potter and the Philosopher's Stone",
    "usage": "Hermione uses the curse on Neville when he tries to stop the trio leaving their common room. The official account describes temporary paralysis; this is not a transformation of the target into stone.",
    "sources": [
      {
        "label": "Official Harry Potter Encyclopedia · Full-Body Bind",
        "url": "https://www.harrypotter.com/fact-file/spells/the-full-body-bind"
      }
    ],
    "media": [
      {
        "alt": "A wooden training figure held motionless by binding magic",
        "type": "image",
        "id": "petrificus-totalus-illustration",
        "url": "/visuals/spells/petrificus-totalus.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ],
    "id": "Spell_28_Petrificus-Totalus_2026-10-23_9f30574b-478e-461c-959e-000000000028",
    "sourceIds": []
  },
  {
    "syllables": [],
    "breakdown": [],
    "pronunciation": "",
    "etymologyStatus": "Unconfirmed",
    "pronunciationStatus": "unavailable",
    "etymology": "Etymology has not been independently established for this entry.",
    "pronunciationNote": "No supported phonetic transcription was inspected for this entry. No pronunciation is asserted.",
    "number": 29,
    "danger": 2,
    "utility": 2,
    "aliases": [],
    "skill": "Beginner",
    "medium": "Books",
    "accent": "wand",
    "name": "Rictusempra",
    "slug": "rictusempra",
    "entryType": "spell",
    "category": "Distraction",
    "kind": "Tickling Charm",
    "casters": [
      "Harry Potter"
    ],
    "worldId": "harry-potter",
    "evidenceStatus": "verified",
    "language": "Fictional incantation",
    "sourceTitle": "Harry Potter and the Chamber of Secrets",
    "effect": "Produces a tickling sensation that makes the target laugh.",
    "definition": "A charm that distracts its target through magical tickling.",
    "continuity": "Harry Potter Book Continuity · Harry Potter and the Chamber of Secrets",
    "usage": "The official guides identify Harry using it on Draco during Duelling Club. This entry records laughter from tickling without claiming a particular visible projectile, spell color or range.",
    "sources": [
      {
        "label": "Official Harry Potter · Best Spells Guide, Rictusempra",
        "url": "https://www.harrypotter.com/features/your-guide-to-the-best-spells-in-harry-potter"
      },
      {
        "label": "Official Harry Potter · Lesser-Known Spells, Rictusempra",
        "url": "https://www.harrypotter.com/features/a-handy-guide-to-the-lesser-known-spells-in-the-wizarding-world"
      }
    ],
    "media": [
      {
        "alt": "A fully clothed wizard laughing amid curling magical wisps",
        "type": "image",
        "id": "rictusempra-illustration",
        "url": "/visuals/spells/rictusempra.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ],
    "id": "Spell_29_Rictusempra_2026-10-23_9f30574b-478e-461c-959e-000000000029",
    "sourceIds": []
  },
  {
    "syllables": [],
    "breakdown": [],
    "pronunciation": "",
    "etymologyStatus": "Unconfirmed",
    "pronunciationStatus": "unavailable",
    "etymology": "Etymology has not been independently established for this entry.",
    "pronunciationNote": "No supported phonetic transcription was inspected for this entry. No pronunciation is asserted.",
    "number": 30,
    "danger": 3,
    "utility": 4,
    "aliases": [],
    "casters": [],
    "name": "Incendio",
    "slug": "incendio",
    "medium": "Books",
    "accent": "fire",
    "category": "Fire",
    "skill": "Beginner",
    "entryType": "spell",
    "worldId": "harry-potter",
    "kind": "Fire-Making Spell",
    "evidenceStatus": "verified",
    "sourceTitle": "Harry Potter Series",
    "language": "Fictional incantation",
    "effect": "Conjures fire.",
    "definition": "A fire-making spell identified by the official Harry Potter editorial guide.",
    "continuity": "Harry Potter · Official Series Editorial Overview, Useful Spells for Winter",
    "usage": "The official winter guide describes using Incendio to make a warming fire. This entry does not identify it with Hermione's separate Bluebell Flame charm or assert a particular book scene.",
    "sources": [
      {
        "label": "HarryPotter.com · Useful Spells for Winter, Incendio Section",
        "url": "https://www.harrypotter.com/features/useful-spells-for-winter"
      }
    ],
    "media": [
      {
        "alt": "Magical fire glowing in an old stone hearth",
        "type": "image",
        "id": "incendio-illustration",
        "url": "/visuals/spells/incendio.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ],
    "id": "Spell_30_Incendio_2026-10-23_9f30574b-478e-461c-959e-000000000030",
    "sourceIds": []
  },
  {
    "syllables": [],
    "breakdown": [],
    "pronunciation": "",
    "etymologyStatus": "Unconfirmed",
    "pronunciationStatus": "unavailable",
    "etymology": "Etymology has not been independently established for this entry.",
    "pronunciationNote": "No supported phonetic transcription was inspected for this entry. No pronunciation is asserted.",
    "number": 31,
    "danger": 1,
    "utility": 5,
    "aliases": [],
    "casters": [],
    "medium": "Books",
    "accent": "wand",
    "name": "Aguamenti",
    "slug": "aguamenti",
    "category": "Water",
    "skill": "Advanced",
    "entryType": "spell",
    "worldId": "harry-potter",
    "evidenceStatus": "verified",
    "kind": "Water-Conjuring Charm",
    "language": "Fictional incantation",
    "sourceTitle": "Harry Potter and the Half-Blood Prince",
    "effect": "Produces a stream of clear drinking water from a wand tip.",
    "continuity": "Harry Potter · Half-Blood Prince Book, Official Encyclopedia Summary",
    "definition": "A charm that conjures water from the caster's wand, identified by the incantation Aguamenti.",
    "usage": "The official encyclopedia lists Half-Blood Prince among its book appearances and describes the charm as N.E.W.T.-level magic. Its water does not counter magical Fiendfyre.",
    "sources": [
      {
        "label": "HarryPotter.com Encyclopedia · The Water-Conjuring Charm (Aguamenti)",
        "url": "https://www.harrypotter.com/fact-file/spells/the-water-conjuring-charm"
      }
    ],
    "media": [
      {
        "alt": "A clear stream of water pouring from a wand into a jug",
        "type": "image",
        "id": "aguamenti-illustration",
        "url": "/visuals/spells/aguamenti.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ],
    "id": "Spell_31_Aguamenti_2026-10-23_9f30574b-478e-461c-959e-000000000031",
    "sourceIds": []
  },
  {
    "syllables": [],
    "breakdown": [],
    "pronunciation": "",
    "etymologyStatus": "Unconfirmed",
    "pronunciationStatus": "unavailable",
    "etymology": "Etymology has not been independently established for this entry.",
    "pronunciationNote": "No supported phonetic transcription was inspected for this entry. No pronunciation is asserted.",
    "number": 32,
    "danger": 5,
    "utility": 3,
    "aliases": [],
    "medium": "Books",
    "accent": "light",
    "name": "Obliviate",
    "slug": "obliviate",
    "skill": "Advanced",
    "category": "Memory",
    "kind": "Memory Charm",
    "entryType": "spell",
    "worldId": "harry-potter",
    "evidenceStatus": "verified",
    "casters": [
      "Gilderoy Lockhart"
    ],
    "language": "Fictional incantation",
    "sourceTitle": "Harry Potter and the Chamber of Secrets",
    "effect": "Alters or removes memories from another person's mind.",
    "continuity": "Harry Potter · Chamber of Secrets Book, Official Encyclopedia Summary",
    "definition": "A memory-modifying charm whose effects can include serious loss of a person's recollections.",
    "usage": "The official encyclopedia names Lockhart as a specialist and lists Chamber of Secrets among the book appearances. Its severity depends on the caster; this entry makes no promise that lost memories can be restored.",
    "sources": [
      {
        "label": "HarryPotter.com Encyclopedia · The Memory Charm (Obliviate)",
        "url": "https://www.harrypotter.com/fact-file/spells/the-memory-charm"
      }
    ],
    "media": [
      {
        "alt": "Silver-violet memory threads fading around a clothed adult figure",
        "type": "image",
        "id": "obliviate-illustration",
        "url": "/visuals/spells/obliviate.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ],
    "id": "Spell_32_Obliviate_2026-10-23_9f30574b-478e-461c-959e-000000000032",
    "sourceIds": []
  },
  {
    "syllables": [],
    "breakdown": [],
    "pronunciation": "",
    "etymologyStatus": "Unconfirmed",
    "pronunciationStatus": "unavailable",
    "etymology": "Etymology has not been independently established for this entry.",
    "pronunciationNote": "No supported phonetic transcription was inspected for this entry. No pronunciation is asserted.",
    "number": 33,
    "danger": 2,
    "utility": 3,
    "aliases": [],
    "casters": [],
    "medium": "Books",
    "accent": "wind",
    "name": "Silencio",
    "slug": "silencio",
    "category": "Silencing",
    "entryType": "spell",
    "kind": "Silencing Spell",
    "skill": "Intermediate",
    "worldId": "harry-potter",
    "evidenceStatus": "verified",
    "sourceTitle": "Harry Potter Series",
    "language": "Fictional incantation",
    "effect": "Prevents its target from making sound.",
    "definition": "A silencing spell named in the official guide to useful wizarding magic.",
    "continuity": "Harry Potter · Official Series Editorial Overview, Spells All Muggles Wish Existed",
    "usage": "The official editorial guide identifies Silencio as a spell that silences someone. No duration, wand movement, reversal or particular book scene is established by the cited passage.",
    "sources": [
      {
        "label": "HarryPotter.com · Spells All Muggles Wish Existed, Silencio Section",
        "url": "https://www.harrypotter.com/features/spells-all-muggles-wish-existed-in-real-life"
      }
    ],
    "media": [
      {
        "alt": "A perched bird surrounded by a still magical silence field",
        "type": "image",
        "id": "silencio-illustration",
        "url": "/visuals/spells/silencio.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ],
    "id": "Spell_33_Silencio_2026-10-23_9f30574b-478e-461c-959e-000000000033",
    "sourceIds": []
  },
  {
    "syllables": [],
    "breakdown": [],
    "pronunciation": "",
    "etymologyStatus": "Unconfirmed",
    "pronunciationStatus": "unavailable",
    "etymology": "Etymology has not been independently established for this entry.",
    "pronunciationNote": "No supported phonetic transcription was inspected for this entry. No pronunciation is asserted.",
    "number": 34,
    "danger": 4,
    "utility": 3,
    "aliases": [],
    "name": "Reducto",
    "slug": "reducto",
    "medium": "Books",
    "accent": "wand",
    "entryType": "spell",
    "skill": "Intermediate",
    "kind": "Reductor Curse",
    "category": "Destruction",
    "worldId": "harry-potter",
    "casters": [
      "Harry Potter"
    ],
    "evidenceStatus": "verified",
    "language": "Fictional incantation",
    "sourceTitle": "Harry Potter and the Goblet of Fire",
    "effect": "Blasts solid objects into fragments.",
    "continuity": "Harry Potter · Goblet of Fire Book, Official Encyclopedia Summary",
    "definition": "A destructive curse used to break apart solid objects and surrounding structures.",
    "usage": "The official encyclopedia lists Goblet of Fire as a book appearance and describes Harry using the curse during the final Triwizard task. This entry does not add a spell colour, fixed blast radius or guaranteed effect on living targets.",
    "sources": [
      {
        "label": "HarryPotter.com Encyclopedia · The Reductor Curse (Reducto)",
        "url": "https://www.harrypotter.com/fact-file/spells/the-reductor-curse"
      }
    ],
    "media": [
      {
        "alt": "A stone block breaking into fragments under a magical blast",
        "type": "image",
        "id": "reducto-illustration",
        "url": "/visuals/spells/reducto.png",
        "credit": "AI-generated illustration · Spelling Spells",
        "caption": "Original illustration inspired by the spell’s fictional effect"
      }
    ],
    "id": "Spell_34_Reducto_2026-10-23_9f30574b-478e-461c-959e-000000000034",
    "sourceIds": []
  }
]
$additional_spell_payloads$::jsonb)
  loop
    if entry ->> 'evidenceStatus' is distinct from 'verified'
      or nullif(btrim(entry ->> 'continuity'), '') is null
      or nullif(btrim(entry ->> 'sourceTitle'), '') is null
      or nullif(btrim(entry ->> 'kind'), '') is null
      or jsonb_array_length(entry -> 'sources') < 1
      or jsonb_array_length(entry -> 'media') < 1
      or not exists (select 1 from public.catalog_universes where id = entry ->> 'worldId') then
      raise exception 'Prepare A Complete Reviewed Entry Before Publication: %', entry ->> 'name';
    end if;
    source_ids := '[]'::jsonb;
    for reference in select value from jsonb_array_elements(entry -> 'sources')
    loop
      resolved_source_id := null;
      select id into resolved_source_id from public.catalog_sources
        where url = reference ->> 'url' order by number, id limit 1;
      if resolved_source_id is null then
        update app_private.counters set number = greatest(number, (select coalesce(max(number), 0) from public.catalog_sources)) + 1
          where name = 'catalog_sources' returning number into source_number;
        resolved_source_id := app_private.catalog_id('Source', source_number, 'Reference');
        insert into public.catalog_sources (id, number, label, url, payload)
        values (resolved_source_id, source_number, reference ->> 'label', reference ->> 'url',
          reference || jsonb_build_object('kind', 'reference', 'publisher', 'www.harrypotter.com',
            'evidenceNote', 'Official reference reviewed for the bounded entry claims; see the October 23, 2026 additions source notes'));
      end if;
      source_ids := source_ids || jsonb_build_array(resolved_source_id);
    end loop;
    if (select count(distinct value) from jsonb_array_elements_text(source_ids)) <> jsonb_array_length(source_ids) then
      raise exception 'Use Distinct Entry References: %', entry ->> 'name';
    end if;
    saved_payload := jsonb_set(entry, '{sourceIds}', source_ids, true);
    perform app_private.validate_catalog_payload(saved_payload);
    insert into public.catalog_spells (id, number, slug, name, universe_id, status, payload)
    values (entry ->> 'id', (entry ->> 'number')::bigint, entry ->> 'slug', entry ->> 'name',
      entry ->> 'worldId', 'published', saved_payload);
    insert into public.catalog_spell_sources (spell_id, source_id)
      select entry ->> 'id', value from jsonb_array_elements_text(source_ids);
  end loop;
  if (select count(*) from public.catalog_spells) <> 34
    or (select count(*) from public.catalog_spells where number between 22 and 34 and status = 'published') <> 13
    or (select number from app_private.counters where name = 'catalog_spells') is distinct from 34 then
    raise exception 'The Thirteen-Spell Batch Did Not Match The Expected Catalog Totals';
  end if;
end;
$append_spells$;
commit;
select count(*) as entries, count(*) filter (where status = 'published') as published,
  count(*) filter (where status = 'draft') as drafts,
  count(*) filter (where jsonb_array_length(payload -> 'media') > 0) as with_images
from public.catalog_spells;
