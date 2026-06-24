#!/usr/bin/env bash
# Stage 3 — Validate VPS DB restore row counts vs Supabase baseline.
# Read-only. Requires DATABASE_URL (never logged).
set -euo pipefail

BASELINE=(
  "auth.users|555"
  "auth.identities|566"
  "auth.sessions|730"
  "public.profiles|550"
  "public.subscriptions|4"
  "public.scholarships|21110"
  "public.providers|6385"
  "public.content_posts|953"
  "public.content_translations|34998"
  "public.essays|11790"
  "public.user_saved_scholarships|295"
  "public.google_indexing_queue|33756"
  "storage.objects|5353"
  "public.seo_hub_content|919"
  "public.compare_pages|179"
  "public.state_compare_pages|1275"
)

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[validate] ERROR: DATABASE_URL required" >&2
  exit 1
fi

FAILED=0
echo "[validate] Row counts (baseline Supabase 2026-06-24):"

for entry in "${BASELINE[@]}"; do
  IFS='|' read -r tbl expected <<< "${entry}"
  schema="${tbl%%.*}"
  table="${tbl#*.}"
  actual="$(psql "${DATABASE_URL}" -t -A -c "select count(*) from ${schema}.${table}" 2>/dev/null || echo "ERR")"
  if [[ "${actual}" == "${expected}" ]]; then
    echo "  PASS  ${tbl}: ${actual}"
  else
    echo "  FAIL  ${tbl}: expected=${expected} actual=${actual}"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "[validate] Extensions:"
psql "${DATABASE_URL}" -t -c "select extname from pg_extension where extname in ('pg_net','pg_trgm','unaccent','pgcrypto','uuid-ossp') order by 1"

echo ""
echo "[validate] DB size:"
psql "${DATABASE_URL}" -t -c "select pg_size_pretty(pg_database_size(current_database()))"

if [[ "${FAILED}" -eq 0 ]]; then
  echo ""
  echo "RESTORE_VALIDATION_PASS"
  exit 0
else
  echo ""
  echo "RESTORE_VALIDATION_FAIL (${FAILED} mismatches)"
  exit 1
fi
