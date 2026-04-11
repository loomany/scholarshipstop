/**
 * Smoke test: POST /api/internal/scholarships/notify-admin-new with mock row.
 *
 * Usage (from repo root, with .env.local):
 *   npx dotenv -e .env.local -- npx tsx scripts/test-scholarship-admin-notify.ts
 *
 * Requires: TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_IDS,
 *   SCHOLARSHIP_NEW_ADMIN_NOTIFY_SECRET or TELEGRAM_WEBHOOK_SECRET,
 *   NEXT_PUBLIC_SITE_URL (for link in message).
 */
import process from 'node:process';

async function main() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    'http://localhost:3000';
  const secret =
    process.env.SCHOLARSHIP_NEW_ADMIN_NOTIFY_SECRET?.trim() ||
    process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error(
      'Set SCHOLARSHIP_NEW_ADMIN_NOTIFY_SECRET or TELEGRAM_WEBHOOK_SECRET in .env.local'
    );
    process.exit(1);
  }

  const url = `${base.replace(/\/+$/, '')}/api/internal/scholarships/notify-admin-new`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`
    },
    body: JSON.stringify({
      record: {
        id: '00000000-0000-4000-8000-000000000001',
        slug: 'test-admin-notify-grant',
        title: 'Test grant (admin notify smoke)'
      }
    })
  });

  const text = await res.text();
  console.log(res.status, text);
  if (!res.ok) process.exit(1);
}

void main();
