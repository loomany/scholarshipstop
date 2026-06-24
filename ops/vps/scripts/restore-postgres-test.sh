#!/usr/bin/env bash
# Restore-test: restore custom-format dump into scholarshiptop_prod (VPS only).
set -euo pipefail

DUMP="${1:?Usage: restore-postgres-test.sh /path/to/file.dump}"

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
ENV_FILE="${POSTGRES_ENV_FILE:-${ROOT}/env/postgres.env}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[restore-test] ERROR: DATABASE_URL not set" >&2
  exit 1
fi

if [[ ! -f "${DUMP}" ]]; then
  echo "[restore-test] ERROR: dump not found: ${DUMP}" >&2
  exit 1
fi

SHA_FILE="${DUMP}.sha256"
if [[ -f "${SHA_FILE}" ]]; then
  echo "[restore-test] Verifying checksum..."
  sha256sum -c "${SHA_FILE}"
fi

PG_RESTORE="${PG_RESTORE:-pg_restore}"
if [[ -x /usr/lib/postgresql/17/bin/pg_restore ]]; then
  PG_RESTORE="/usr/lib/postgresql/17/bin/pg_restore"
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DB_NAME_FROM_URL="$(echo "${DATABASE_URL}" | sed -n 's|.*/\([^?]*\).*|\1|p')"
export POSTGRES_DB="${POSTGRES_DB:-${DB_NAME_FROM_URL}}" DUMP_PATH="${DUMP}"

echo "[restore-test] Pre-restore hardening..."
bash "${SCRIPT_DIR}/restore-postgres-pre.sh"

echo "[restore-test] Restoring into VPS DB (NOT Supabase)..."
"${PG_RESTORE}" --clean --if-exists --no-owner --no-acl --dbname="${DATABASE_URL}" "${DUMP}"

echo "[restore-test] Post-restore hardening..."
bash "${SCRIPT_DIR}/restore-postgres-post.sh" "${DUMP}"

echo "[restore-test] Restore complete."
