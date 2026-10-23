# Custom Domain Release — October 23, 2026

The user requested deployment to [spellingspells.com](https://spellingspells.com). The apex is the canonical serving hostname; [www.spellingspells.com](https://www.spellingspells.com) is independently attached and redirects to the apex. The production deployment is Ready, promoted and assigned to the apex. Final ordinary-DNS readback confirms the app over trusted HTTPS, with HTTP and `www` redirecting to the canonical HTTPS hostname while preserving path and query.

## Resource And Source Scope

| Item | Recorded Value |
| --- | --- |
| Vercel project | `spelling-spells` / `prj_Rkxn2SjuJtRsjHh4BiYyNs2qEJ0O` |
| Vercel team | `piratechs` / `team_2hW8Z1s5cxdaS56fE1tnAMI9` |
| Canonical hostname | `spellingspells.com` |
| Alternate hostname | `www.spellingspells.com` |
| Registrar / DNS | GoDaddy; existing `ns73.domaincontrol.com` and `ns74.domaincontrol.com` retained |
| Supabase project | `qtfajiuilwdtywkklbjq` |
| Working branch / HEAD | `main` / `270787a55090bf6973b35b5f8adeae803fd8c1f6` |
| Deployment source | Explicit current-worktree CLI upload: the recorded HEAD, five origin-file edits and existing package changes |
| Production deployment | `dpl_E8EBBohny862UE7mmp8G3oGztBH4` |
| Deployment URL | [spelling-spells-31s16exf9-piratechs.vercel.app](https://spelling-spells-31s16exf9-piratechs.vercel.app) |
| Latest reported deployment state | `READY`; 79-second remote build, promoted through Vercel MCP |

Vercel `get_deployment` readback for `spellingspells.com` confirms that exact deployment ID. This establishes the hosting assignment separately from the DNS propagation observations below.

No commit or push was performed for this domain release; the five origin-file changes remain uncommitted and were deployed through the identified working-tree upload. Existing unrelated working-tree changes were preserved. The configured Expo static build remains `npm run export:web` with output in `dist`.

Five source files now use `https://spellingspells.com`: `app.json` (`expo.extra.siteUrl`), the native email callback in `src/shared/supabase/authPlatform.ts`, the spell JSON-LD fallback in `src/components/SpellDetailPage/index.web.tsx`, `public/robots.txt` and the tracked fallback `public/sitemap.xml`. Export regenerates the current public sitemap, robots file and catalog-build origin from `app.json`. Shared page metadata and sharing consume the configured origin. Web auth already derives `/auth/callback` from the current browser origin. The root-relative PWA manifest, icons, service worker and same-origin offline rules needed no hostname changes. Supabase project credentials remain unchanged.

## DNS And Hostname Changes

| Host / Record | Before | Saved After | TTL |
| --- | --- | --- | --- |
| `@` A | GoDaddy `Parked` entry | `216.150.1.1` | 600 seconds |
| `@` A | No second Vercel target | `216.150.16.1` | 600 seconds |
| `www` CNAME | `spellingspells.com` | `498703f8ea57ddb7.vercel-dns-016.com` | 1 hour |

These targets came from the selected Vercel project's domain configuration. Both hostnames were attached to that existing project. The `www` project-domain setting is an HTTP `308` redirect to `https://spellingspells.com`, preserving path and query; it is not a global redirect rule in the app.

The existing authoritative nameservers, NS/SOA, `_domainconnect` and `_dmarc` records were preserved. No MX records were present in the inspected zone. No mail, nameserver, registration, unrelated-subdomain or provider credential changes were made.

Vercel configuration readback reports `misconfigured: false` for both hostnames. Cloudflare and Google DNS readbacks matched the saved web records while the system resolver initially retained an old cached parking answer. Trusted TLS diagnostics passed for both apex and `www` using explicit Cloudflare lookup. The final system-resolver readback at `2026-10-23T19:27:03.968Z` now returns `216.150.16.1` and `216.150.1.1` with 600-second TTLs. Ordinary default-fetch requests, without a DNS override or TLS bypass, confirm HTTPS delivery and the expected redirects. The saved [DNS dashboard screenshot](releases/spellingspells-dns-2026-10-23.png) records the configured web records.

## Authentication Configuration

In the existing Supabase project, the Site URL changed from `https://spelling-spells-piratechs.vercel.app/` to `https://spellingspells.com` (no trailing slash). The exact redirect URL `https://spellingspells.com/auth/callback` was added through the dashboard and is visible in its saved redirect list. The base URL `https://spellingspells.com` was already allowlisted before this release. All nine pre-existing redirect URLs were preserved, bringing the list to ten. No wildcard callback or new OAuth credential was introduced.

The saved [auth URL dashboard screenshot](releases/spellingspells-auth-url-2026-10-23.png) records this configuration.

The Google provider continues to use the existing Supabase provider callback. This configuration readback does not prove a completed real sign-in, email confirmation or recovery flow on the custom domain. Those flows have not been exercised as part of this record.

## Recovery And Independent Detachment

An app rollback and a DNS rollback are separate operations. To restore the prior website routing, change only the two apex A records and the `www` CNAME shown above back to the captured GoDaddy before-state: remove the added second A target, restore the original `Parked` apex entry and restore `www` to `spellingspells.com`. Preserve the existing nameservers, mail-related records, NS/SOA and unrelated records. DNS caches may retain the changed answers until their TTLs expire.

To undo only the project attachments, remove `spellingspells.com` and/or `www.spellingspells.com` through this project's domain settings as intended. Do not remove domain registration or team ownership. Reassigning the production deployment changes app delivery but does not reverse DNS or Supabase settings. To restore the prior auth configuration, set the Supabase Site URL back to `https://spelling-spells-piratechs.vercel.app/` and remove only the newly added `https://spellingspells.com/auth/callback` redirect entry. Preserve all nine older entries, including the already-allowlisted base custom origin.

To turn `www.spellingspells.com` into its own site later, prepare that site's independent project, canonical origin and auth configuration first. Remove only the `www` redirect/assignment from the current project, attach that hostname to the new project and update only the `www` CNAME if its new host requires a different target. Leave `spellingspells.com`, both apex A records, the current project's apex assignment and all other DNS records intact. Verify `www` DNS, TLS and its new serving behavior separately; the current `308` may remain cached by clients after detachment.

## Hosted Delivery Evidence

[The diagnostic readback](releases/spellingspells-diagnostic-2026-10-23.json), recorded at `2026-10-23T19:22:16.054Z`, used explicit Cloudflare lookup while the old local cached answer expired. It records:

- Forty HTML pages returned HTTP 200 with authorized HTTPS. The 37 public pages have the expected custom-origin canonical metadata, including all 30 published spell detail pages. The three auth pages (`/signin`, `/signup` and `/auth/callback`) intentionally omit canonical metadata.
- `catalog-build.json` reports an anonymous snapshot with 30 spells, five worlds and `siteOrigin: https://spellingspells.com`.
- The sitemap returned HTTP 200 with 48 custom-origin locations and every published spell path. The robots file returned HTTP 200 and the correct custom-domain sitemap URL.
- The PWA manifest returned HTTP 200 with `application/manifest+json`; the Accio illustration returned HTTP 200 with `image/png` and authorized HTTPS.
- The diagnostic reported no problems.

## Final Ordinary-DNS Readback

[The final live evidence](releases/spellingspells-live-2026-10-23.json), recorded at `2026-10-23T19:27:03.968Z`, uses the system resolver and default fetch with no DNS override or TLS bypass. All nine checked URLs passed: the homepage, Accio detail, About, Terms, Privacy, Contact and auth callback returned HTTP 200; HTTP and HTTPS `www` requests to `/spell/accio?from=domain-check` returned `308` with the exact location `https://spellingspells.com/spell/accio?from=domain-check`. The live catalog-build response remains the anonymous 30-spell/five-world snapshot with the custom site origin. The evidence reports no problems.

Normal Chrome navigation to the clean `https://spellingspells.com/` URL also visibly loaded the app's “Every Spell Has a Story” landing page. Domain attachment, canonical HTTPS delivery, TLS and the alternate-host redirect are complete for the observed release. No additional build was created after the identified deployment.

[The live homepage screenshot](releases/spellingspells-live-2026-10-23.png) records the loaded hero, illustration, navigation and signed-out controls on that custom-domain page.

Source review is complete for the five origin replacements, and the authorized remote deployment passed its build. No local tests, standalone build, native UI or authenticated provider-flow check was run. The recorded browser observation and HTTP/TLS/DNS checks establish delivery at their stated scope; an actual sign-in, confirmation or password-recovery flow was not exercised.
