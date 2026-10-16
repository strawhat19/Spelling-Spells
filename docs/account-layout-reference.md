# Account Layout Reference

Source comparison and adaptation: 2026-10-16. The references were read from the current local BengaliBlush and Domains Database repositories. No browser session, build, test, deployment or live database was used for this change.

## Common Layout

Both references reuse the public brand and theme inside a full-width account workspace. Their account header escapes the centered public-page container. A flush-left desktop rail starts beneath the measured header and follows the brand's width rather than a separate wide navigation card. The rail scrolls independently, keeps Profile and collapse controls at the bottom, and collapses to 56 px with eligible child icons still available. Mobile uses an inline navigation panel above the content.

Both use small uppercase section labels, serif page headings with icons, thin themed borders, rounded panels, compact icon-and-text navigation, and active colors from the destination theme. Profile has editable label/value rows beside a 240 px Account Details card, stacking below 1100 px. Dashboard uses full-width reporting panels, compact business charts and linked count pills. Navigation choices persist per account, and direct page access must follow the same trusted capabilities as the menu.

| Evidence | BengaliBlush | Domains Database |
| --- | --- | --- |
| Full-width account header | `src/app/components/landing/bengali-blush-landing.tsx` selects full Header width on account routes; `src/app/components/navigation/header.tsx` drops the public container | `src/components/AppShell/account-shell.scss` removes account max-width constraints; `src/components/AppShell/styles.scss` shares the header logo-width token |
| Header/rail geometry | Header observes its own height and brand bounds; `src/app/components/authentication/account-layout/account-layout.scss` uses those tokens for its fixed rail and footer | `src/components/AppShell/useShellScroll.web.ts` measures header height; `account-shell.scss` supplies rail, content grid and footer offsets |
| Menu state | `src/shared/accountNavigationContext/AccountNavigationContext.tsx` and `src/app/components/authentication/account-navigation/` | `src/components/AccountSidebar/` and shared account navigation state |
| Profile | `src/app/components/authentication/profile-page/` | `src/components/AccountPage/` |
| Dashboard | `src/app/components/authentication/owner-dashboard/` | `src/components/AdminDashboard/` |
| Avatar popup | `src/app/components/authentication/profile-menu/` | `src/components/UserMenu/` |

These paths identify source evidence, not a claim that the references were executed. Their existing authorization differs from the requested target: BengaliBlush permits Admin and Owner into its administrative workspace, and Domains Database permits several administrative/reporting capabilities. Their plan pills also omit some privileged roles, and BengaliBlush currently hardcodes Free Plan. Those differences are intentionally overridden by the explicit request below.

## Spelling Spells Adaptation

- Keep Midnight/Ivory surfaces, gold and lavender accents, the v10 mark, and existing typography.
- Derive account-shell classification from shared route metadata. Widen the entire account header inner row and content canvas; retain the public layout on public routes.
- Measure the natural logo and wordmark right edge from the shell's left edge, including the existing leading inset. Use that width for the rail and footer. Observe resizing and brand/header changes.
- Keep Profile as the sole top-level ACCOUNT link. Connections, My Submissions and saved spells remain reachable through Profile and their existing routes.
- Show ADMIN and its children only for an active, role-verified, email-verified Owner. Central account-layout gates cover direct admin page URLs as well as the sidebar. Existing services and Supabase policies continue enforcing their own access rules.
- Include the account name/email, role pill and plan pill in the circular avatar popup for every signed-in role, with Owner-only Dashboard and Sign Out last. Support navigation dismissal, outside dismissal, Escape/back dismissal and failed-photo fallback.
- Reuse the compact Profile rows and 240 px Account Details card, including account tools and the existing device theme control.
- Arrange the dashboard overview as Traffic, Health, catalog distribution charts and linked counts. Catalog distributions describe the bundled spell records; they are not live traffic or an activity history. Account summaries describe the loaded, bounded account page.

The account schema does not currently contain a trusted plan. `getAccountPlanLabel` therefore returns **Plan Unavailable** in both the popup and Account Details. No default paid or Free entitlement is inferred from a role, signup metadata, browser state or the reference apps. A future confirmed plan adapter must replace this unavailable state before the app can show an actual plan.

Traffic, runtime reporting and contribution services retain their existing availability states. This task changes source layout and generic adoption instructions; it does not provision providers, publish pricing, grant roles, migrate a database or deploy. Existing package/lockfile edits belong to earlier work and are preserved.

## Portable Adoption

`AGENTS.md` and `ai/skills/admin/layout.md` now define these geometry, hierarchy and popup defaults generically. Authentication, route, Admin and adoption references use the same Owner-only default. Copying the pack carries the implementation contract and adoption prompts; a receiving coding agent still implements it against that app's actual framework, theme, existing backend and permitted modules. Copying instructions alone does not connect services or create account data.

Source review is the completion evidence for this change. Runtime appearance, keyboard/touch behavior, native rendering and connected account behavior remain for the user's requested review; no build, test or UI verification was run.
