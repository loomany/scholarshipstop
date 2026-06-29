# GO-4A Subscription Ledger Integration + Lemon Live Readiness

Date: 2026-06-29T13:45:38+05:00
Operator: Codex
Host: `DESKTOP-7QKRE0K2`
Branch: `fix/full-vps-audit-p0-p1`
Base commit: `457d81aeccb372e5e0d5790d5a8131130156a9805`
Code commit: `bc05819` (`fix(payments): add durable subscription webhook ledger`)
Readiness/report commit: this report's commit
Production touched: NO
DB migrations applied live: NO
Lemon changed: NO
DNS/firewall/Nginx changed: NO
Secrets exposed: NO

## Scope

Code and readiness only. No production SSH, deployment, environment change, live migration, Lemon mutation, checkout, payment, refund, user creation, signup/reset/OAuth, DNS, firewall, or Nginx action was performed.

## Current Issue

GO-4 was safely aborted because only a test-mode API context was available, live variants and the VPS webhook could not be verified, no approved canary inputs existed, and subscription events did not use the durable provider ledger.

Before GO-4A, the IQ `order_created` branch claimed `provider_webhook_events`. Subscription events relied on a stored payload/fingerprint check after entering business logic. Entitlement upserts, admin email, customer email, and Telegram effects were therefore outside a durable provider-event claim. A generic subscription `order_created` could also enter the IQ configuration branch.

## Files Changed

- `app/api/webhooks/route.ts`: exact subscription validation and claim-before-business integration; IQ routing/signature update.
- `lib/payments/providerWebhookLedger.ts`: claim, duplicate acknowledgement, processed completion, failed/retry handling.
- `lib/payments/lemonSubscriptionEventValidation.ts`: store/mode/variant/amount/currency/provider/user validation and stable event identity.
- `lib/payments/lemonInvoiceWebhookEnrichment.ts`: retryable invoice enrichment while preserving event/amount/currency.
- `lib/payments/lemonRuntimeConfig.ts`, `.env.example`: explicit subscription price and currency config.
- `lib/payments/lemonSubscriptionState.ts`: entitlement plan comes from the validated variant mapping.
- `supabase/migrations/20260629134500_subscription_webhook_event_ledger.sql` and matching rollback.
- Payment/webhook tests, disposable PostgreSQL test, read-only Lemon validator, protected env example, and GO-4B checklist.

## DB Migration

Base migration: `20260628102000_provider_webhook_event_ledger.sql` (unchanged).
Extension migration: `20260629134500_subscription_webhook_event_ledger.sql`.
Rollback: `20260629134500_subscription_webhook_event_ledger.down.sql`, then the base down migration if the whole ledger is being removed pre-live.

Final schema includes `provider`, `event_id`, `event_type`, nullable provider order/subscription IDs, `status`, `attempts`, `payload_hash`, immutable `first_seen_at`, `last_attempt_at`, `processed_at`, `last_error`, and the existing unique provider/event constraint after column rename.

ACL evidence from disposable PostgreSQL:

- `anon`: table select NO; claim execute NO.
- `authenticated`: table select NO.
- `service_role`: table privilege YES; actual security-definer claim PASS.
- First claim PASS; duplicate claim denied; processed reclaim denied; failed reclaim PASS with attempts incremented.
- Both up migrations and both down migrations PASS.

## Subscription Webhook Changes

Covered events: `order_created`, `order_refunded`, subscription created/updated/deleted/cancelled/resumed/expired/paused/unpaused/plan-changed, and payment success/failed/recovered/refunded.

Processing order:

1. Verify Lemon signature using the secret selected by explicit mode.
2. Route only orders with `iq_report_id` to the IQ handler.
3. Enrich subscription-invoice events through read-only Lemon GET; enrichment failure returns retryable 500.
4. Validate store, live/test mode, configured variant, charge amount/currency, provider IDs, and UUID user mapping.
5. Claim the durable provider event.
6. Return 200 duplicate before DB updates or notifications when already claimed/processed.
7. Apply idempotent subscription/profile updates, then existing email/Telegram effects.
8. Mark processed on terminal success; mark failed on thrown/5xx processing and allow reclaim.

Lifecycle events commonly contain no charge total; their plan is validated by exact variant ID. Order/payment events require exact minor-unit amount and currency. The read-only live validator separately verifies the configured provider variant prices and store currency.

Post-update notifications remain best-effort by existing design: a notification exception is logged and does not roll back a successful entitlement. This avoids replaying a notification that may already have been delivered. DB/business 5xx paths are marked failed and retryable.

## Idempotency Proof

- First event: one claim, one entitlement callback, one email counter, one Telegram counter, final `processed`.
- Duplicate event: 200 `{received:true, duplicate:true}`, callback not entered, all counters remain one.
- Failed event: handler 500 marks `failed`; next delivery reclaims it; attempts become two; final state is `processed`.
- Thrown handler and processed-completion failure both leave a retryable `failed` record.
- Existing subscription upserts and profile upserts remain idempotent on a failed business retry.

## Tests

| Command | Result |
|---|---|
| `npm run build` | PASS, production build and 206 static pages |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS with existing baseline warnings only |
| `npm run test:webhooks` | PASS, 45/45 |
| `npx tsx --test lib/payments/__tests__/*.test.ts` | PASS, 64/64 |
| `npx tsx --test lib/security/__tests__/*.test.ts` | PASS, 11/11 |
| `scripts/vps-migration/tests/provider-webhook-ledger.test.sh` via Git Bash | PASS, disposable PostgreSQL up/claim/reclaim/ACL/down |
| `npm audit --omit=dev` | FAIL, 5 existing advisories: 3 low, 1 moderate, 1 high; breaking upgrades proposed |

The audit advisories are outside GO-4A's payment-ledger scope and were not auto-fixed or hidden. No new dependency was added.

## Lemon Readiness

Owner inputs still required: protected live API key, live and test variant IDs, live webhook secret/creation authority, exact plan prices/currency, approved canary user/payment method, refund policy, and explicit live payment/refund GO.

Expected protected input schema: `ops/vps/go4-live.env.example`. Populated files are covered by `.gitignore`; Unix mode must be `0600`.

Read-only validator test with the existing test credential (fingerprint `b6abf047f821` only):

```text
LIVE_API_KEY_PRESENT: YES
STORE_VERIFIED: YES
LIVE_VARIANTS_VERIFIED_TEST_MODE_FALSE: NO
LIVE_TEST_IDS_DISTINCT: YES
PRICES_CURRENCY_VERIFIED: YES
WEBHOOK_ON_VPS_VERIFIED: NO
SAFE_TO_ENABLE_LEMON_MODE_LIVE: NO
```

This is the expected safe result: the accessible variants/webhooks are test-mode and no exact live VPS webhook is visible. Live-key validation: NOT RUN because no live credential was supplied through a protected channel.

## Production Status

```text
PRODUCTION_CHANGED: NO
LEMON_CHANGED: NO
DB_MIGRATIONS_APPLIED_LIVE: NO
LEMON_MODE_LIVE: NO
CANARY_PAYMENT: NO
REFUND: NO
```

Live production remains the prior audited state. GO-4A does not change the overall production verdict to live-fixed.

## Rollback

Pre-live only, after a fresh verified backup and with no live ledger rows:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/rollbacks/20260629134500_subscription_webhook_event_ledger.down.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/rollbacks/20260628102000_provider_webhook_event_ledger.down.sql
```

After any live event: do not drop the ledger. Set `LEMON_MODE=disabled`, preserve ledger/log evidence, reconcile the canary, and use a forward migration/code fix.

## Verdict

```text
GO-4A_CODE_READY_FOR_GO4_RETRY: YES
PRODUCTION_CHANGED: NO
LEMON_CHANGED: NO
DB_MIGRATIONS_APPLIED_LIVE: NO
SUBSCRIPTION_LEDGER_READY: YES
SUBSCRIPTION_IDEMPOTENCY_TESTED: YES
ROLLBACK_READY: YES
LIVE_INPUTS_STILL_REQUIRED: YES
```

Next stage: GO-4B Lemon live retry, only after protected live inputs and a separate explicit production/payment/refund GO. Follow `04b_go4b_lemon_live_retry_checklist.md` in order.
