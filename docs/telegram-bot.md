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

## Notes

- The bot intentionally does **not** ask for the site password in Telegram.
- Admin alerts are deduplicated for signups and email verification by user ID.
- Payment alerts come from the existing LemonSqueezy webhook.
