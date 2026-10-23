# Stripe Billing Release Evidence — October 23, 2026

The user approved Import And Deploy. The nine missing Production variables, billing/feature migration, guarded Starter copy and matching frontend/API are released. Payment and genuine webhook reconciliation outcomes remain untested.

| Item | Confirmed Result |
| --- | --- |
| Canonical URL | https://spellingspells.com |
| Deployment | `dpl_5XxZN4BCwTqcuUUYaJ4VgmiE2N4M`, Production, READY |
| Deployment URL | https://spelling-spells-b4bfagt0n-piratechs.vercel.app |
| Build | 53 seconds; 97 static routes, 30 published spells, five universes and the billing API function |
| Web bundle | `entry-b19496809ccef32dd5fb7139fc32e75b.js` |
| Source | Authorized dirty `main` working tree based on `270787a55090bf6973b35b5f8adeae803fd8c1f6`; no commit or branch created |
| Vercel target | Team `team_2hW8Z1s5cxdaS56fE1tnAMI9`, project `prj_Rkxn2SjuJtRsjHh4BiYyNs2qEJ0O` |
| Stripe | Live account `acct_1URo3fKwCE6Umy8w`; approved Starter price USD 100 cents/month |
| Supabase | Project `qtfajiuilwdtywkklbjq`; applied `20261023202432_stripe_billing_entitlements.sql` |
| Migration SHA256 | `38AB1228A7C33B538B625DE5E5F1E7100312B27F1FBBCCBEDDBBCD4F59141CD2` |
| Starter copy | Revision 3; price, identity and features retained; unsupported ad-removal claim removed |
| Credentials | Replacement saved locally and supplied to Vercel by the user; old key expired and absent from active inventory |

All 11 billing environment names are present in Production. The nine approved values were imported through stdin without printing credentials. Existing hosted Stripe/Supabase keys were preserved. Local environment files remain ignored and excluded from uploads.

## Database And Runtime Evidence

- All ten new tables have RLS enabled and no anonymous, authenticated or service-role direct writes. Private billing tables deny client reads; own entitlement and Grimoire reads are account-scoped.
- Dispatcher/own-account RPCs, Owner archive controls, fixed search paths and guarded Contact/Notifications wrappers match the reviewed contract. Legacy public invoker wrappers cannot bypass denied private implementations.
- Two tier records match the catalog with zero rank mismatches; both synchronization triggers are enabled. Features is version 2/revision 2. Grimoire requires Starter for writes, the Theme policy was preserved, and all five realtime feeds are published.
- Both existing accounts retain Free access with no missing entitlement mirrors. Billing bindings, attempts, subscriptions, events and cloud Grimoires were empty at readback.
- Canonical Pricing, billing return, Terms, Privacy and Help return 200 with the exact final bundle; the updated disclosures appear in delivered HTML.
- Hosted status requires sign-in with private/no-store JSON; Checkout/webhook reject GET, unknown operations return 404, and missing/invalid webhook signatures return 400.
- Public Data API Features/tier/plan reads succeed, anonymous entitlement/dispatcher calls are denied, and a service-only event-existence read returns false without writing an event.

Evidence: [database readback](stripe-billing-database-2026-10-23.json), [hosted readback](stripe-billing-hosted-2026-10-23.json), [configuration record](stripe-billing-config-2026-10-23.json), [setup guide](../stripe-billing-setup-2026-10-23.md).

## Validation Limits

The first staged build reported three API TypeScript errors despite returning READY; it was never promoted. Those errors were fixed, and the promoted builds completed without reported TypeScript errors. The final correction removed an Owner pricing shortcut and aligned billing/privacy/help disclosures with the released behavior. Owner administration and the hidden avatar plan pill remain independent of consumer feature eligibility.

The hosted install reported seven dependency advisories: three moderate and four high, plus Node engine-range and Parcel watcher install-script warnings. No dependency remediation was attempted. Historical runtime error logs were not scanned.

No standalone typecheck/test suite, browser UI/native verification, authenticated billing status check, Customer/Checkout/Portal creation, actual Stripe webhook delivery or payment/subscription/refund/cancellation lifecycle test was performed. Signature rejection does not prove genuine delivered-event reconciliation. No financial transaction was created.

The local migration now uses Supabase's authoritative applied version, preserving its reviewed bytes and avoiding duplicate DDL on a future CLI push. An app rollback does not reverse the schema/provider resources; retain coordinated Features version 2 consumers.
