#!/usr/bin/env bash
# Deploy ScholarshipTop site container only. Does NOT start jobs/cron.
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
APP_DIR="${ROOT}/app"
LOG_DIR="${ROOT}/logs"
BACKUP_DIR="${ROOT}/backups"
BRANCH="${DEPLOY_BRANCH:-main}"
COMPOSE_FILE="${ROOT}/docker-compose.yml"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_FILE="${LOG_DIR}/deploy-site-${TS}.log"

mkdir -p "${LOG_DIR}" "${BACKUP_DIR}"

exec > >(tee -a "${LOG_FILE}") 2>&1

echo "=== deploy-site ${TS} ==="
echo "ROOT=${ROOT} BRANCH=${BRANCH}"

if [[ ! -f "${ROOT}/env/site.env" ]]; then
  echo "ERROR: missing ${ROOT}/env/site.env — run pull-site-env-from-railway.sh first" >&2
  exit 1
fi

cd "${APP_DIR}"
PREV_COMMIT="$(git rev-parse HEAD)"
echo "Previous commit: ${PREV_COMMIT}"

git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"
NEW_COMMIT="$(git rev-parse HEAD)"
echo "New commit: ${NEW_COMMIT}"

echo "${PREV_COMMIT}" > "${BACKUP_DIR}/site-prev-commit.txt"
docker compose -f "${COMPOSE_FILE}" --profile site ps -q site 2>/dev/null | head -1 > "${BACKUP_DIR}/site-prev-container.id" || true

cd "${ROOT}"
docker compose -f "${COMPOSE_FILE}" --profile site build site
docker compose -f "${COMPOSE_FILE}" --profile site up -d --no-deps site nginx

echo "Waiting for site healthcheck..."
sleep 5
docker compose -f "${COMPOSE_FILE}" --profile site ps

echo "=== deploy-site done commit=${NEW_COMMIT} ==="
