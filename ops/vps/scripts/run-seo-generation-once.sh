#!/usr/bin/env bash
# One-shot SEO generation (HTTP → local site). Never prints env values.
# Usage: run-seo-generation-once.sh [--dry-run]
set -euo pipefail
ROOT=/opt/scholarshiptop
APP="${ROOT}/app"
ENV_FILE="${ROOT}/env/seo-generation.env"
LOG_DIR="${ROOT}/logs"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_FILE="${LOG_DIR}/seo-generation-run-${TS}.log"
DRY_RUN_ARGS=()
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN_ARGS=(--dry-run)
fi

mkdir -p "${LOG_DIR}"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "missing ${ENV_FILE}" >&2
  exit 1
fi
if [[ ! -f "${APP}/scripts/cron-seo-generation-http.ts" ]]; then
  echo "missing cron-seo-generation-http script" >&2
  exit 1
fi

{
  echo "=== seo-generation run ${TS} dry_run=${#DRY_RUN_ARGS[@]} ==="
} >"${LOG_FILE}"

set +e
(
  cd "${APP}"
  # Loopback origin — same pattern as SEO audit (avoid Cloudflare from VPS).
  export PUBLIC_URL="http://127.0.0.1:3000"
  node --env-file="${ENV_FILE}" ./node_modules/tsx/dist/cli.mjs scripts/cron-seo-generation-http.ts "${DRY_RUN_ARGS[@]}"
) >>"${LOG_FILE}" 2>&1
ec=$?
{
  echo "=== exit_code=${ec} ==="
} >>"${LOG_FILE}"

echo "log=${LOG_FILE} exit=${ec}"
exit "${ec}"
