# Lemon Squeezy Webhooks

This project creates Lemon Squeezy overlay checkouts, verifies webhooks, syncs
`public.subscriptions`, and updates `public.profiles` entitlement fields.

## Endpoint

- `POST /api/webhooks`

## Required env vars

- `LEMON_SQUEEZY_WEBHOOK_SECRET` — **signing secret** from Lemon **Settings → Webhooks → [your endpoint]** (the string you chose when creating the webhook; 6–40 characters). Used for `X-Signature` HMAC. **Not** the Lemon REST API key.
- `LEMON_SQUEEZY_SECRET` — optional second candidate: only if you store another signing secret here; the handler tries **both** distinct values so a mis-set API key in one var does not block verification.
- `NEXT_PUBLIC_LS_MONTHLY_VARIANT_ID`
- `NEXT_PUBLIC_LS_QUARTERLY_VARIANT_ID`
- `NEXT_PUBLIC_LS_YEARLY_VARIANT_ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SITE_URL` (used for links in transactional emails from the webhook)
- `RESEND_API_KEY` (if unset, subscription status emails are skipped — DB sync still succeeds). `RESEND_FROM` is optional (defaults to `ScholarshipTop <hello@mail.scholarshiptop.com>`). Optional `REPLY_TO_EMAIL` sets Resend `reply_to` on transactional sends.
- `LEMONSQUEEZY_API_KEY` — **recommended in production.** Used when Lemon delivers `subscription_payment_success` / `subscription_payment_recovered` as a **subscription-invoices** body (no variant/status fields). The webhook handler then **GET**s `https://api.lemonsqueezy.com/v1/subscriptions/:id` and runs the same upsert as `subscription_updated`, so plan upgrades and trial conversions update `profiles` even if a full `subscription_updated` event is delayed or missing.

Legacy aliases `LEMONSQUEEZY_MONTHLY_VARIANT_ID`, `LEMONSQUEEZY_QUARTERLY_VARIANT_ID`, and `LEMONSQUEEZY_YEARLY_VARIANT_ID` are also accepted for server-side tier inference, but `NEXT_PUBLIC_LS_*` is the canonical naming used by the current app code.

## Transactional emails (Resend)

After a successful entitlement update, the handler may send:

- **Subscription active / welcome** — **off by default.** Lemon Squeezy already sends purchase/receipt email; duplicating it from Resend spams users. Set `SUBSCRIPTION_RESEND_WELCOME_ON_PURCHASE=1` to enable the legacy template on subscribe/resume/unpause/plan change (and the `subscription_updated` “within 5 minutes of `created_at`” fallback when Lemon omits `subscription_created`).
- **Subscription cancelled** — on `subscription_cancelled` only (not on every `subscription_updated` or renewal).
- **Payment failed** — on `subscription_payment_failed` (update card / billing).

Renewals do not trigger marketing-style emails.

The cancelled email uses Lemon’s `customer_portal` / `customer_portal_update_subscription` URL from the webhook when present; otherwise it falls back to `{NEXT_PUBLIC_SITE_URL}/subscription`.

## Signature validation

The webhook handler verifies `X-Signature` using HMAC SHA256 (hex) over the **raw** request body, against the signing secret(s) in env.

If you see `400 Invalid signature` in Lemon’s delivery log, the value in `LEMON_SQUEEZY_WEBHOOK_SECRET` (or `LEMON_SQUEEZY_SECRET`) does not match the signing secret for that webhook in the Lemon dashboard—often because the **API key** was pasted instead of the **webhook signing secret**.

- Missing/invalid signature → `400 Invalid signature`
- Missing any webhook secret → `500 Webhook secret is not configured.`

## Handled events

- `order_created` -> acknowledged, but ignored for entitlement sync because
  `subscription_created` carries the subscription state
- `subscription_created`
- `subscription_updated`
- `subscription_deleted`
- `subscription_cancelled`
- `subscription_resumed`
- `subscription_expired`
- `subscription_paused`
- `subscription_unpaused`
- `subscription_plan_changed`
- `subscription_payment_success`
- `subscription_payment_failed`
- `subscription_payment_recovered`
- `subscription_payment_refunded`
- `order_refunded`

Unknown events are acknowledged with `{ received: true, ignored: true }`.

## Checkout flow

- Frontend loads `https://app.lemonsqueezy.com/js/lemon.js`
- Pricing buttons open Lemon overlay with a server-generated hosted checkout URL
- The current server action appends:
  - `checkout[email]`
  - `checkout[custom][user_id]`
- The success path currently redirects the browser to `/scholarships` when Lemon reports `Checkout.Success`

### Hosted checkout URLs (avoid “Test mode” at pay domain)

The buy link is a **checkout UUID** in the path (`/checkout/buy/<uuid>`), not the numeric **variant id**. If that UUID still points at an old Test checkout, the overlay shows Test mode even when `NEXT_PUBLIC_LS_*` variant ids are updated.

Optional env overrides (full URL, same query params you use in Lemon):

- `LEMONSQUEEZY_CHECKOUT_URL_MONTHLY`
- `LEMONSQUEEZY_CHECKOUT_URL_QUARTERLY`
- `LEMONSQUEEZY_CHECKOUT_URL_YEARLY`

Copy each from **Lemon → Live store → Product → Variant → Share / checkout link**. When unset, `app/actions/billing.ts` falls back to built-in defaults (keep those in sync when you rotate checkouts).

`NEXT_PUBLIC_LS_*` variant ids must match the **same** Live variants webhooks send, or tier inference will be wrong.

## Access policy

- `subscription_cancelled` keeps access until `ends_at` / `current_period_end` / `renews_at`
- `subscription_payment_failed` maps to `past_due` and blocks access immediately (no grace period)
- `subscription_payment_refunded` revokes access immediately
- `subscription_payment_success` / `subscription_payment_recovered` **invoice** payloads: **`decideSubscriptionUpdate` alone** ignores them (no subscription object in the body). The **HTTP handler** may first enrich them via Lemon API (`LEMONSQUEEZY_API_KEY`) and treat the result like `subscription_updated` — required for reliable entitlement sync after upgrades when Lemon only sends the invoice event.
- `subscription_payment_refunded` invoice payloads remain ignored for entitlement sync (use subscription-object events or a future enrichment path if needed).
- `subscription_payment_failed` **invoice** webhooks still update DB to `past_due` (merge) and trigger the “payment failed” email / admin Telegram, deduped by invoice id.

## User id resolution

The handler reads user id from:

- `data.attributes.user_id`
- `data.attributes.userId`
- `data.attributes.custom_data.user_id`
- `data.attributes.custom_data.userId`
- `meta.custom_data.user_id`
- `meta.custom_data.userId`
