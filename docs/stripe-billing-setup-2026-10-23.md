# Stripe Billing Setup — October 23, 2026

This guide records the released billing implementation, operator setup and confirmed deployment/database evidence. Earlier pricing, feature and Starter notes describe previous release scopes; the coordinated release now replaces their disconnected billing design. Authenticated billing, delivered webhooks and payment lifecycle outcomes remain untested.

## Current Evidence

| Level | Current Recorded State |
| --- | --- |
| Source | Authenticated Checkout, Portal, return reconciliation, signed webhooks, private billing persistence, trusted entitlements, feature tier guards and cloud grimoire operations are implemented |
| Stripe account readback | Official SDK readback with the replacement server key confirmed the intended live account `acct_1URo3fKwCE6Umy8w`, with charges and payouts enabled |
| Stripe object readback | Customer, subscription, invoice, invoice-payment, PaymentIntent, charge, dispute and Checkout Session reads succeeded; the returned inventories contained zero records |
| Stripe resource readback | The configured product, price, Portal and webhook endpoint matched the release record, including all 16 webhook events |
| Local environment | All 11 required server billing variables were present without duplicate names; the live restricted-key and webhook-secret formats matched their expected forms |
| Production environment | All nine previously missing billing variables were imported to Vercel Production; all 11 billing variable names are now listed |
| Credential rotation | The replacement key was saved and provider reads were confirmed. The user expired the old key; the current Dashboard inventory contains one active replacement key and no old key |
| Database | Migration version `20261023202432` is applied to the intended Supabase project; the local file is `supabase/migrations/20261023202432_stripe_billing_entitlements.sql` |
| Catalog | The guarded Starter update is confirmed at revision 3, USD 100 cents/month, with `removes_ads=false` and the existing plan identity preserved |
| Hosted runtime | Production deployment `dpl_5XxZN4BCwTqcuUUYaJ4VgmiE2N4M` is READY at `spelling-spells-b4bfagt0n-piratechs.vercel.app`; promotion and canonical `spellingspells.com` inspection identify this same deployment |
| Validation | The final hosted build completed without errors, and canonical HTTP/Data API denial and read checks passed. No local build/typecheck, UI run, authenticated billing status, transaction test or actual webhook delivery test was performed |
| Dependencies | The hosted install reported seven npm advisories: three moderate and four high. No dependency changes were made |

The [configuration record](releases/stripe-billing-config-2026-10-23.json) contains provider resource setup. Current release proof is recorded in the [database readback](releases/stripe-billing-database-2026-10-23.json) and [canonical hosted readback](releases/stripe-billing-hosted-2026-10-23.json). Successful configuration, deployment and read checks do not establish customer or Checkout creation permissions, authenticated account behavior, a completed transaction or delivered webhook reconciliation.

## Environment Configuration

The real local values belong in the ignored project `.env`. `.env.example` contains blank assignments only. The nine previously missing server billing values have been imported to Vercel Production, where all 11 billing variable names are now listed. Local `.env` files are excluded from deployment uploads. Existing public Supabase configuration remains unchanged in purpose.

| Variable | Purpose And Required Scope |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Existing project URL: `https://qtfajiuilwdtywkklbjq.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Existing public client key from that same project; never the server key |
| `BILLING_APP_ID` | `spelling-spells`; must match private database configuration and provider metadata |
| `BILLING_SITE_URL` | `https://spellingspells.com`; an HTTPS origin without a path, query, credentials or custom port |
| `STRIPE_ACCOUNT_ID` | The verified intended Stripe account ID |
| `STRIPE_LIVE_MODE` | Explicit `true` for the user-selected live environment; the key and every provider resource must agree |
| `STRIPE_BILLING_SERVER_KEY` | Server-only Stripe key. A restricted key with the actual required permissions is preferred; the implementation accepts matching `rk_live_` or `sk_live_` credentials in live mode |
| `SUPABASE_SECRET_KEY` | Server-only database credential for the same Supabase project; must authorize the service-role billing dispatcher and must not be the publishable client key |
| `STRIPE_STARTER_PRODUCT_ID` | The approved Starter product ID |
| `STRIPE_STARTER_PRICE_ID` | The approved immutable recurring Starter price ID |
| `STRIPE_PORTAL_CONFIGURATION_ID` | The app-scoped active Portal configuration ID |
| `STRIPE_WEBHOOK_ENDPOINT_ID` | The enabled app webhook endpoint ID |
| `STRIPE_WEBHOOK_SECRET` | That endpoint's distinct `whsec_` signing secret; not the API key |

`STRIPE_BILLING_SERVER_KEY` is the canonical key name. The server reads `BILLING_APP_ID`, not an `APP_ID` alias. No Stripe publishable key is required for this hosted Checkout redirect flow. None of the server variables may gain an `EXPO_PUBLIC_` prefix, enter public catalog rows, or be imported by client modules. No analytics or financial reporting credentials are added by this work.

The key must permit the operations actually used: account verification; customer read/create; Checkout Session read/list/create; subscription, invoice, invoice-payment, PaymentIntent and charge reads; product/price reads; Portal configuration read and Portal Session create; webhook endpoint read. A permitted catalog read alone does not prove these other permissions. Never paste credentials into chat, documentation, screenshots or command output.

## Approved Stripe Resources

The existing published Starter offer is USD 100 minor units per month for quantity one. Read the actual catalog before configuring or replacing a provider price. Public plan edits do not alter a Stripe price, change an existing subscriber's commercial terms or grant account access.

The connected product must be active, belong to the intended account/mode and carry `app_id=spelling-spells` plus `plan_id` equal to the actual Starter catalog ID. Its approved recurring price must be active, USD, monthly with interval count one and unit amount equal to the saved offer. The server rejects mismatched product, price, amount, currency, interval, quantity or submitted catalog revision. Existing approved purchase attempts retain their original commercial terms for reconciliation after catalog edits.

The active Portal configuration must carry the app ID, return to `https://spellingspells.com/billing-return`, enable subscription cancellation at period end and leave subscription updates disabled. Cancellation scheduling retains the confirmed paid period; it is distinct from closing a Checkout page.

The webhook URL is `https://spellingspells.com/api/billing/webhook`. Use snapshot events pinned to API version `2026-09-30.endive`, matching the installed `stripe` SDK `23.0.1` and server configuration. Enable these event types:

```text
charge.refunded
charge.dispute.created
charge.dispute.closed
credit_note.created
credit_note.voided
invoice.paid
invoice.voided
invoice.payment_failed
invoice.marked_uncollectible
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
checkout.session.completed
checkout.session.expired
checkout.session.async_payment_failed
checkout.session.async_payment_succeeded
```

The API verifies the unmodified request bytes with the signing secret before trusting the event. Stripe retries unsuccessful deliveries; completion is recorded only after the app's billing transition commits. Delivery order is not used as subscription authority: reconciliation fetches current provider state. See [Stripe webhook guidance](https://docs.stripe.com/webhooks) and [Event version semantics](https://docs.stripe.com/api/events/object).

## Application And Database Boundaries

| Surface | Source Behavior |
| --- | --- |
| `GET /api/billing/status` | Verifies the current active Supabase account/session and returns its trusted plan plus actual billing readiness. Email verification is required for purchase/management actions, rather than hiding confirmed Free state during an account status read |
| `POST /api/billing/checkout` | Accepts only `planSlug` and `expectedRevision`; derives the customer/account and approved provider price on the server |
| `POST /api/billing/portal` | Opens the current verified account's bound customer using the approved Portal configuration |
| `POST /api/billing/reconcile` | Accepts a Checkout session ID and verifies its app/account/customer binding and actual subscription/paid period; a redirect alone grants nothing |
| `POST /api/billing/webhook` | Uses the signed-event boundary, separate from browser identity, and persists idempotent app-scoped reconciliation |
| `/billing-return` | Shows cancelled-return, pending, failed or server-confirmed results. Bounded refresh never converts a timeout into success |
| `/profile` and account popup | Show trusted Free/paid/pending/unavailable state. The popup plan pill stays hidden for the actual Owner role; Profile Account Details still shows the plan |

`api/billing.ts` is the Vercel server entrypoint. `vercel.json` rewrites `/api/billing/:operation` to the dispatcher and permits a 60-second function duration. A static Expo export or Metro frontend alone does not establish a working private server runtime.

Public plans and the public-safe tier rank projection remain separate from private provider bindings, administrative role and entitlement. The applied migration establishes server-only billing configuration, customer/subscription/session/attempt/event persistence, account operation leases and a minimal own-account realtime entitlement mirror. It validates the selected app, provider account and live/test mode independently of browser input. Clients cannot write billing state or promote their account role/plan. See [the schema contract](stripe-billing-schema-2026-10-23.md) for exact tables, RPCs and grants.

Customer and Checkout attempts are persisted before uncertain provider calls and recovered through stable identities/idempotency keys. A timeout, expired local lease or incomplete provider list is not permission to create another subscription. Uncertain or unsupported states stay pending and may require operator review.

The supported paid policy requires a current active subscription with its approved item and a matching paid invoice/service period backed by a succeeded, undisputed, unrefunded payment. Trials, discounts, customer credits, manual/out-of-band settlement, grace periods and partial/custom payment arrangements do not grant paid access in this implementation. Tax calculation is disabled. Advertising is not active; this release does not sell or implement ad removal. Terms, tax/refund obligations and any future commercial policy changes remain separate operator decisions.

## Feature Guards And Grimoire

Feature settings version 2 adds Theme Toggle, Parchment Marquee, Notifications, Contact and Grimoire Tools. Each effective flag combines its saved global value, minimum role, allowed-role list and minimum trusted plan. No selected paid threshold means Free And Above. Paid thresholds use saved `displayOrder`, then stable plan number, including inactive tiers retained for existing subscribers. Future catalog tiers qualify by rank only after the account already has that trusted entitlement; publication never buys or assigns a plan.

Only the current active verified Owner can manage Features and public plan publication. Owner administration remains independent of billing. The saved consumer feature audiences, including the Grimoire minimum plan, also apply to Owners; no paid-feature bypass is fabricated from the Owner's hidden popup pill. Disabled or unresolved theme access forces dark mode while retaining the device preference.

Grimoire data now uses a private account document with confirmed reads, account-scoped realtime updates and server-locked revision comparisons. Eligible writes support 50 collections, 80-character collection names, 500 spell references per collection, 2,000 note/progress entries and 4,000 characters per note. The backend enforces the full document and current feature audience atomically, including import. New references must be published spells.

Accounts that lose write eligibility keep access to their retained data for reading, export, collection/member removal, clearing notes and resetting progress. They cannot add collections, memberships, notes or reviews. No downgrade deletes or silently truncates cloud data.

The original device preview remains separate. It is copied only after the user explicitly confirms import into an empty, new account grimoire at revision zero. Import does not erase the device copy, and sign-in alone never uploads or migrates it. Web exports request a JSON download; native exports use the user's share action.

Native clients can read their confirmed account entitlement and use eligible tools. Native Checkout and Portal navigation remain unavailable while app-store purchase/distribution policy is unresolved. This source does not claim an App Store or Play billing integration.

## Coordinated Release

1. Review the current diff and actual public catalog/provider configuration. Preserve existing unrelated changes and records.
2. Apply the billing migration only within an authorized database rollout. This release applied version `20261023202432`, which upgrades Features to version 2 and establishes the new enforcement boundaries.
3. Import the required values into the intended Vercel environment before an authorized deployment. This rollout's nine missing server billing variables have been imported to Production. Public Supabase variables are client build configuration; server billing/database credentials remain private runtime configuration.
4. Release the matching frontend and server handlers together. Old Features editors understand version 1 only and must be upgraded/reloaded after migration. The new archive RPC intentionally fails closed against an old backend; archival preserves plan identities and subscription references.
5. Record the exact ready deployment and intended custom-domain alias, then perform only authorized hosted/authentication/webhook checks. No test subscription, live charge, refund or cancellation is implied by source preparation or resource setup.

The release record must distinguish source completion, configured resources, database application, hosted behavior, delivered webhooks and an explicitly authorized transaction. Do not mark the full payment flow verified from a key, an empty provider inventory, a saved endpoint or a successful build alone.


## Configuration Readback — October 23, 2026

The supplied live restricted key reached the exact account `acct_1URo3fKwCE6Umy8w`; Stripe returned `charges_enabled=true` and `payouts_enabled=true`. The following live resources were created and then read back through the official Stripe SDK. No customer, Checkout session, subscription, payment, refund or cancellation was created.

| Resource | Confirmed Configuration |
| --- | --- |
| Starter product | `prod_VUoFJCADXDkJdZ`, active, app metadata and the existing Starter catalog ID |
| Starter price | `price_1UTodOKwCE6Umy8w83LT0awP`, active, USD 100 cents, recurring monthly, quantity one |
| Customer Portal | `bpc_1UToe7KwCE6Umy8wSOwQWseZ`, active live configuration, fixed return URL, invoice history and payment-method management, cancellation at period end, subscription updates disabled |
| Supabase server credential | Existing project secret copied securely to ignored `.env`; a read of the two pricing-plan records succeeded against project `qtfajiuilwdtywkklbjq` |
| Webhook | `we_1UToi7KwCE6Umy8wnCR6iJII`, active live snapshot destination for the exact app URL and 16 selected events; signing secret saved securely in ignored `.env`; delivery count remains zero |

The live restricted key was rotated, its replacement was saved under `STRIPE_BILLING_SERVER_KEY`, and current-key provider reads succeeded. The user expired the old key, which is absent from the current active inventory. Do not copy credential values from observations, chat or this document.

The feature/billing migration is applied as version `20261023202432`; its local file is `supabase/migrations/20261023202432_stripe_billing_entitlements.sql`, with reviewed SHA-256 `38AB1228A7C33B538B625DE5E5F1E7100312B27F1FBBCCBEDDBBCD4F59141CD2`. The guarded copy operation in `supabase/operations/20261023_starter_billing_copy.sql` is also applied. Starter is revision 3 at the existing $1/month price, with `removes_ads=false`, its feature list and plan identity preserved. Features version 2/revision 2 and both tier projections were confirmed through the Data API. Older Features editors must be reloaded to use the released version-two contract.

The release uses base `main` HEAD `270787a55090bf6973b35b5f8adeae803fd8c1f6` plus the authorized dirty working tree, without a new commit or branch. Initial staged deployment `dpl_GaqGizS223Qftvans1D2KRCHLn8U` stopped on three TypeScript errors and was never promoted. All three were fixed; final deployment `dpl_5XxZN4BCwTqcuUUYaJ4VgmiE2N4M` built without errors, exported 97 routes with 30 spells and five universes, and included the approximately 500 KB billing API function. Its URL is `https://spelling-spells-b4bfagt0n-piratechs.vercel.app`; promotion and canonical domain inspection confirmed this deployment for `spellingspells.com`.

Canonical HTTP checks returned 200 HTML for `/pricing` and `/billing-return?cancelled=1`, both referencing `entry-748a1371f0f0119c134fee22b6374c4f.js`. Unauthenticated billing status returned 401 private/no-store JSON; GET Checkout and webhook requests returned 405; an unsupported operation returned 404. Unsigned and invalid-signature webhook requests returned 400 before processing. Data API checks confirmed Features version 2/revision 2, the two saved tier ranks and Starter revision 3; anonymous entitlement and dispatcher calls were denied with `42501`, while a service-role event-existence read returned `alreadyProcessed=false`.

Database readback confirmed RLS on every new billing/grimoire/tier table, blocked direct writes, all five required realtime publication members, two catalog/tier records with zero mismatches and two Free account entitlements. There were no private billing bindings, subscriptions, attempts, events or grimoire records. These checks created no transaction and did not exercise authenticated billing status, browser UI, actual webhook delivery or a payment lifecycle.


### Completed Credential Rotation

The user completed expiration of the old live restricted key. Current Stripe Dashboard inventory shows one active key, the saved replacement; the old key is absent. The replacement was matched to the one-time visible key and securely saved directly to `.env`, then successfully read the intended account and required billing resources through the official SDK. All 11 required local server billing variables are present exactly once. No credential value is included in this document or release evidence.
