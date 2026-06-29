# Production GO-4 Lemon Live Verification

Date: 2026-06-29
Operator: Codex over local read-only Lemon API and `ubuntu` SSH
Branch: `fix/full-vps-audit-p0-p1`
Preflight commit: `5b5f2a1`
Validator fix commit: `6c8d713`
Production touched: **NO**
DB migrations applied: **NO**
Env changed: **NO**
Lemon changed: **NO; READ-ONLY API INVENTORY ONLY**
DNS/firewall changed: **NO**
Nginx changed: **NO**
Auth/signup changed: **NO**
AI changed: **NO**
Secrets exposed: **NO**

## Scope and verdict

GO-4 stopped safely before dashboard mutation, production env change, ledger migration, checkout or payment. The available Lemon API context exposes only test-mode objects and no approved live credential source is available. Production remains fail-closed.

```text
GO-4_LEMON_LIVE_VERIFIED: NO
GO-4_ABORTED_SAFE: YES
ROLLBACK_PERFORMED: NO
LEMON_MODE_AFTER_ABORT: disabled
OVERALL_PRODUCTION_VERDICT_AFTER_GO4: FAIL_P0
```

## Prerequisites

### GO-1 backup

- Dump present: YES.
- Size: `213575801` bytes.
- SHA-256 matches GO-1: YES.
- `pg_restore -l`: PASS, 967 lines.

### GO-2 fail-closed

Active before and after GO-4 preflight:

```text
COUNTRY_SIGNUP_MODE=disabled
LEMON_MODE=disabled
AI_GUEST_ACCESS_ENABLED=0
```

### GO-3 DBSEC

- Regression SQL: PASS.
- Forbidden anon/authenticated grants: 0.
- RLS enabled: 3 of 3.
- `public.schema_migrations`: 54.
- `auth.schema_migrations`: 76.

## Snapshot

Root-only snapshot:

```text
/root/scholarshiptop-go4-lemon-snapshot-20260629T013929Z
```

- Full production env snapshot retained root-only.
- Container inspect/log baseline retained.
- Payment DB aggregates retained without PII.
- Compose and Nginx checksums retained.
- Production env SHA-256 before/after abort: identical.

Container/image before and after:

```text
scholarshiptop-site: running/healthy
restart count: 0
image: sha256:d0730a798ada8dcf25ab6ebd351ef33ff0cc2d0e0eb5ef5927f5bf160e98dce3
```

## Payment DB baseline

```text
subscriptions total: 4
subscriptions with provider=lemon_squeezy: 4
active/on_trial/cancelled rows: 2
IQ report orders total: 24
IQ pending rows: 23
provider_webhook_events table: absent
claim_provider_webhook_event function: absent
```

No production payment row changed.

## Code validation

| Command | Result |
|---|---|
| `npm run build` | PASS, 97.5s |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS with known baseline warnings |
| `npm run test:webhooks` | PASS, 33/33 |
| `npx tsx --test lib/payments/__tests__/*.test.ts` | PASS, 50/50 |
| `npx tsx --test lib/security/__tests__/*.test.ts` | PASS, 11/11 |
| Provider ledger disposable up/idempotency/ACL/down | PASS |

The documented command `npx tsx scripts/validate-lemon-live-config.ts` initially failed before provider access because top-level await was transformed as CJS. Commit `6c8d713` wraps execution in an async `main()`. TypeScript and lint pass after the fix. The fix is committed locally and was not deployed because production runtime does not need it for the safe abort.

## Lemon read-only inventory

Available API credential fingerprint: `b6abf047f821` (SHA-256 prefix; secret not printed).

Store:

```text
id: 336165
name: ScholarshipTop
currency: USD
```

The available API context is test-mode only.

Configured legacy test variants:

| Plan | ID | Price | Status | test_mode |
|---|---:|---:|---|---|
| Monthly | `1533124` | USD 25.00 | published | true |
| Quarterly | `1533115` | USD 57.00 | published | true |
| Yearly | `1511520` | USD 144.00 | published | true |

Additional variants visible to the same test API context:

| Plan | ID | Price | Status | test_mode |
|---|---:|---:|---|---|
| Monthly | `1534062` | USD 25.00 | published | true |
| Quarterly | `1534061` | USD 57.00 | published | true |
| Yearly | `1534060` | USD 144.00 | published | true |

These additional IDs are not live candidates: provider detail explicitly reports `test_mode:true`.

Legacy `.env.production` contains possible live IDs:

```text
monthly: 1533798
quarterly: 1533797
yearly: 1533796
IQ: 1566269
```

The test API credential returns 404 for these IDs, so their existence, store, prices, status and `test_mode:false` cannot be verified. They were not copied to production env.

## Webhook inventory

Only test-mode webhook objects are visible:

```text
id 88139: https://annotate-scorn-spotted.ngrok-free.dev/api/webhooks
id 91091: empty URL
```

Both report `test_mode:true`. No live VPS webhook object or live webhook secret could be verified. No endpoint was created, edited, disabled or deleted.

## Validator results

Read-only validation using the available test API key:

```text
1534062/1534061/1534060 as live:
  monthly/quarterly/yearly -> FAIL provider=mode_mismatch

1533798/1533797/1533796 with test API key:
  monthly/quarterly/yearly -> FAIL provider=http
```

Therefore `LIVE_VARIANTS_VERIFIED_TEST_MODE_FALSE` cannot be set to YES.

## Durable ledger readiness

Reviewed migration:

```text
supabase/migrations/20260628102000_provider_webhook_event_ledger.sql
normalized SHA-256: 0f6fb573217add5e57aebe981dab0babcd982d50a807648f9fb8b325e2e3327b
```

Disposable PostgreSQL rehearsal:

- Up: PASS.
- First claim / duplicate / failed retry: PASS.
- anon/authenticated ACL denial: PASS.
- service_role function access: PASS.
- Down: PASS.
- Rehearsal DB removed.

Production migration applied: **NO**. It is not useful to mutate production before a valid live contour exists.

There is also a code-level acceptance blocker for a subscription canary: the durable provider ledger is called only inside the IQ `order_created` handler. Subscription entitlement events use stored payload/fingerprint comparison but do not create a `provider_webhook_events` ledger row. The GO-4 requirement that the subscription canary have a durable ledger row and retry proof therefore needs a scoped webhook code change/deploy or an explicitly approved IQ-only canary.

## Production env

Before and after:

```text
LEMONSQUEEZY_API_KEY: missing
LEMONSQUEEZY_STORE_ID: missing
LEMON_VARIANT_*_LIVE: missing
LEMON_WEBHOOK_SECRET_LIVE: missing
LEMON_MODE: disabled
```

The production env file is byte-for-byte unchanged.

## Canary, retry and refund

```text
CANARY_PAYMENT_CREATED: NO
CANARY_WEBHOOK_RECEIVED: NO
CANARY_ENTITLEMENT_CREATED_ONCE: NO
DUPLICATE_RETRY_IDEMPOTENT: NO
REFUND_COMPLETED: NO
RECONCILIATION_PASS: NO
```

No approved canary user/payment method was provided. No checkout URL, order, subscription, webhook delivery, refund or provider-side object was created. No real account was touched.

## Safe-abort smoke

- Homepage: 200.
- Subscription page: 200.
- Unsigned webhook: 503 disabled.
- Site: running/healthy, restart count 0.
- DBSEC: unchanged.
- Auth fail-closed: unchanged.
- AI guest disabled: unchanged.
- Provider ledger: absent.
- Compose checksum unchanged: `7b3c430c5f630f052a12687ddca6c6191f9e2365d125f15b7a2a2cf949a9200c`.
- Nginx tree checksum unchanged: `84fdd58c134cfb38d51c2faf4cf6ccd6be86e949b04369c09b4dcb0d85b1b169`.

## Rollback

Rollback ready: YES.

Rollback performed: NO, because production and Lemon provider state were not changed. The system is already in the required immediate-safe state:

```text
LEMON_MODE=disabled
checkout unavailable
webhook disabled
```

## Required inputs for GO-4 retry

1. Provide a live-mode Lemon API key through an approved secret file or secret manager, not chat.
2. Verify or create live monthly/quarterly/yearly variants and optionally the IQ live variant in that live API context.
3. Create a live webhook at `https://scholarshiptop.com/api/webhooks` with a new secret and required events.
4. Resolve the subscription-ledger integration gap, or explicitly approve an IQ-only canary that uses the existing ledger path.
5. Identify an approved canary test user without creating/resetting a production account.
6. Provide action-time approval and a human-controlled payment method for the one real purchase.

Dashboard access from this execution environment is blocked by network policy, so a live API key is required for automated continuation or the dashboard setup must be completed by an authorized human and then verified through the live API.

## Final verdict

```text
GO-4_LEMON_LIVE_VERIFIED: NO
GO-4_ABORTED_SAFE: YES
LEMON_MODE_LIVE_ACTIVE: NO
LIVE_VARIANTS_VERIFIED_TEST_MODE_FALSE: NO
LIVE_WEBHOOK_ON_VPS_VERIFIED: NO
WEBHOOK_SECRET_ACTIVE: NO
CANARY_PAYMENT_CREATED: NO
CANARY_WEBHOOK_RECEIVED: NO
CANARY_ENTITLEMENT_CREATED_ONCE: NO
DUPLICATE_RETRY_IDEMPOTENT: NO
REFUND_COMPLETED: NO
RECONCILIATION_PASS: NO
ROLLBACK_READY: YES
ROLLBACK_PERFORMED: NO
DBSEC_UNCHANGED: YES
AUTH_FAIL_CLOSED_UNCHANGED: YES
AI_GUEST_DISABLED_UNCHANGED: YES
NO_NEW_P0_LOGS: YES
OVERALL_PRODUCTION_VERDICT_AFTER_GO4: FAIL_P0
```

## Next recommended stage

Retry GO-4 only after the six required inputs above. Do not start unrelated P1/P2 work automatically.
