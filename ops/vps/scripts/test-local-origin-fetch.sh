#!/usr/bin/env bash
set -euo pipefail

if ! grep -q '^127\.0\.0\.1[[:space:]]\+scholarshiptop\.com' /etc/hosts 2>/dev/null; then
  echo "127.0.0.1 scholarshiptop.com" | sudo tee -a /etc/hosts >/dev/null
fi

echo "=== curl local origin TLS (insecure) ==="
curl -skI -m 15 "https://scholarshiptop.com/sitemap.xml" | head -6

echo "=== node local origin TLS (insecure) ==="
NODE_TLS_REJECT_UNAUTHORIZED=0 node <<'NODE'
const UA = 'ScholarshipTopJsonLdAudit/1.0 (+https://scholarshiptop.com; internal SEO script)';
const t0 = Date.now();
fetch('https://scholarshiptop.com/sitemap.xml', {
  headers: { 'User-Agent': UA, Accept: 'application/xml,text/xml,*/*' },
  signal: AbortSignal.timeout(20000),
})
  .then(async (r) => {
    const text = await r.text();
    console.log('status', r.status, 'ok', r.ok, 'bytes', text.length, 'ms', Date.now() - t0);
    console.log('first_loc_line', text.split('\n').find((l) => l.includes('<loc>'))?.slice(0, 120));
    process.exit(r.ok ? 0 : 1);
  })
  .catch((e) => {
    console.error('fetch_error', e.message, 'ms', Date.now() - t0);
    process.exit(1);
  });
NODE
