#!/usr/bin/env node
/**
 * Preflight checks for Telegram deploy. Load env first, e.g.:
 *   npx dotenv -e .env.local -- node scripts/verify-telegram-setup.mjs
 * Exit 1 if blocking issues (missing token); exit 0 with warnings for optional vars.
 */
const issues = [];
const warnings = [];

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
const adminIds = process.env.TELEGRAM_ADMIN_IDS?.trim();
const adminId = process.env.TELEGRAM_ADMIN_ID?.trim();

if (!token) {
  issues.push('TELEGRAM_BOT_TOKEN is empty (required for the bot to send or receive).');
}
if (!secret) {
  warnings.push(
    'TELEGRAM_WEBHOOK_SECRET is empty: POST /api/telegram/webhook accepts any caller. Set a strong secret in production and pass the same value as secret_token in setWebhook.'
  );
}
if (!adminIds && !adminId) {
  warnings.push('TELEGRAM_ADMIN_IDS and TELEGRAM_ADMIN_ID are empty: no env-based admin user IDs for /seo, /testgrant, etc.');
}

console.log('[telegram:verify-env] preflight\n');
for (const m of issues) {
  console.error('  ERROR:', m);
}
for (const m of warnings) {
  console.warn('  WARN:', m);
}
if (!issues.length && !warnings.length) {
  console.log('  No blocking issues. Optional: set TELEGRAM_ADMIN_GALLERY_URLS for screenshot link rows on admin alerts.\n');
} else if (!issues.length) {
  console.log('');
}

if (token && secret) {
  console.log('setWebhook: use your production URL; secret_token must equal TELEGRAM_WEBHOOK_SECRET.');
  console.log('  See docs/telegram-bot.md (curl / PowerShell examples). Do not commit the token.\n');
}

console.log('Manual regression checklist: docs/telegram-bot.md#manual-regression-checklist\n');

process.exit(issues.length ? 1 : 0);
