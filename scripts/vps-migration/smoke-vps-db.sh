#!/usr/bin/env bash
# Stage 4 — Smoke: VPS Postgres (read-only) and/or production HTTP.
#
#   DATABASE_URL='...' bash scripts/vps-migration/smoke-vps-db.sh --db
#   SMOKE_BASE_URL=https://scholarshiptop.com bash scripts/vps-migration/smoke-vps-db.sh --http

set -euo pipefail

BASE="${SMOKE_BASE_URL:-https://scholarshiptop.com}"
BASE="${BASE%/}"
FAILED=0

smoke_db() {
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "FAIL  db: DATABASE_URL not set" >&2
    return 1
  fi
  local slug count users
  slug="$(psql "${DATABASE_URL}" -t -A -c "select slug from public.scholarships where slug is not null limit 1")"
  if [[ -n "${slug}" ]]; then
    echo "PASS  scholarship_sample (${slug})"
  else
    echo "FAIL  scholarship_sample"; FAILED=$((FAILED + 1))
  fi
  users="$(psql "${DATABASE_URL}" -t -A -c "select count(*) from auth.users")"
  if [[ "${users}" -gt 0 ]]; then
    echo "PASS  auth.users (${users})"
  else
    echo "FAIL  auth.users"; FAILED=$((FAILED + 1))
  fi
  count="$(psql "${DATABASE_URL}" -t -A -c "select count(*) from public.profiles p join auth.users u on u.id = p.id")"
  if [[ "${count}" -gt 0 ]]; then
    echo "PASS  profiles_auth_join (${count})"
  else
    echo "FAIL  profiles_auth_join"; FAILED=$((FAILED + 1))
  fi
  local rpc
  rpc="$(psql "${DATABASE_URL}" -t -A -c "select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'get_comparison_data'")"
  if [[ "${rpc}" == "1" ]]; then
    echo "PASS  rpc_get_comparison_data"
  else
    echo "FAIL  rpc_get_comparison_data"; FAILED=$((FAILED + 1))
  fi
}

smoke_http() {
  local path code
  for path in / /sitemap.xml /scholarships /signin; do
    code="$(curl -s -o /dev/null -w '%{http_code}' "${BASE}${path}")"
    if [[ "${code}" == "200" ]]; then
      echo "PASS  http ${path} (${code})"
    else
      echo "FAIL  http ${path} (${code})"; FAILED=$((FAILED + 1))
    fi
  done
}

if [[ "${1:-}" == "--db" ]]; then
  smoke_db
elif [[ "${1:-}" == "--http" ]]; then
  smoke_http
elif [[ "${1:-}" == "--all" ]]; then
  smoke_db
  smoke_http
else
  echo "Usage: smoke-vps-db.sh --db | --http | --all" >&2
  exit 1
fi

if [[ "${FAILED}" -eq 0 ]]; then
  echo "SMOKE_PASS"
else
  echo "SMOKE_FAIL (${FAILED})"
  exit 1
fi
