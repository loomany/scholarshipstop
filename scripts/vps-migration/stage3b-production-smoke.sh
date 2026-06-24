#!/usr/bin/env bash
# Stage 3B — Production smoke after Supabase password/URI work (read-only HTTP checks).
# Does NOT modify production, parsers, or Supabase.
set -euo pipefail

BASE="${PRODUCTION_BASE_URL:-https://scholarshiptop.com}"
FAIL=0

check_url() {
  local label="$1" url="$2"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 45 "${url}" || echo "000")"
  if [[ "${code}" =~ ^200$ ]]; then
    echo "  PASS  ${label}: ${code}"
  else
    echo "  FAIL  ${label}: ${code} ${url}"
    FAIL=1
  fi
}

echo "=== Stage 3B production smoke ==="
echo "Base: ${BASE}"

check_url "homepage" "${BASE}/"
check_url "sitemap" "${BASE}/sitemap.xml"

SCHOLARSHIP_URLS=(
  "/scholarships/engineering-foundation-year-bursaries-at-university-college-london-2026-engineering-foundation-year-burs"
  "/scholarships/algoma-university-award-of-excellence-scholarship-2026-algoma-university-award-of-excel"
  "/scholarships/a-and-l-manning-scholarship-at-indiana-university-bloomington-2026-a-and-l-manning-scholarship"
  "/scholarships/jim-kemmy-india-scholarships-at-university-of-limerick-2026-jim-kemmy-india-scholarships-at-"
  "/scholarships/ieg-research-fellowship-program-2026-ieg-research-fellowship-program"
)

for path in "${SCHOLARSHIP_URLS[@]}"; do
  check_url "scholarship" "${BASE}${path}"
done

# Homepage content sanity (no secrets)
body="$(curl -sS --max-time 45 "${BASE}/" || true)"
if echo "${body}" | grep -qi 'scholarship'; then
  echo "  PASS  homepage content: scholarship keywords present"
else
  echo "  FAIL  homepage content: missing expected keywords"
  FAIL=1
fi

if [[ "${FAIL}" -eq 0 ]]; then
  echo "PRODUCTION_SMOKE_PASS"
  exit 0
else
  echo "PRODUCTION_SMOKE_FAIL"
  exit 1
fi
