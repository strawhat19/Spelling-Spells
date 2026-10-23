# Stripe Billing Persistence

Applied migration: `supabase/migrations/20261023202432_stripe_billing_entitlements.sql`, recorded in Supabase as version `20261023202432`. Its reviewed SHA-256 is `38AB1228A7C33B538B625DE5E5F1E7100312B27F1FBBCCBEDDBBCD4F59141CD2`. The coordinated release preserves existing accounts, roles, catalog identities, feature policy values and device preview data. The migration creates no subscription, charge or cancellation. See the [database readback](releases/stripe-billing-database-2026-10-23.json) for actual application evidence.

## Environment And Authority

The explicitly selected scope is app `spelling-spells`, Stripe account `acct_1URo3fKwCE6Umy8w`, live mode. The private `billing_configuration` singleton fixes that scope independently of caller parameters. It is not automatically changed when a handler receives different credentials or a webhook from another mode. A deliberate environment cutover must update the private configuration and reconcile the new scope before claiming paid access. Private entitlement authority binds each mirror to its verified billing binding, so a test or previous account's paid mirror cannot grant access in the configured live scope.

`accounts.id` remains the app-owned account identity; `accounts.auth_uid` maps the verified Supabase Auth user. `accounts.role` and active status remain independent of billing. Owner administration remains available under the existing trusted Owner capability. Consumer feature audiences apply to Owners as saved, including their minimum plan.

Private billing tables have RLS enabled and no direct client or service-role table grants. The service role can call only the explicit persistence dispatcher; hosted handlers must independently authenticate user actions or verify webhook signatures and provider evidence. Ordinary clients cannot assign an entitlement. Provider credentials and Stripe customer, subscription, session, price and event identities do not enter public plan records or the entitlement projection.

## Server Dispatcher

`billing_operation(p_action text, p_payload jsonb)` is callable by `service_role` only and returns camelCase JSON. Scope fields are `appId`, `providerAccountId` and `livemode`. Binding lookup never adopts an arbitrary metadata match or customer email.

| Action | Payload | Result |
| --- | --- | --- |
| `acquire` | Scope, `authUid`, stable UUID `operationId` | Context and a durable `leaseToken`/`leaseUntil` |
| `read` | Scope, `authUid` | Context or null when no binding exists |
| `lookup` | Scope and verified `customerId`, `subscriptionId` or `sessionId` | Bound context or null; supplied references must all agree |
| `event` | Scope, `eventId` | `alreadyProcessed` |
| `approved_prices` | Scope, `authUid` | Complete historical approved attempt terms; rejects more than 100 attempts |
| `prepare_customer` | Lease | Context with the first durable `customerAttemptStartedAt`; requires an active account and never resets an uncertain attempt |
| `save_customer` | Lease, `customerId` | Updated context; a bound customer cannot be replaced |
| `prepare_attempt` | Lease, `planId`, `planSlug`, `planRevision`, `priceId`, `productId`, `amount`, `currency`, `interval` | Existing unresolved attempt or a newly persisted stable purchase attempt |
| `save_attempt` | Lease, `attemptId`, `sessionId`, `status` | Confirmed save |
| `clear_attempt` | Lease, `attemptId` | Confirmation only for an already expired/closed attempt |
| `commit` | Lease, `customerId`, `subscriptionId`, `subscriptionStatus`, `planSlug`, `state`, `validFrom`, `validUntil`, `cancelAtPeriodEnd`, optional verified event fields | Effective entitlement for an active account, or a saved unavailable result for an inactive account |
| `release` | Lease | Confirmed release |

“Lease” means `operationId` and `leaseToken`. One durable 90-second lease serializes billing operations for an account. A stale or conflicting token cannot persist provider results. Context includes account/binding/auth identities, current role/active status, binding `createdAt`, provider scope, bound customer/subscription and the unresolved purchase attempt. A separate nullable `customerAttemptStartedAt` distinguishes a binding that never prepared a provider call from an uncertain customer-creation attempt. The handler persists that first timestamp before a possible customer create and recovers provider state before retrying the same stable binding-derived idempotency key. Binding creation time alone does not authorize or block a retry; a timed-out customer call is not proof that no customer was created. Attempts retain immutable approved commercial terms and a stable provider idempotency key before Checkout is called. Starting a purchase attempt rechecks the current active account, while verified webhook reconciliation can still persist state for an inactive account.

Supported attempt states are prepared, open, complete, uncertain, expired, reconciled and closed. Repeating an already committed allowed state with its same session identity returns a confirmed no-op, including expiry recovery. Unknown provider outcomes stay unresolved. A completed or uncertain attempt is not replaced by another click. Closing an attempt requires a known session plus a persisted Free mirror with a provider-confirmed terminal subscription status (`canceled` or `incomplete_expired`). A completed Checkout's actual subscription must be retrieved and verified before closure; an empty subscription list is insufficient proof. Expiring or closing a local attempt is not an instruction to cancel a Stripe subscription. The server must first establish the actual provider outcome.

Commit accepts ISO timestamps for the entitlement window and optional `eventCreated`. It deduplicates verified events, protects unique reverse provider bindings, persists subscription history and updates mirror authority/state in the same transaction. Event creation timestamps are historical evidence, never the ordering mechanism. The handler must re-read current Stripe state while holding the lease and establish the approved price plus the matching paid invoice service period before asking SQL to grant paid access.

## Own Entitlement And Feature Tiers

Authenticated `own_billing_entitlement()` returns `state`, `planSlug`, `planName`, `validFrom`, `validUntil`, `cancelAtPeriodEnd`, `subscriptionStatus`, `revision` and `updatedAt`. Own-account reads require an active permanent account and its current live Auth session. Confirmed baseline/expired access resolves to Free; missing, unsupported or wrong-scope paid state cannot imply paid access. The public `account_entitlements` table is an own-account realtime mirror, with no client writes.

`pricing_plan_tiers` contains only stable plan ID, immutable slug, number and display order. The migration locks plan writes before backfilling; catalog row triggers keep ranks synchronized atomically, including inactive tiers. Owner `owner_archive_pricing_plan(p_id, p_expected_revision, p_expected_auth_uid)` now archives a plan instead of removing referenced identities. The legacy delete RPC delegates to that same authorized archive operation for compatibility. Feature settings migrate explicitly to version 2, preserving the original Theme Toggle boolean, description and role policy. The five keys are Theme Toggle, Marquee, Notifications, Contact and Grimoire Tools. Policies add `plans: null | [slug]` and `planMode: minimum`; actual catalog order and number define the minimum tier.

The three additional public features default to Free And Above. Grimoire Tools defaults to Starter And Above. Clearing that threshold is an explicit Owner policy allowing Free use; it does not assign a paid plan. Notification content/read-state actions and Contact intake evaluate their saved audience at SQL, while authorized Owner managers remain available.

## Private Grimoire

`get_grimoire(p_expected_auth_uid)` returns `{data, revision, updatedAt}`. Confirmed absence returns the existing version-1 empty model with revision 0. `save_grimoire(p_data, p_expected_revision, p_expected_auth_uid)` returns the same shape only after its save commits. Account locks and compare-and-swap revisions cover every whole-document path, including bulk imports, so client list lengths cannot manufacture capacity.

The current supported limits remain 50 collections, 500 unique spell references per collection, 2,000 note/practice entries, 4,000 characters per note and 80-character collection names. Collection IDs/numbers remain stable and monotonic. New spell references must be published; existing data is retained when a spell later becomes unpublished. Feature-ineligible or downgraded users can read/export existing data, remove collections/spells, clear notes and reset progress. They cannot add data, rename collections or advance practice. No database operation silently uploads the old device preview; import must remain an explicit user action.

## Evidence

The migration is applied to Supabase project `qtfajiuilwdtywkklbjq` under the configured live app/account scope. Readback confirmed RLS on all ten new billing/grimoire/tier tables and no direct anonymous, authenticated or service-role writes. Own-account read policies and the service-only dispatcher grants were present. All five required realtime publication members were present: `account_entitlements`, `account_grimoires`, `feature_settings`, `pricing_plan_feed` and `pricing_plan_tiers`.

The two catalog records matched the two tier projections with zero rank mismatches. Features is version 2/revision 2, and the guarded Starter copy update is revision 3 at USD 100 cents/month with `removes_ads=false`. Both existing accounts had Free entitlements, with no missing mirrors and no private billing bindings, subscriptions, attempts, events or grimoire records.

The [hosted readback](releases/stripe-billing-hosted-2026-10-23.json) confirmed anonymous entitlement/dispatcher denials with `42501`, a service-role event-existence result of `alreadyProcessed=false`, and public-safe Features/tier/plan reads. Matching deployment `dpl_5XxZN4BCwTqcuUUYaJ4VgmiE2N4M` is READY and promoted to `spellingspells.com`; canonical API checks confirmed private JSON authentication/method denials and rejection of unsigned or invalid webhook signatures.

Provider configuration, applied schema, hosted handler startup and these read/denial checks remain separate from authenticated account behavior, quota mutations, delivered webhook reconciliation and payment lifecycle evidence. No local database test, browser UI check, authenticated billing status check, actual webhook delivery, test transaction or live financial transaction was performed.
