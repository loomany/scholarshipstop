#!/usr/bin/env bash
# Daily, locally authenticated pg_dump backup for VPS scholarshiptop_prod.
# The production cron runs as root and switches only pg_dump to the postgres OS user.
set -euo pipefail

umask 077

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
ENV_FILE="${POSTGRES_ENV_FILE:-${ROOT}/env/postgres.env}"
BACKUP_DIR="${POSTGRES_BACKUP_DIR:-/opt/scholarshiptop-db-backups}"
RETENTION="${POSTGRES_BACKUP_RETENTION_DAYS:-14}"
PG_DUMP_BIN="${PG_DUMP_BIN:-pg_dump}"
PG_RESTORE_BIN="${PG_RESTORE_BIN:-pg_restore}"
BACKUP_RUN_AS="${POSTGRES_BACKUP_RUN_AS:-postgres}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

if [[ -z "${POSTGRES_DB:-}" ]]; then
  echo "[pg-backup] ERROR: POSTGRES_DB not set" >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BACKUP_DIR}/scholarshiptop_prod-${STAMP}.dump"
TMP="${BACKUP_DIR}/.scholarshiptop_prod-${STAMP}.dump.tmp.$$"
CHECKSUM_OUT="${OUT}.sha256"
CHECKSUM_TMP="${CHECKSUM_OUT}.tmp.$$"
LATEST="${BACKUP_DIR}/latest.dump"

cleanup() {
  rm -f -- "${TMP}" "${CHECKSUM_TMP}"
}
trap cleanup EXIT INT TERM

run_pg_dump() {
  if [[ "${BACKUP_RUN_AS}" == "current" ]]; then
    "${PG_DUMP_BIN}" "$@"
    return
  fi

  if [[ "$(id -un)" == "${BACKUP_RUN_AS}" ]]; then
    "${PG_DUMP_BIN}" "$@"
  elif [[ "$(id -u)" == "0" ]] && command -v runuser >/dev/null 2>&1; then
    runuser -u "${BACKUP_RUN_AS}" -- "${PG_DUMP_BIN}" "$@"
  else
    echo "[pg-backup] ERROR: run as root or ${BACKUP_RUN_AS}; refusing app-role fallback" >&2
    return 1
  fi
}

echo "[pg-backup] START database=${POSTGRES_DB} target=$(basename "${OUT}")"
run_pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="${TMP}" \
  --dbname="${POSTGRES_DB}"

if [[ ! -s "${TMP}" ]]; then
  echo "[pg-backup] ERROR: pg_dump produced an empty artifact" >&2
  exit 1
fi

if ! "${PG_RESTORE_BIN}" --list "${TMP}" >/dev/null; then
  echo "[pg-backup] ERROR: pg_restore --list rejected the dump" >&2
  exit 1
fi

HASH="$(sha256sum "${TMP}" | awk '{print $1}')"
printf '%s  %s\n' "${HASH}" "$(basename "${OUT}")" > "${CHECKSUM_TMP}"

mv -- "${TMP}" "${OUT}"
mv -- "${CHECKSUM_TMP}" "${CHECKSUM_OUT}"
ln -sf "$(basename "${OUT}")" "${LATEST}"
ln -sf "$(basename "${CHECKSUM_OUT}")" "${LATEST}.sha256"

find "${BACKUP_DIR}" -name 'scholarshiptop_prod-*.dump' -mtime +"${RETENTION}" -delete 2>/dev/null || true
find "${BACKUP_DIR}" -name 'scholarshiptop_prod-*.dump.sha256' -mtime +"${RETENTION}" -delete 2>/dev/null || true

trap - EXIT INT TERM
echo "[pg-backup] OK file=$(basename "${OUT}") size_bytes=$(wc -c < "${OUT}" | tr -d ' ')"
