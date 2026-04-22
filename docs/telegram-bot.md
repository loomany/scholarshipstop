# Telegram Bot Setup

This project includes a Telegram bot webhook at [app/api/telegram/webhook/route.ts](app/api/telegram/webhook/route.ts).

## What It Does

- Shows a Telegram menu with:
  - `Find Scholarships` placeholder
  - `My Profile`
  - `Connect Account`
  - `Admin` for configured Telegram admins
- Connects Telegram to an existing ScholarshipTop account with a one-time code sent by email
- Sends admin Telegram alerts for:
  - new registrations
  - verified emails
  - payment/subscription events
  - first-touch visits, quiz completion, and other server-triggered events (per-category prefs)
- Optional: **new scholarship row** → message only to env admins (`TELEGRAM_ADMIN_IDS`), with a link to the grant (`POST /api/internal/scholarships/notify-admin-new`, secured by `SCHOLARSHIP_NEW_ADMIN_NOTIFY_SECRET`). See [New grant admin notify](#new-grant-admin-notify) below.

## Preflight (deploy)

```bash
npm run telegram:verify-env
```

Uses `.env.local` via `dotenv` (same pattern as other `telegram:*` scripts). Exit code `1` if `TELEGRAM_BOT_TOKEN` is missing. Warns if `TELEGRAM_WEBHOOK_SECRET` or admin IDs are absent.

## Required Env

Add these variables to `.env.local` (see also [.env.local.example](.env.local.example)):

```bash
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...
TELEGRAM_LINK_CODE_SECRET=...
TELEGRAM_ADMIN_IDS=200082134
```

- **`TELEGRAM_WEBHOOK_SECRET`** (strongly recommended in production): must match the `secret_token` you pass to Telegram’s `setWebhook`. If unset, the webhook URL is **not** authenticated (anyone who can `POST` to it can drive the bot). The app logs a one-time error in production when the first webhook request hits with no secret configured.
- **`TELEGRAM_LINK_CODE_SECRET`** is optional but recommended for email link codes.
- **`TELEGRAM_ADMIN_GALLERY_URLS`** (optional): comma- or newline-separated `https://` URLs. Adds “Скрин 1”, “Скрин 2”, … **url** buttons to admin alert messages (plain + HTML broadcasts) so you can open reference screenshots from the chat.

## Database

Apply the new migration:

```bash
npm run supabase:push
```

It creates:

- `public.telegram_users`
- `public.telegram_link_codes`
- `public.telegram_event_logs`

## Admin rights: env vs database

| Mechanism | Effect |
|-----------|--------|
| **`TELEGRAM_ADMIN_IDS` / `TELEGRAM_ADMIN_ID`** | Treated as admins for **env-scoped** features: e.g. `/seo`, `/seoreport`, `/testgrant`, `/testresources`, new-scholarship DB webhook audience, and some alert routing. Implemented via `getTelegramAdminIds()` in [lib/telegram/bot.ts](lib/telegram/bot.ts). |
| **`telegram_users.is_admin` in Supabase** | Full **profile** admin UI: Admin Panel, **Пользователи** (48h first-touch list), visitor cards, **Admin alerts** inline toggles, Sync Account row. |

A user can be an admin in the DB but **not** listed in `TELEGRAM_ADMIN_IDS`: they get list/cards/alert UI but not slash-commands that only check env. Add their numeric Telegram user ID to `TELEGRAM_ADMIN_IDS` if they need those commands.

## In-place admin UX (less chat spam)

- **Пользователи** list, pagination, and **visitor card** are updated with `editMessageText` where possible (same message).
- **First-touch “Новый визит”** notifications start **short**; **Подробнее** / **Скрыть** use callbacks `tg:ft:F` + visitor UUID and `tg:ft:S` + visitor UUID and rebuild text from `anonymous_visitor_first_touch`.
- Callback data is limited to **64 bytes** (Telegram); long payloads cannot be stored in buttons.

## Telegram Webhook

After deployment, register the webhook with Telegram:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" ^
  -H "Content-Type: application/json" ^
  -d "{\"url\":\"https://your-domain.com/api/telegram/webhook\",\"secret_token\":\"<TELEGRAM_WEBHOOK_SECRET>\"}"
```

On PowerShell you can also use:

```powershell
$body = @{
  url = "https://your-domain.com/api/telegram/webhook"
  secret_token = "<TELEGRAM_WEBHOOK_SECRET>"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" `
  -ContentType "application/json" `
  -Body $body
```

## Bot Flow

1. User sends `/start`
2. Bot shows the main menu
3. User taps `Connect Account`
4. User sends the email used on ScholarshipTop
5. Bot emails a 6-digit code
6. User enters the code in Telegram
7. Bot links Telegram to the existing app account

## Admin Flow

If the Telegram user ID is listed in `TELEGRAM_ADMIN_IDS`, the bot:

- enables admin controls
- enables alerts automatically on `/start`
- shows the admin dashboard button

## New grant admin notify

When a **new row** is inserted into `public.scholarships`, you can ping only the Telegram chats listed in **`TELEGRAM_ADMIN_IDS`** / **`TELEGRAM_ADMIN_ID`** (not the `telegram_users` admin list).

1. Set a secret, e.g. `SCHOLARSHIP_NEW_ADMIN_NOTIFY_SECRET` (or reuse `TELEGRAM_WEBHOOK_SECRET`).
2. In Supabase: **Database → Webhooks → Create a new hook**
   - **Table**: `scholarships`
   - **Events**: Insert
   - **HTTP Request**: `POST` to  
     `https://<your-production-domain>/api/internal/scholarships/notify-admin-new`
   - **Headers**: `Authorization: Bearer <same secret>`
3. Message format: title + public URL (`NEXT_PUBLIC_SITE_URL` + `/scholarships/{slug-or-id}`).

Local test (dev server running, env loaded):

`npx dotenv -e .env.local -- npx tsx scripts/test-scholarship-admin-notify.ts`

## Webhook error handling

[app/api/telegram/webhook/route.ts](app/api/telegram/webhook/route.ts) wraps `handleTelegramUpdate` in `try/catch`, logs the error, and still returns **HTTP 200** with `{ ok: true }` so Telegram does not infinitely retry a failing update (which could duplicate user-visible actions). Fix the underlying error using server logs.

## Notes

- The bot intentionally does **not** ask for the site password in Telegram.
- Admin alerts are deduplicated for signups and email verification by user ID.
- Payment alerts come from the existing LemonSqueezy webhook.

## Manual regression checklist

Run after meaningful Telegram changes (local or staging with a real bot token):

0. Run `npm run telegram:verify-env` (loads `.env.local`) and fix any **ERROR** lines.
1. `/start` → main menu; optional **Connect Account** flow (email + 6-digit code).
2. As DB admin: **My Account** → **Admin Panel**; **Пользователи** — open a row, **Скрыть** / pagination **Назад**/**Ещё**; text updates **in the same message** when possible.
3. **Admin alerts** (from profile): toggle categories / traffic sources; ensure edits apply.
4. Trigger at least one **server-side** alert (e.g. staging registration, `POST /api/analytics/first-touch`, or `quiz-complete`) and confirm message shape + inline buttons.
5. If `TELEGRAM_ADMIN_GALLERY_URLS` is set, confirm **Скрин** url buttons open the correct links.

## Ideas for future admin features

(Not implemented in code here; for product backlog.)

- `/status` or `/bothealth`: quick check of token + Supabase from the bot.
- `/help` for admins listing hidden commands (`/seo`, `/testgrant`, …).
- Short `/stats` message (24h/7d) reusing the same DB queries as the admin panel.
- External uptime monitor on `POST /api/telegram/webhook` (with valid `secret_token` header) to catch outages.
- Optional command: open visitor card by pasting `visitor_id` UUID.
