# Stage 17 - Telegram admin bot and parser recovery

Date: 2026-07-12

## Symptoms

- Telegram admin bot actions and admin alerts stopped after the VPS migration.
- New scholarship rows stopped appearing in production ordering after 2026-06-30, although parser services were still scheduled.

## Findings

- The production site container had no `TELEGRAM_BOT_TOKEN` in `/opt/scholarshiptop/env/site.env`; site logs showed `missing TELEGRAM_BOT_TOKEN`.
- Parser env files on the VPS also had no Telegram token/admin IDs, so parser success/failure reports were silently skipped.
- The site reads the self-hosted Supabase API at `scholarshiptop.com`; parser services also target the VPS API, so this was not a full DB cutover split-brain.
- BigFuture, the main high-volume source, was repeatedly killed by the default `SOURCE_TIMEOUT_SECONDS=900` while still processing.
- Scholarships360 hit `23505 duplicate key value violates unique constraint "scholarships_slug_unique"` for some rows because parser upsert did not resolve slug collisions.

## Fixes

- Restored Telegram runtime env on the VPS site and parser services.
- Re-registered the Telegram webhook to `https://scholarshiptop.com/api/telegram/webhook` with the production secret token.
- Increased VPS parser wrapper fallback timeout to 3600 seconds when a source-specific timeout is not set.
- Updated parser upsert logic to reuse same-source rows by slug and generate deterministic unique slugs for cross-source slug collisions.

## Verification

- Production site container confirmed healthy.
- Telegram Bot API webhook registered to the production URL.
- Parser code compiled successfully.
- Existing parser unit assertions passed via direct Python invocation because `pytest` is not installed in the local venv.
- Added an explicit slug-collision smoke check for the new parser helper.
