#!/usr/bin/env bash
# Rollback site to previous commit. Jobs remain OFF.
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
APP_DIR="${ROOT}/app"
LOG_DIR="${ROOT}/logs"
BACKUP_DIR="${ROOT}/backups"
COMPOSE_FILE="${ROOT}/docker-compose.yml"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_FILE="${LOG_DIR}/rollback-site-${TS}.log"

mkdir -p "${LOG_DIR}"

exec > >(tee -a "${LOG_FILE}") 2>&1

PREV_FILE="${BACKUP_DIR}/site-prev-commit.txt"
if [[ ! -f "${PREV_FILE}" ]]; then
  echo "ERROR: no ${PREV_FILE} — nothing to rollback to" >&2
  exit 1
fi

PREV_COMMIT="$(cat "${PREV_FILE}")"
echo "=== rollback-site ${TS} -> ${PREV_COMMIT} ==="

cd "${APP_DIR}"
git fetch origin
git checkout "${PREV_COMMIT}"

cd "${ROOT}"
docker compose -f "${COMPOSE_FILE}" --profile site build site
docker compose -f "${COMPOSE_FILE}" --profile site up -d --no-deps site nginx

docker compose -f "${COMPOSE_FILE}" --profile site ps
echo "=== rollback-site done ==="
