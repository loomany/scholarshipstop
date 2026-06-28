# 04. PAY-001 fix

Issue IDs covered: `PAY-001`, `PAY-003`  
Production touched: **NO**  
Secrets exposed: **NO**

## Local mitigation

- `LEMON_MODE` defaults to disabled. Production rejects `test` mode unconditionally.
- Subscription variants use only explicit `LEMON_VARIANT_<PLAN>_<LIVE|TEST>` names; legacy/public fallback is removed.
- All three selected-mode IDs must exist, be numeric and distinct; matching live/test IDs fail validation.
- Live/test webhook secrets are separate and selected only by mode.
- Before checkout or plan mutation, a read-only Lemon variant GET verifies provider `test_mode` and store relationship.
- Hosted/hardcoded checkout fallbacks are removed. Any config/provider failure returns a clear unavailable state and creates no checkout.
- Unknown plan parsing is explicit; preferred-plan fallback is now monthly instead of quarterly.
- Webhook rejects requests when the mode-specific secret is not configured.

## Files changed

- `lib/payments/lemonRuntimeConfig.ts`
- `lib/payments/lemonVariantIds.ts`
- `app/actions/billing.ts`
- `app/api/billing/update-subscription/route.ts`
- `app/api/webhooks/route.ts`
- `lib/payments/__tests__/lemonRuntimeConfig.test.ts`
- `lib/payments/__tests__/lemonCheckoutSecurityContract.test.ts`
- `scripts/validate-lemon-live-config.ts`
- `.env.example`, `.env.local.example`

## Commands run

- Payment config/security tests.
- Existing webhook tests and TypeScript/build are recorded at P0 gate.

## Tests passed/failed

- Payment config/security contract tests: **8 PASS, 0 FAIL**.
- `npx tsc --noEmit`: **PASS**.
- Existing webhook suite/full build: pending P0 gate.

## Lemon dashboard checklist after GO

1. Create/verify three live variants; confirm API returns `test_mode:false` and expected store.
2. Set separate test variants; no live ID may equal its test counterpart.
3. Create live webhook `https://scholarshiptop.com/api/webhooks` with a new live secret and required subscription/order events.
4. Disable production use of empty/ngrok/Railway endpoints; retain test endpoint only in test mode.
5. Set VPS `LEMON_MODE=live`, live IDs and live secret; keep test values separate.
6. Run `scripts/validate-lemon-live-config.ts` before enabling checkout.

## Canary after separate GO

One approved minimum live payment, one webhook entitlement, duplicate retry with no duplicate side effect, refund and reconciliation. No canary was run in this stage.

## Rollback plan

Set `LEMON_MODE=disabled` first, redeploy the known-safe image, and disable the new live endpoint/variants if provider state is wrong. Reconcile the single canary order manually. Never roll back to legacy test IDs or hosted hardcoded URLs.

## Remaining risks

- Live dashboard/webhook/canary are not configured or tested because no GO was provided.
- Durable provider event ledger is still Stage 8; current subscription fingerprint dedupe is not transactionally race-proof.
- IQ checkout has its own legacy variant path and remains `PAY-002` until Stage 8.
