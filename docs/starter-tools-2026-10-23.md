# Starter Tools

## Scope

Free pricing cards offer Sign Up Free and Sign In to signed-out visitors, wait for account hydration, and retain Browse Library for signed-in accounts. The public catalog remains available without signing in.

Starter adds custom spell collections, personal notes, flashcard practice with mastery tracking, and JSON export. `/grimoire` is an explicit device-local preview, accessible from Starter pricing, Saved spells, and spell detail pages. A spell detail link selects that spell in the tools. The route is excluded from the public sitemap, marked noindex, and disallowed in generated robots metadata.

Subscriptions, Stripe, checkout, entitlement assignment and ad removal remain disconnected. The Starter price stays $1/month. The preview is available without a purchase and does not grant a paid plan. Existing cloud account favorites remain separate.

## Working Behaviors

- Create, rename and delete collections; add or remove published catalog spells.
- Save or clear personal notes for individual spells.
- Reveal flashcard answers and grade Again or Remembered. Three consecutive Remembered reviews mark a spell as mastered; Again clears the streak. Reset practice progress separately from notes and collections.
- Export collections, spell references, notes and review progress as versioned JSON. Web uses a file download; native uses the device share sheet. Export does not upload data or confirm delivery to another application.

The shared grimoire service owns validation, queued mutations and persistence through the existing platform storage adapter. Collection IDs use the common app-owned ID helper and a monotonic local collection number. Views consume the shared context and API facade. The provider mounts only on the Grimoire route.

The preview supports 50 collections, 80-character collection names, 500 spell references per collection, and notes/review progress for 2,000 spells with up to 4,000 characters per note. Clearing the note and resetting progress frees an unused spell entry.

## Data Boundaries

Preview data is shared by people using the same browser profile or app installation. It is neither private account storage nor cloud backup. Signing in or out does not migrate, synchronize or erase it. Clearing browser/app data can remove it. Notes and progress can be removed in the workspace; collection deletion preserves spell notes and progress.

Storage is versioned and bounded. Unsupported or unreadable existing data is preserved and editing is blocked. Saves are reported only after the configured storage write succeeds. Session-only mode follows the existing app configuration and is identified in the UI. Failed edits remain drafts for retry. Catalog failures do not replace the preview's saved references.

## Catalog Publication

`supabase/operations/2026-10-23-starter-benefits.sql` contains the narrow catalog content update. It targets only Starter at its reviewed revision and $1 price, increments its revision, and returns the persisted row. It preserves all plan identities, publication settings, prices and ad-free metadata. Re-running it after the revision changes is a no-op; subsequent edits belong in the Owner Plans editor.

The catalog update was applied to Supabase project `qtfajiuilwdtywkklbjq` on October 23, 2026. The mutation returned Starter revision 2 with all six published benefit lines and its unchanged 100-cent price. No schema, access policy, billing or account entitlement was changed.

## Review Status

The user approved the frontend release. Vercel deployment `dpl_2XoMhbRmFMFMeix21xmcJSMFeeVG` became Ready and was confirmed behind [the production site](https://spelling-spells.vercel.app) for that release, including the pricing actions, `/grimoire` preview and its catalog links. A later approved catalog release superseded it with Ready deployment `dpl_ASW6zhGEdHaypsdxFHDfMKq23NCq`, now confirmed behind production; see [Spell Media](spell-media.md) for the release evidence. No local test suite, standalone compiler check, browser/device UI checks, local-storage interaction checks or commits were run. Deployment does not establish runtime behavior of collection editing, notes, flashcards or export. Paid access and cross-device synchronization require a separately authorized trusted entitlement and account-storage implementation before subscription launch.
