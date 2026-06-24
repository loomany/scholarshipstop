#!/usr/bin/env bash
# One-shot content hub publish job (manual). Never prints env values.
set -euo pipefail
ROOT=/opt/scholarshiptop
APP="${ROOT}/app"
HUB="${APP}/services/content-hub"
ENV_FILE="${ROOT}/env/content-hub.env"
LOG_DIR="${ROOT}/logs"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_FILE="${LOG_DIR}/content-hub-run-${TS}.log"

mkdir -p "${LOG_DIR}"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "missing ${ENV_FILE}" >&2
  exit 1
fi
if [[ ! -f "${HUB}/src/jobs/runContentJob.ts" ]]; then
  echo "missing content-hub runContentJob.ts" >&2
  exit 1
fi

{
  echo "=== content-hub run ${TS} ==="
} >"${LOG_FILE}"

set +e
(
  cd "${HUB}"
  node --env-file="${ENV_FILE}" "${APP}/node_modules/tsx/dist/cli.mjs" src/jobs/runContentJob.ts
) >>"${LOG_FILE}" 2>&1
ec=$?
{
  echo "=== exit_code=${ec} ==="
} >>"${LOG_FILE}"

echo "log=${LOG_FILE} exit=${ec}"
exit "${ec}"
