#!/usr/bin/env bash
# One-shot provider outreach (manual). Never prints env values.
# Usage: run-mailing-providers-once.sh [--dry-run]
set -euo pipefail
ROOT=/opt/scholarshiptop
APP="${ROOT}/app"
ENV_FILE="${ROOT}/env/mailing-providers.env"
LOG_DIR="${ROOT}/logs"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
MODE="${1:-production}"
LOG_FILE="${LOG_DIR}/mailing-providers-run-${TS}.log"
EXTRA_ARGS=()
if [[ "${MODE}" == "--dry-run" ]]; then
  EXTRA_ARGS=(--dry-run)
fi

mkdir -p "${LOG_DIR}"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "missing ${ENV_FILE}" >&2
  exit 1
fi
if [[ ! -f "${APP}/scripts/send-provider-outreach-emails.ts" ]]; then
  echo "missing send-provider-outreach-emails.ts" >&2
  exit 1
fi

{
  echo "=== mailing-providers run ${TS} mode=${MODE} ==="
} >"${LOG_FILE}"

set +e
(
  cd "${APP}"
  node --env-file="${ENV_FILE}" ./node_modules/tsx/dist/cli.mjs \
    scripts/send-provider-outreach-emails.ts "${EXTRA_ARGS[@]}"
) >>"${LOG_FILE}" 2>&1
ec=$?
{
  echo "=== exit_code=${ec} ==="
} >>"${LOG_FILE}"

echo "log=${LOG_FILE} exit=${ec}"
exit "${ec}"
