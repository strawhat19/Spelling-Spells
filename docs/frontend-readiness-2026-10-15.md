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
