# Telegram Bot Setup

This project now includes a Telegram bot webhook at `app/api/telegram/webhook/route.ts`.

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
- Optional: **new scholarship row** → message only to env admins (`TELEGRAM_ADMIN_IDS`), with a link to the grant (`POST /api/internal/scholarships/notify-admin-new`, secured by `SCHOLARSHIP_NEW_ADMIN_NOTIFY_SECRET`). See [New grant admin notify](#new-grant-admin-notify) below.

## Required Env

Add these variables to `.env.local`:

```bash
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...
TELEGRAM_LINK_CODE_SECRET=...
TELEGRAM_ADMIN_IDS=200082134
```

`TELEGRAM_LINK_CODE_SECRET` is optional but recommended.

## Database

Apply the new migration:

```bash
npm run supabase:push
```

It creates:

- `public.telegram_users`
- `public.telegram_link_codes`
- `public.telegram_event_logs`

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

## Notes

- The bot intentionally does **not** ask for the site password in Telegram.
- Admin alerts are deduplicated for signups and email verification by user ID.
- Payment alerts come from the existing LemonSqueezy webhook.
