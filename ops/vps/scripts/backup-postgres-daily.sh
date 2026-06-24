#!/usr/bin/env bash
# Daily pg_dump backup for VPS scholarshiptop_prod.
# Requires DATABASE_URL or postgres.env on VPS.
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
ENV_FILE="${POSTGRES_ENV_FILE:-${ROOT}/env/postgres.env}"
BACKUP_DIR="${POSTGRES_BACKUP_DIR:-/opt/scholarshiptop-db-backups}"
RETENTION="${POSTGRES_BACKUP_RETENTION_DAYS:-14}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[pg-backup] ERROR: DATABASE_URL not set" >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BACKUP_DIR}/scholarshiptop_prod-${STAMP}.dump"
LATEST="${BACKUP_DIR}/latest.dump"

pg_dump --format=custom --no-owner --no-acl --file="${OUT}" "${DATABASE_URL}"
sha256sum "${OUT}" > "${OUT}.sha256"
ln -sf "$(basename "${OUT}")" "${LATEST}"
ln -sf "$(basename "${OUT}.sha256")" "${LATEST}.sha256"

find "${BACKUP_DIR}" -name 'scholarshiptop_prod-*.dump' -mtime +"${RETENTION}" -delete 2>/dev/null || true
find "${BACKUP_DIR}" -name 'scholarshiptop_prod-*.dump.sha256' -mtime +"${RETENTION}" -delete 2>/dev/null || true

echo "[pg-backup] OK ${OUT} ($(du -h "${OUT}" | cut -f1))"
