#!/usr/bin/env bash
# VPS scaffold smoke — HTTP checks only (no env values printed).
set -euo pipefail

BASE="${SMOKE_BASE_URL:-http://127.0.0.1}"
PATHS=(
  "/"
  "/sitemap.xml"
  "/sitemaps/scholarships-0.xml"
  "/scholarships/no-essay"
  "/scholarships/closing-soon"
  "/scholarships/category/no-essay"
  "/scholarships/engineering"
  "/scholarships/california"
)

FAIL=0
echo "Smoke base: ${BASE}"

for p in "${PATHS[@]}"; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 45 "${BASE}${p}" || echo "000")"
  if [[ "${code}" =~ ^(200|301|302|307|308)$ ]]; then
    echo "OK  ${code} ${p}"
  else
    echo "FAIL ${code} ${p}"
    FAIL=1
  fi
done

# Confirm no job containers running
if command -v docker >/dev/null 2>&1; then
  JOB_CONTAINERS="$(docker ps --format '{{.Names}}' | grep -E 'scripts|seo-|mailing|content-hub|translation' || true)"
  if [[ -n "${JOB_CONTAINERS}" ]]; then
    echo "FAIL job containers running:"
    echo "${JOB_CONTAINERS}"
    FAIL=1
  else
    echo "OK  no job containers detected"
  fi
fi

exit "${FAIL}"
