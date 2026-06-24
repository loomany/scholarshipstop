#!/usr/bin/env bash
# Restore Supabase dump as postgres superuser with pre/post hardening (VPS only).
# Usage: sudo bash restore-postgres-superuser.sh /path/to/file.dump [database]
set -euo pipefail

DUMP="${1:?Usage: restore-postgres-superuser.sh /path/to/file.dump [database]}"
POSTGRES_DB="${2:-${POSTGRES_DB:-scholarshiptop_prod}}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PG_RESTORE="/usr/lib/postgresql/17/bin/pg_restore"

if [[ ! -f "${DUMP}" ]]; then
  echo "[restore] ERROR: dump not found: ${DUMP}" >&2
  exit 1
fi

SHA_FILE="${DUMP}.sha256"
if [[ -f "${SHA_FILE}" ]]; then
  echo "[restore] Verifying checksum..."
  sha256sum -c "${SHA_FILE}"
fi

export POSTGRES_DB DUMP_PATH="${DUMP}"

echo "[restore] Pre-restore hardening..."
bash "${SCRIPT_DIR}/restore-postgres-pre.sh"

echo "[restore] pg_restore into ${POSTGRES_DB}..."
sudo -u postgres "${PG_RESTORE}" \
  --clean --if-exists --no-owner --no-acl \
  --dbname="${POSTGRES_DB}" "${DUMP}" 2>&1 | tail -30 || true

echo "[restore] Post-restore hardening..."
bash "${SCRIPT_DIR}/restore-postgres-post.sh" "${DUMP}"

echo "[restore] Done (benign Supabase-specific role errors above are expected)."
