# Lemon Squeezy Webhooks

This project creates Lemon Squeezy overlay checkouts, verifies webhooks, syncs
`public.subscriptions`, and updates `public.profiles` entitlement fields.

## Endpoint

- `POST /api/webhooks`

## Required env vars

- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_STORE_ID`
- `LEMONSQUEEZY_MONTHLY_VARIANT_ID`
- `LEMONSQUEEZY_QUARTERLY_VARIANT_ID`
- `LEMONSQUEEZY_YEARLY_VARIANT_ID`
- `LEMONSQUEEZY_SUCCESS_URL` (optional, defaults to `/scholarships`)
- `LEMON_SQUEEZY_WEBHOOK_SECRET` — **signing secret** from Lemon **Settings → Webhooks → [your endpoint]** (the string you chose when creating the webhook; 6–40 characters). Used for `X-Signature` HMAC. **Not** the Lemon REST API key.
- `LEMON_SQUEEZY_SECRET` — optional second candidate: only if you store another signing secret here; the handler tries **both** distinct values so a mis-set API key in one var does not block verification.
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SITE_URL` (used for links in transactional emails from the webhook)
- `RESEND_API_KEY` and `RESEND_FROM` (optional; if unset, subscription status emails are skipped — DB sync still succeeds)

## Transactional emails (Resend)

After a successful entitlement update, the handler may send:

- **Subscription active** — on `subscription_created`, `subscription_resumed`, or `subscription_unpaused`, when the user is considered subscribed (active / trialing / on_trial).
- **Subscription cancelled** — on `subscription_cancelled` only (not on every `subscription_updated` or renewal).

Renewals and generic updates do not trigger the “active” email, so users are not emailed on each billing cycle.

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
- `subscription_payment_success`
- `subscription_payment_failed`
- `subscription_payment_recovered`

Unknown events are acknowledged with `{ received: true, ignored: true }`.

## Checkout flow

- Frontend loads `https://app.lemonsqueezy.com/js/lemon.js`
- Pricing buttons open Lemon overlay with a server-created checkout URL
- Checkout creation embeds:
  - `checkoutData.email`
  - `checkoutData.custom.user_id`
  - `checkoutOptions.embed = true`
  - `productOptions.redirectUrl` pointing to the success URL

## User id resolution

The handler reads user id from:

- `data.attributes.user_id`
- `data.attributes.userId`
- `data.attributes.custom_data.user_id`
- `data.attributes.custom_data.userId`
- `meta.custom_data.user_id`
- `meta.custom_data.userId`
