#!/usr/bin/env bash
# One-shot scholarship translation worker (manual trigger). Never prints env values.
# Usage:
#   run-translation-once.sh --dry-run   # safe test (no content_translations writes)
#   run-translation-once.sh --status    # read-only worker/sitemap status
#   run-translation-once.sh               # production run (uses translation.env as-is)
set -euo pipefail
ROOT=/opt/scholarshiptop
APP="${ROOT}/app"
ENV_FILE="${ROOT}/env/translation.env"
LOG_DIR="${ROOT}/logs"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
MODE="${1:-production}"
LOG_FILE="${LOG_DIR}/translation-run-${TS}.log"

mkdir -p "${LOG_DIR}"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "missing ${ENV_FILE}" >&2
  exit 1
fi
if [[ ! -f "${APP}/scripts/i18n/scholarship-detail-autopilot/run-railway-worker.ts" ]]; then
  echo "missing run-railway-worker script" >&2
  exit 1
fi

{
  echo "=== translation run ${TS} mode=${MODE} ==="
} >"${LOG_FILE}"

set +e
(
  cd "${APP}"
  case "${MODE}" in
    --dry-run)
      export I18N_WORKER_DRY_RUN=1
      export I18N_WORKER_TARGET=1
      export I18N_WORKER_WAVE_SIZE=1
      export I18N_WORKER_REQUIRE_LOCK=0
      # Dry-run skips production resume guards; align with DB next safe wave from status.
      export I18N_WORKER_START_WAVE=196
      node --env-file="${ENV_FILE}" ./node_modules/tsx/dist/cli.mjs \
        scripts/i18n/scholarship-detail-autopilot/run-railway-worker.ts
      ;;
    --status)
      node --env-file="${ENV_FILE}" ./node_modules/tsx/dist/cli.mjs \
        scripts/i18n/scholarship-detail-autopilot/railway-worker-status.ts
      ;;
    *)
      node --env-file="${ENV_FILE}" ./node_modules/tsx/dist/cli.mjs \
        scripts/i18n/scholarship-detail-autopilot/run-railway-worker.ts
      ;;
  esac
) >>"${LOG_FILE}" 2>&1
ec=$?
{
  echo "=== exit_code=${ec} ==="
} >>"${LOG_FILE}"

echo "log=${LOG_FILE} exit=${ec}"
exit "${ec}"
