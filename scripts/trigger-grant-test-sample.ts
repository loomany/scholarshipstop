/**
 * POST /api/internal/grant-notifications/test-sample (local preview).
 * Run: npx dotenv-cli -e .env.local -- npx tsx scripts/trigger-grant-test-sample.ts
 * Requires: npm run dev on localhost:3000, GRANT_NOTIFICATION_CRON_SECRET, test-sample env.
 */
const base = process.env.TEST_SAMPLE_URL ?? 'http://localhost:3000';
const url = `${base.replace(/\/+$/, '')}/api/internal/grant-notifications/test-sample`;
const secret = process.env.GRANT_NOTIFICATION_CRON_SECRET?.trim();
if (!secret) {
  console.error('Missing GRANT_NOTIFICATION_CRON_SECRET (load .env.local via dotenv-cli).');
  process.exit(1);
}

void (async () => {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`
    },
    body: '{}'
  });
  const text = await res.text();
  console.log('HTTP', res.status);
  console.log(text);
})();
