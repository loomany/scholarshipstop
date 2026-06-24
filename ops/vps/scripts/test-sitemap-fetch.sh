#!/usr/bin/env bash
set -euo pipefail
UA='ScholarshipTopJsonLdAudit/1.0 (+https://scholarshiptop.com; internal SEO script)'

echo "=== curl via Cloudflare (public DNS) ==="
curl -sI -m 60 "https://scholarshiptop.com/sitemap.xml" | head -3 || echo "curl_public_failed"

echo "=== curl via local origin (127.0.0.1:443) ==="
curl -sI -m 15 --resolve "scholarshiptop.com:443:127.0.0.1" "https://scholarshiptop.com/sitemap.xml" | head -5

echo "=== node fetch with /etc/hosts loopback ==="
if ! grep -q '^127\.0\.0\.1[[:space:]]\+scholarshiptop\.com' /etc/hosts 2>/dev/null; then
  echo "127.0.0.1 scholarshiptop.com" | sudo tee -a /etc/hosts >/dev/null
fi
node <<'NODE'
const UA = 'ScholarshipTopJsonLdAudit/1.0 (+https://scholarshiptop.com; internal SEO script)';
const url = 'https://scholarshiptop.com/sitemap.xml';
const t0 = Date.now();
fetch(url, {
  headers: { 'User-Agent': UA, Accept: 'application/xml,text/xml,*/*' },
  signal: AbortSignal.timeout(45000),
})
  .then(async (r) => {
    const text = await r.text();
    console.log('status', r.status, 'ok', r.ok, 'bytes', text.length, 'ms', Date.now() - t0);
    process.exit(r.ok ? 0 : 1);
  })
  .catch((e) => {
    console.error('fetch_error', e.message, 'ms', Date.now() - t0);
    process.exit(1);
  });
NODE
