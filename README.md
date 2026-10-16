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

The Supabase integration source supports Google web and email/password sign-in, private profiles, an Owner-only directory and account spellbook sync. It activates only with the approved project URL and a publishable key; missing configuration keeps credentials disabled and guest browsing available. **This source checkpoint has not been deployed or validated end to end.** TypeScript and the 46-route static export passed; live schema, auth settings, credentials and owner bootstrap remain approval-gated. See [Supabase setup](docs/supabase-setup.md) and [the current integration handoff](docs/supabase-integration-handoff.md).

Guest bookmarks remain in their original storage. Signing in opens a separate account collection. The Saved page offers an explicit additive import that keeps the device originals. Confirmed server snapshots, active realtime updates and unavailable/cached states are distinguished. Feedback, online contribution review, analytics and native Google sign-in remain unavailable.
`src/shared/config.ts` contains the single `useLocalStorage = true` switch. Web uses **localStorage**; iOS and Android use **AsyncStorage**. Saved IDs and recently viewed IDs use `spelling-spells:preferences:v1`, and the selected theme uses `spelling-spells:theme:v1`. Preferences are versioned and separate from the immutable source catalog.

Changing the switch to false selects session memory; it does not connect a backend. Unreadable or malformed persisted preferences are preserved rather than overwritten. The app reports storage failures, and affected changes can remain in memory for that session. Clearing browser/app data removes the device's saved preferences. The Saved page can clear bookmarks after confirmation. A separate contribution draft can be deliberately saved on this device; it is never submitted or uploaded in this version. Unsaved draft edits are kept in memory across internal navigation.

The typed asynchronous facades under `src/api/` describe catalog, preference, theme, and health/status operations. They are local services rather than HTTP endpoints. Models, contexts, persistence, and curated data stay under `src/shared/`; thin files under `app/` use Expo Router.

## Web and PWA

```sh
npm run export:web
```

The configured static web export writes `dist/`. Serve it from an HTTPS host with clean URLs and support for the generated route HTML files. The manifest supplies installable-app metadata. The service worker registers in production only and caches public assets and pages as they are used; it does not synchronize saved preferences between devices or guarantee every never-visited route is available offline. It stays disabled during normal development.

Sass files are imported directly by the web components rather than chained through Sass `@use` paths, matching [Expo's partial Sass support](https://docs.expo.dev/versions/v57.0.0/config/metro/). Native views use React Native style objects. Supabase SDK initialization is scoped to the dedicated approved project. The static callback and recovery pages bypass the public offline-page cache.

## Supabase checks

After an approved unconfigured web export, `npm run test:web:unconfigured` runs the saved smoke checks in an isolated headless installation of Google Chrome. It uses temporary browser storage, blocks external requests and writes ignored reports/screenshots under `test-results/unconfigured-browser/`. Chrome must already be installed. This checks guest behavior and missing-configuration boundaries; it does not prove authenticated sign-in or cloud syncing.

The guarded SQL regression script under `supabase/tests/` requires a separately authorized isolated local Supabase database. See [setup and validation](docs/supabase-setup.md). Native runtime and production Google/email/Realtime behavior require their actual approved end-to-end checks.
## Assets and sources

The editable logo is `public/brand/logo-mark.svg`; the original v10 artwork and earlier concept rounds remain intact. PWA/app icons are exports of that mark. `public/visuals/hero-night-background.png` was produced with the built-in image-generation tool from the chosen mockup, preserving the illustrated night scene while removing its baked-in interface. See `public/visuals/IMAGEGEN-PROMPTS.md` for the prompt and provenance.

Spell-source links live with the seed records under `src/shared/catalog/`. The design round's [source notes](assets/concepts/mockups/v1/README.md) explain the initial Lumos, Fus Ro Dah, and Brisingr examples. Franchise names identify source works; this is an independent archive with no affiliation claim.

## Review status

The original frontend and usability releases passed a 39-route production export and focused cloud-browser checks of scrolling, a 400px responsive viewport, Night/Ivory surfaces, auth navigation, Google branding and parchment controls.

For the 2026-10-15 account-source checkpoint, independent source review, TypeScript and 23 scoped tests passed: Firestore emulator allow/deny paths, initialization boundaries, account lifecycle races and a fail-closed release hold. The final 39-route production export also passed with deliberately populated fake Firebase configuration and an emulator flag; neither can activate accounts while the hold is in place. Real connected account flows and native runtime behavior have not been validated. No production test users were created.

The public frontend is hosted at [spelling-spells.vercel.app](https://spelling-spells.vercel.app) in the Piratechs Vercel team, using Git-connected `main`, Expo static export, the `dist` output and clean URLs. The user requested deploying the latest safe frontend, then pausing. The production deployment still uses the prior disconnected frontend. Supabase sign-in, Owner access and cloud saves are prepared on the integration branch; submission moderation and analytics remain outside this connection stage. See [development scope](docs/development-scope.md), [frontend history](docs/frontend-handoff.md) and [account release gates](docs/backend-connection-plan.md). A source/build pass is not proof of a live connected-service launch.
