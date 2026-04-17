/**
 * Local/manual trigger for POST /api/internal/seo/daily-digest-telegram
 *
 *   dotenv -e .env.local -- node scripts/post-seo-daily-digest-telegram.mjs
 */

const base = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  'http://localhost:3000'
)
  .trim()
  .replace(/\/+$/, '');
const secret =
  process.env.SEO_DAILY_DIGEST_CRON_SECRET?.trim() ||
  process.env.GRANT_NOTIFICATION_CRON_SECRET?.trim() ||
  process.env.CRON_SECRET?.trim();

if (!secret) {
  console.error('Set SEO_DAILY_DIGEST_CRON_SECRET or GRANT_NOTIFICATION_CRON_SECRET');
  process.exit(1);
}

const url = `${base}/api/internal/seo/daily-digest-telegram`;

const res = await fetch(url, {
  method: 'POST',
  headers: { Authorization: `Bearer ${secret}` }
});

const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  json = text;
}

console.log(res.status, json);
if (!res.ok) process.exit(1);
