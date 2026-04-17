#!/usr/bin/env node
/**
 * POST helper for scripts/railway-cron.sh — uses global fetch (Node 18+), no curl.
 *
 * Usage: node scripts/railway-cron-post.mjs <full-url> <bearer-token> [json-body]
 *
 * Exits 0 on HTTP 2xx, 1 otherwise. Prints response body and status line to stdout (Railway logs).
 */
const ts = () => new Date().toISOString();

function urlLabel(full) {
  try {
    const u = new URL(full);
    return `${u.pathname}${u.search}`;
  } catch {
    return '(bad-url)';
  }
}

function formatBody(text) {
  const t = text.trim();
  if (!t) return '(empty)';
  try {
    return JSON.stringify(JSON.parse(t), null, 2);
  } catch {
    return t.length > 4000 ? `${t.slice(0, 4000)}… (${t.length} chars)` : t;
  }
}

const url = process.argv[2];
const bearer = process.argv[3];
const body = process.argv[4] ?? '{}';

if (!url || !bearer) {
  console.log(
    'usage: node railway-cron-post.mjs <url> <bearer-token> [json-body]'
  );
  process.exit(2);
}

const started = Date.now();
console.log(
  `[railway-cron] ${ts()} START POST ${urlLabel(url)} bodyBytes=${Buffer.byteLength(body, 'utf8')}`
);

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
  const ms = Date.now() - started;
  console.log(
    `[railway-cron] ${ts()} HTTP ${res.status} ${ms}ms responseBytes=${Buffer.byteLength(text, 'utf8')}`
  );
  console.log('[railway-cron] response body:\n' + formatBody(text));

  if (res.status < 200 || res.status >= 300) {
    console.error(
      `[railway-cron] ${ts()} FAIL non-2xx — exit 1 (${urlLabel(url)})`
    );
    process.exit(1);
  }
  console.log(`[railway-cron] ${ts()} OK (${urlLabel(url)})`);
} catch (err) {
  const ms = Date.now() - started;
  const msg = err instanceof Error ? err.message : String(err);
  console.error(
    `[railway-cron] ${ts()} fetch error after ${ms}ms (${urlLabel(url)}):`,
    msg
  );
  process.exit(1);
}
