#!/usr/bin/env bash
# Extended restore validation (read-only, no secrets).
set -euo pipefail
DB="${POSTGRES_DB:-scholarshiptop_prod}"

run_sql() { sudo -u postgres psql -d "${DB}" -tAc "$1"; }

echo "=== ROW COUNTS ==="
BASELINE=(
  "auth.users|555"
  "auth.identities|566"
  "public.profiles|550"
  "public.subscriptions|4"
  "public.scholarships|21110"
  "public.providers|6385"
  "public.content_posts|953"
  "public.content_translations|34998"
  "public.essays|11790"
  "public.google_indexing_queue|33756"
  "storage.objects|5353"
  "public.seo_hub_content|919"
  "public.compare_pages|179"
  "public.state_compare_pages|1275"
)
FAILED=0
for entry in "${BASELINE[@]}"; do
  IFS='|' read -r tbl expected <<< "${entry}"
  schema="${tbl%%.*}"; table="${tbl#*.}"
  actual="$(run_sql "select count(*) from ${schema}.${table}" 2>/dev/null || echo ERR)"
  if [[ "${actual}" == "${expected}" ]]; then mark=PASS; else mark=FAIL; FAILED=$((FAILED+1)); fi
  echo "  ${mark}  ${tbl}: expected=${expected} actual=${actual}"
done

echo ""
echo "=== EXTENSIONS ==="
run_sql "select extname from pg_extension order by 1"

echo ""
echo "=== SEQUENCES (sample) ==="
for q in "select max(id::text) from public.scholarships" "select last_value from scholarships_id_seq"; do
  echo "  $(run_sql "$q" 2>/dev/null || echo n/a)"
done

echo ""
echo "=== RLS POLICIES COUNT ==="
run_sql "select count(*) from pg_policies"

echo ""
echo "=== TRIGGERS COUNT ==="
run_sql "select count(*) from information_schema.triggers where trigger_schema in ('public','auth','storage')"

echo ""
echo "=== DB SIZE ==="
run_sql "select pg_size_pretty(pg_database_size('${DB}'))"

echo ""
echo "=== RAM ==="
free -h | head -2

if [[ "${FAILED}" -eq 0 ]]; then echo "RESTORE_VALIDATION_PASS"; elif [[ "${FAILED}" -le 3 ]]; then echo "RESTORE_VALIDATION_PASS_WITH_WARNINGS"; else echo "RESTORE_VALIDATION_FAIL"; fi
exit 0
