# Spelling Spells

A front-end archive of fictional magic: how to spell the words, pronounce them, understand their origins, and find their place in a story. The app adopts **01 Midnight Archive** from `assets/concepts/mockups/v1/`, using the selected v10 angled fitted-tip logo. The header reads **Spelling Spells**, without a hyphen.

## Run locally

Use Node **24.21.0**, pinned in `.nvmrc` and the Volta configuration. Dependencies and `package-lock.json` are included in this setup.

```sh
cd /Applications/XAMPP/xamppfiles/htdocs/apps/Library/Tools/Spelling-Spells
npm install
npm run web
```

`npm start` opens the Expo development workflow. `npm run ios` and `npm run android` select the respective native target. A compatible simulator or device and the platform's development setup are required for native development.

## Included

- Midnight Archive landing hero: violet night illustration, gold star orbits, chosen logo watermark, warm ivory featured card, and layered lavender spell cards.
- Additional landing sections for curated spells, story worlds, spelling and pronunciation, and discovering another spell.
- Searchable Spell Index with world, category, skill, and saved filters; useful loading and empty states.
- Spell dossiers with spelling tiles, pronunciation notes, syllables, word breakdown, definition, usage, etymology, sources, counterspells where available, and editorial danger/utility/skill ratings.
- Worlds, pronunciation guide, and saved-spell pages.
- Night and ivory themes, a sticky header that blurs on scroll, reduced-motion support, and a floating scroll-to-top control.
- Footer with the current year and Piratechs link; About, Contact, Terms, and Privacy pages with common URL aliases.
- Expo/React Native device views alongside the Sass web views, plus a web app manifest and production service worker.

The starter catalog contains **nine source-linked records across Harry Potter, Skyrim, and the Inheritance Cycle**. It is a small curated catalog, not a claim to cover every spell. Editorial ratings are not official game statistics. Reader pronunciation aids and suggested etymology are identified separately from author-confirmed information. The browser pronunciation control uses the device's speech synthesis when supported as a reading aid; it does not claim to reproduce a canonical performance. Native views provide phonetics and source references.

## Local data

There is no connected backend, sign-in service, or cloud synchronization. Public browsing and saving spells work without an account. The frontend now includes disconnected Google/email sign-in, profile, Owner dashboard/analytics, and submission/review layouts. Disabled credentials and unavailable metrics are intentional; these screens do not create accounts or grant access. See [the frontend handoff](docs/frontend-handoff.md) for exact source scope and connection gates.

`src/shared/config.ts` contains the single `useLocalStorage = true` switch. Web uses **localStorage**; iOS and Android use **AsyncStorage**. Saved IDs and recently viewed IDs use `spelling-spells:preferences:v1`, and the selected theme uses `spelling-spells:theme:v1`. Preferences are versioned and separate from the immutable source catalog.

Changing the switch to false selects session memory; it does not connect a backend. Unreadable or malformed persisted preferences are preserved rather than overwritten. The app reports storage failures, and affected changes can remain in memory for that session. Clearing browser/app data removes the device's saved preferences. The Saved page can clear bookmarks after confirmation. A separate contribution draft can be deliberately saved on this device; it is never submitted or uploaded in this version. Unsaved draft edits are kept in memory across internal navigation.

The typed asynchronous facades under `src/api/` describe catalog, preference, theme, and health/status operations. They are local services rather than HTTP endpoints. Models, contexts, persistence, and curated data stay under `src/shared/`; thin files under `app/` use Expo Router.

## Web and PWA

```sh
npm run export:web
```

The configured static web export writes `dist/`. Serve it from an HTTPS host with clean URLs and support for the generated route HTML files. The manifest supplies installable-app metadata. The service worker registers in production only and caches public assets and pages as they are used; it does not synchronize saved preferences between devices or guarantee every never-visited route is available offline. It stays disabled during normal development.

Sass files are imported directly by the web components rather than chained through Sass `@use` paths, matching [Expo's partial Sass support](https://docs.expo.dev/versions/v57.0.0/config/metro/). Native views use React Native style objects. No Firebase, authentication, or external API SDK is installed.

## Assets and sources

The editable logo is `public/brand/logo-mark.svg`; the original v10 artwork and earlier concept rounds remain intact. PWA/app icons are exports of that mark. `public/visuals/hero-night-background.png` was produced with the built-in image-generation tool from the chosen mockup, preserving the illustrated night scene while removing its baked-in interface. See `public/visuals/IMAGEGEN-PROMPTS.md` for the prompt and provenance.

Spell-source links live with the seed records under `src/shared/catalog/`. The design round's [source notes](assets/concepts/mockups/v1/README.md) explain the initial Lumos, Fus Ro Dah, and Brisingr examples. Franchise names identify source works; this is an independent archive with no affiliation claim.

## Review status

The original dependency lockfile is preserved and no new runtime dependency was added for the frontend milestone. The authorized production command `npm run export:web` completed successfully on 2026-10-14 and generated 39 static routes. Tests, type-check commands, dev-server runs, browser interaction checks and native runtime checks have not been run; the production export does not imply those passes. Source changes are committed locally on `codex/frontend-launch`; GitHub integration write access is currently blocked, so nothing from this milestone is pushed or deployed. `vercel.json` prepares the requested `.vercel.app` deployment with Expo static export, the `dist` output directory and clean URLs. See [development scope](docs/development-scope.md) and [frontend handoff](docs/frontend-handoff.md) for the imported guidance, explicit service limitations, and next steps.
