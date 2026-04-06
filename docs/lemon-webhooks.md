# Lemon Squeezy Webhooks

This project updates `public.profiles.is_subscribed` from Lemon Squeezy subscription events.

## Endpoint

- `POST /api/webhooks`

## Required env vars

- `LEMON_SQUEEZY_SECRET` (preferred)
- `LEMON_SQUEEZY_WEBHOOK_SECRET` (fallback)
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`

## Signature validation

The webhook handler verifies `x-signature` using HMAC SHA256 over the raw request body.

- Missing/invalid signature -> `400 Invalid signature`
- Missing webhook secret -> `500 Webhook secret is not configured.`

## Handled events

- `subscription.created` -> `is_subscribed = true`
- `subscription.updated` -> `true` only when status is `active` or `trialing`
- `subscription.deleted` -> `is_subscribed = false`

Unknown events are acknowledged with `{ received: true, ignored: true }`.

## User id resolution

The handler reads user id from:

- `data.attributes.user_id`
- `data.attributes.userId`
- `data.attributes.custom_data.user_id`
- `data.attributes.custom_data.userId`
- `meta.custom_data.user_id`
- `meta.custom_data.userId`
