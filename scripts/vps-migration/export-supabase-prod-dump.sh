#!/usr/bin/env bash
# Stage 2 — Export Supabase production database (read-only on source).
# Does NOT modify Supabase. Requires direct Postgres connection string.
#
# Usage:
#   export SUPABASE_DB_URL='postgresql://...'   # OR
#   export SUPABASE_DB_URL_FILE=/root/.supabase-db-url
#   bash scripts/vps-migration/export-supabase-prod-dump.sh
#
# Output:
#   ${SUPABASE_DUMP_DIR}/supabase-prod-YYYYMMDDTHHMMSSZ.dump
#   ${SUPABASE_DUMP_DIR}/supabase-prod-YYYYMMDDTHHMMSSZ.dump.sha256

set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" && -n "${SUPABASE_DB_URL_FILE:-}" && -f "${SUPABASE_DB_URL_FILE}" ]]; then
  SUPABASE_DB_URL="$(tr -d '\r\n' < "${SUPABASE_DB_URL_FILE}")"
  export SUPABASE_DB_URL
fi

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "[export] ERROR: set SUPABASE_DB_URL or SUPABASE_DB_URL_FILE (direct Postgres URI). Do not use API keys." >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="${SUPABASE_DUMP_DIR:-/opt/scholarshiptop-db-backups}"
mkdir -p "${OUT_DIR}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${OUT_DIR}/supabase-prod-${STAMP}.dump"

echo "[export] Starting pg_dump (read-only) — schemas: public, auth, storage, net"
echo "[export] Output: ${OUT}"

PG_DUMP="${PG_DUMP:-pg_dump}"
if [[ -x /usr/lib/postgresql/17/bin/pg_dump ]]; then
  PG_DUMP="/usr/lib/postgresql/17/bin/pg_dump"
fi

"${PG_DUMP}" \
  --format=custom \
  --no-owner \
  --no-acl \
  --schema=public \
  --schema=auth \
  --schema=storage \
  --schema=net \
  --file="${OUT}" \
  "${SUPABASE_DB_URL}"

sha256sum "${OUT}" > "${OUT}.sha256"
SIZE="$(du -h "${OUT}" | cut -f1)"

echo "[export] DONE size=${SIZE}"
echo "[export] Checksum: ${OUT}.sha256"
echo "[export] Restore: sudo bash ops/vps/scripts/restore-postgres-superuser.sh ${OUT}"
echo "[export] Clean test: sudo bash ops/vps/scripts/restore-postgres-clean-test.sh ${OUT}"
