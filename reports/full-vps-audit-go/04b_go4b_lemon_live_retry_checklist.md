# GO-4B Lemon Live Retry Checklist

Status: NOT AUTHORIZED / NOT RUN
Scope: future production payment GO only
Default emergency switch: `LEMON_MODE=disabled`

## Required Owner Inputs

- [ ] Live Lemon API key delivered through a protected file or secret manager, never chat.
- [ ] Live monthly, quarterly, and yearly variant IDs.
- [ ] Test variant IDs for live/test collision validation.
- [ ] Expected monthly, quarterly, and yearly prices in minor units.
- [ ] Expected three-letter currency.
- [ ] Live webhook secret or explicit permission to create the live webhook.
- [ ] Approved canary user and payment method.
- [ ] Approved canary refund policy.
- [ ] Explicit GO for one live payment and refund.

Use [go4-live.env.example](../../ops/vps/go4-live.env.example) as the schema. Store the populated file outside Git with mode `0600`.

## Gate 1: Read-Only Lemon Validation

- [ ] Run `npx tsx scripts/validate-lemon-live-config.ts --env-file /protected/go4-live.env`.
- [ ] Confirm only the API-key fingerprint is printed, never the key.
- [ ] `LIVE_API_KEY_PRESENT: YES`.
- [ ] `STORE_VERIFIED: YES`.
- [ ] `LIVE_VARIANTS_VERIFIED_TEST_MODE_FALSE: YES`.
- [ ] `LIVE_TEST_IDS_DISTINCT: YES`.
- [ ] `PRICES_CURRENCY_VERIFIED: YES`.
- [ ] `WEBHOOK_ON_VPS_VERIFIED: YES`.
- [ ] `SAFE_TO_ENABLE_LEMON_MODE_LIVE: YES`.

The validator performs GET requests only. Any `NO`, API error, missing field, or mismatch blocks GO-4B.

## Gate 2: Deploy While Disabled

- [ ] Reconfirm the validated GO-1 dump is available and restorable.
- [ ] Deploy the reviewed GO-4A code with production `LEMON_MODE=disabled`.
- [ ] Apply only `20260628102000_provider_webhook_event_ledger.sql`, then `20260629134500_subscription_webhook_event_ledger.sql`.
- [ ] Confirm `anon` and `authenticated` have no table/function access.
- [ ] Confirm `service_role` can claim, complete, and read ledger rows.
- [ ] Run application, GoTrue, PostgREST, and log smoke checks.
- [ ] Confirm no checkout is available while the mode remains disabled.

Before any live event and only when the ledger is empty, the reviewed down migration may be used. Take a fresh DB snapshot first.

## Gate 3: Live Webhook And Enablement

- [ ] Under a separate production GO, create or verify the exact webhook URL `https://scholarshiptop.com/api/webhooks`.
- [ ] Confirm webhook `test_mode:false` and required subscription/order events.
- [ ] Put the live secret and validated IDs/prices into the production secret file.
- [ ] Re-run the read-only validator from the final production values.
- [ ] Set `LEMON_MODE=live` only after every prior check passes.
- [ ] Run a no-purchase checkout smoke and confirm the selected live variant.

## Gate 4: One Canary

- [ ] Perform exactly one approved live canary purchase.
- [ ] Confirm one `provider_webhook_events` row with `status=processed`.
- [ ] Confirm the row has the expected provider event/order/subscription IDs and payload hash.
- [ ] Confirm one subscription row and one entitlement update.
- [ ] Confirm the expected email and Telegram notification occur once.
- [ ] Replay/retry the same signed webhook through the approved provider mechanism.
- [ ] Confirm duplicate success, one ledger row, and no repeated entitlement or notification.
- [ ] Confirm application and payment logs contain no unhandled errors or secret/PII output.

## Gate 5: Refund And Reconciliation

- [ ] Perform the explicitly approved refund.
- [ ] Confirm refund webhook ledger row reaches `processed`.
- [ ] Confirm entitlement and subscription state match the approved refund policy.
- [ ] Reconcile Lemon order, subscription, ledger, application subscription, profile entitlement, and notifications.
- [ ] Record identifiers only in the protected evidence store; redact PII and secrets from reports.

## Emergency Rollback

1. Set `LEMON_MODE=disabled` and verify checkout is fail-closed.
2. Keep `provider_webhook_events`; do not drop or rewrite live ledger history.
3. Roll back application code only after preserving logs and reconciling the canary.
4. Do not run the down migration after any live event. Use a forward fix instead.
5. Reconcile payment/refund state manually before declaring recovery.
