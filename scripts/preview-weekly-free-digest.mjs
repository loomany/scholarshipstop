/**
 * POST preview to deployed or local API (requires NEXT_PUBLIC_SITE_URL + cron secret).
 * Usage: dotenv -e .env.local -- node scripts/preview-weekly-free-digest.mjs you@example.com
 */
import process from 'node:process';

const email = process.argv[2]?.trim();
const baseArg = process.argv[3]?.trim();
const base =
  baseArg ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  process.env.SITE_URL?.trim() ||
  'http://localhost:3000';
const secret =
  process.env.WEEKLY_FREE_DIGEST_CRON_SECRET?.trim() ||
  process.env.GRANT_NOTIFICATION_CRON_SECRET?.trim() ||
  process.env.CRON_SECRET?.trim();

if (!email) {
  console.error(
    'Usage: node scripts/preview-weekly-free-digest.mjs <email> [baseUrl]\nExample: ... you@mail.ru https://scholarshiptop.com'
  );
  process.exit(1);
}
if (!secret) {
  console.error('Set WEEKLY_FREE_DIGEST_CRON_SECRET or GRANT_NOTIFICATION_CRON_SECRET');
  process.exit(1);
}

const url = `${base.replace(/\/+$/, '')}/api/internal/weekly-free-digest/preview`;
const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ to: email })
});
const text = await res.text();
console.log(res.status, text);
process.exit(res.ok ? 0 : 1);
