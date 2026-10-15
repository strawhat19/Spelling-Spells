# Frontend preparation checkpoint

User scope: remote coding and page builds only, preserve the existing design, prepare eventual Firebase/Firestore/auth and store/AdSense readiness. No backend connection, billing, identity grant, domain change, ad script, payment setup or submission is authorized by this checkpoint.

## Source changes

- Retain existing private profile editor, provider avatar/initial, device theme, measured account sidebar and current account/save adapters. The source-controlled Firebase release hold remains false; no mock account or Owner override was added.
- Add Owner-only Users and Feedback page scaffolds in the current Midnight/Ivory visual system, with native counterparts. Public direct visits show only a disconnected layout, not user data. The service subscription contract deliberately returns unavailable, not an empty collection or a successful save. A future adapter must verify active Owner authority at its backend boundary, bound/paginate reads, clear data on identity changes and expose confirmed/error/cache states. This is a frontend boundary, not a connected realtime implementation.
- Keep Users under Dashboard and Feedback separate, with a review link to the existing contribution queue. Preserve narrower Owner-only policy.
- Add Help, Editorial Guidelines and Your Data pages, linked from information navigation, plus a data-choice link in the profile. These describe device-only drafts and unavailable accounts truthfully. No form claims that a message or deletion request has been sent.
- Add unique metadata for information, home, worlds and pronunciation pages. Existing catalog/detail/private metadata remains in place. Use the current confirmed Vercel origin for canonical and social URLs; do not claim the custom domain is connected.
- Add a sitemap of the 20 public canonical URLs, including the existing nine spell slugs. Exclude auth, owner/admin, saved, drafts and aliases. Robots allows crawling so private routes' noindex can be read; robots is not an access-control boundary. Update this explicit sitemap when catalog pages or origin change. Public help pages join the public-only offline cache; private pages and APIs remain excluded.

## Before a connected release

Resolve dedicated project/quota, approve concrete setup and billing, deploy restrictive rules/indexes, verify configured providers/domains, set production values and verify real cross-account isolation. Only then consider releasing the hard hold. Trusted Owner assignment is separate. Existing native Google sign-in is not implemented; do not imply native authentication parity.

## Before app-store submission

Native runtime/device and accessibility review, actual app identifiers/signing ownership, launch assets/screenshots, support/privacy endpoints and platform privacy disclosures still require completion. Connected account creation needs a real in-app account deletion path and required web request path, not this informational page. User-generated publication needs report/block/moderation workflows where applicable. No store submission or approval is claimed.

## Before AdSense application

Review the public site for useful original content, source rights/attribution, working navigation, policy/support accuracy and current publisher requirements. Nine curated entries alone do not guarantee enough value for approval. Connect the chosen domain, review regional consent/privacy requirements for any ads, and keep private/account screens ad-free. Do not insert advertising tags or apply in this frontend-only stage.

## Verification boundary

No test, typecheck, build, emulator, browser or native commands were run for this checkpoint, following AGENTS.md's explicit user-review-first preference. Source inspection is not proof of build or runtime success. No files were pushed or deployed. A future authorized check should cover metadata output, all new routes at desktop/mobile widths, role gates, sidebar groups, native linking, reduced motion and the unchanged Firebase release hold.

## Review reference

Referenced Domains Database's current `src/shared/routes.ts` through the GitHub connector: top-level Users/Feedback routes and account/admin separation. Existing Spelling Spells account layout and imported generic guidance already follow the same family; no unrelated Domain Database business model, credentials or registrar integration was copied. Remote base checked as `29f5b94cd6831adaa2722ab4b2f8f3acdf12505b`; this workspace's equivalent local base is `909de95` with source tree `6e3da0509ab04dbab3b77d429b88bdac3fa78e1e`.

## Shared account-layout follow-up

The user expanded the request to repeat the established BengaliBlush / Domains Database account/dashboard patterns across four apps, preserving each theme and keeping every new backend disconnected. This Spelling Spells follow-up adds:

- Native ACCOUNT/ADMIN groups, Dashboard and Feedback submenus, persisted submenu choices and bottom identity controls. Existing older navigation preferences keep their defaults during loading. Web Feedback now owns the existing Review Submissions child. No menu grants an Owner role.
- Sidebar avatar error fallback to the existing initial; web requests omit referrer details.
- Traffic and Health dimension controls, 7/30/90-day layout selection and Chart/List presentation on web/native. These controls change only the layout, never fetch a report, initialize analytics or fabricate a chart. Refresh/export remain unavailable. Keyboard arrow/Home/End selection is provided for web dimension controls.
- The complete shared Bengali-derived ai/ pack and AGENTS.md are synchronized with the generic disconnected-account-frontend workflow, adoption prompt and rule 26. No project identity or actual setup values were added to ai/.

Source reference: Domains Database AccountSidebar web/native, ProfileSettings web and TrafficAnalytics web at the current main source inspected 2026-10-15; the generic pack retains BengaliBlush 7c26b242 licensing and references. The requested reverse-engineer-anything skill source was not available in the checked repositories/catalog/tools; this work uses source inspection and does not claim that skill was run.

Review branch: frontend/firebase-readiness-2026-10-15. The first checkpoint was committed as 077d731a8126545eb7b97dd5176704540ec7445f (v0.0.0.7-SpellingSpellsFrontendReadiness), and its automatic Vercel branch deployment reported success. Main remains outside this task. The follow-up keeps the same branch and no-connections constraint. No manually initiated test/build/UI/native check has been performed; automatic branch CI is separate from app-behavior verification.

Remaining parity limits: no actual user records, role-management actions, measured provider reports, live charts, Firebase connection or account creation. Existing native Google authentication is still unsupported. Frontend layout readiness is not a completed connected system or store/ad approval.

## Device-local profile follow-up

The profile page now offers a separate device nickname and reading note without sign-in, plus the existing persisted theme control. Explicit Save and confirmed Clear use the existing guarded platform storage adapter (localStorage on web, AsyncStorage on native). Names are bounded to 80 characters and notes to 500; errors are visible and corrupt stored values are preserved rather than overwritten. No account, role, password, upload, cloud migration or analytics access is created. Existing device bookmarks and saved contribution drafts already persist independently. Contribution drafts are not submitted or published. Manual checks were not run.
