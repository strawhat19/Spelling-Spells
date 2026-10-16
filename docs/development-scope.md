> Superseded for the active backend integration by [Supabase setup](supabase-setup.md) and [the 2026-10-16 source handoff](supabase-integration-handoff.md). Firebase-specific setup and validation below describe the earlier disconnected checkpoint; do not deploy them for the Supabase rollout.

# Spelling Spells Launch Scope

## Current authorization and constraints

The latest instruction on 2026-10-15 is to deploy the safe frontend, then pause until new instructions. Account source has been prepared and validated but remains behind a hard source-controlled release hold; see [current status and gates](backend-connection-plan.md). The original frontend-preparation milestone is complete in source. The user subsequently authorized pushing the code and deploying it to Vercel on a `.vercel.app` address, including the necessary production build. Firebase setup, billing, account connections, paid extras, custom-domain changes, Stripe activation and AdSense submission remain deferred. Preserve public browsing and existing local bookmarks. Do not claim authentication, cloud synchronization, privileged access, or live analytics until the corresponding service is configured and independently evidenced.

Keep Expo Router, React Native, TypeScript and Sass, the Midnight Archive visual direction, and the selected v10 logo. This app has no shop or products in the current scope. Retain the established service/model/context boundaries so future apps can reuse account behavior without inheriting spell-specific data.

Prepare sign-in/sign-up, profile, an Owner dashboard, submission/review screens, and typed disconnected service contracts. Real Owner status must eventually come from a trusted, verified provider UID bootstrap, never the first sign-up, an email-only client check, or an editable client role. Keep all secrets out of source, client bundles and logs. Project provisioning and any monthly operating costs require separate completion evidence; the operating target is no more than $50/month, with minimal spend.

## Guidance synchronization

Imported on 2026-10-14 from `strawhat19/bengaliblush` commit `7c26b2427ae7abeba3068a31661f4c18fbb20086`:

- `AGENTS.md` and the complete `ai/` directory are copied unchanged, including licenses and licensed analytics assets.
- Optional shop guidance remains portable reference material only. It does not add shop pages, products or commerce behavior to this app.
- App-specific adaptation is in this document and application code, not in the synchronized upstream pack.
- `.agents/skills/app-launch/SKILL.md` is an intentional portable extension for launch, account/role/dashboard readiness, monetization gates and maintenance handoffs. It is outside the synchronized `ai/` directory to avoid diverging from the upstream pack. No automation has been enabled.

## Verification boundaries

The original guidance milestone changed no runtime code and ran no validation. After the user requested deployment, the production Expo export succeeded with 39 static routes on 2026-10-14. Standalone tests and type checks were not run for that initial milestone. The later account-source checkpoint passed TypeScript, 23 scoped tests and another 39-route export; native runtime and connected account browser checks remain unverified. After separate user permission, focused cloud-browser checks covered desktop and 400px responsive scrolling, menus, auth links and parchment card controls. The connector installation resolved GitHub publication permissions. The guidance and frontend commits are now on `main`, and its Git-triggered Vercel production deployment reached READY at [spelling-spells.vercel.app](https://spelling-spells.vercel.app). Public HTTP checks returned 200 for the home, Lumos, profile and privacy routes. Build success, source publication and live interaction behavior remain distinct evidence; see [the deployment checkpoint](frontend-handoff.md#validation-and-publication-status).
