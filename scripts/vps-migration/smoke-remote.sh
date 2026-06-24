#!/usr/bin/env bash
set -euo pipefail
BASE="${SMOKE_BASE_URL:-http://213.155.22.74}"
PATHS=(/ /sitemap.xml /sitemaps/scholarships-0.xml /scholarships/no-essay /scholarships/closing-soon /scholarships/category/no-essay /scholarships/engineering /scholarships/california)
FAIL=0
for p in "${PATHS[@]}"; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 45 "${BASE}${p}" || echo 000)
  if [[ "$code" =~ ^(200|301|302|307|308)$ ]]; then echo "OK  $code $p"; else echo "FAIL $code $p"; FAIL=1; fi
done
if sudo docker ps --format '{{.Names}}' | grep -E 'scripts|seo|mailing|content|translation' >/dev/null; then echo FAIL job containers; FAIL=1; else echo OK no job containers; fi
exit $FAIL
