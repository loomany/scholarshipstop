#!/usr/bin/env node
/**
 * POST helper for scripts/railway-cron.sh — uses global fetch (Node 18+), no curl.
 *
 * Usage: node scripts/railway-cron-post.mjs <full-url> <bearer-token> [json-body]
 *
 * Exits 0 on HTTP 2xx, 1 otherwise. Prints response body and status line to stdout (Railway logs).
 */
const url = process.argv[2];
const bearer = process.argv[3];
const body = process.argv[4] ?? '{}';

if (!url || !bearer) {
  console.log(
    'usage: node railway-cron-post.mjs <url> <bearer-token> [json-body]'
  );
  process.exit(2);
}

try {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json'
    },
    body
  });

  const text = await res.text();
  console.log(`[railway-cron] Response HTTP ${res.status}`);
  process.stdout.write(text);
  if (text && !text.endsWith('\n')) {
    process.stdout.write('\n');
  }

  if (res.status < 200 || res.status >= 300) {
    process.exit(1);
  }
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.log('[railway-cron] fetch error:', msg);
  process.exit(1);
}
