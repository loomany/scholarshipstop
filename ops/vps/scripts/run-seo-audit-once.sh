#!/usr/bin/env bash
# One-shot SEO JSON-LD audit. Never prints env values.
# Usage: run-seo-audit-once.sh [--dry-run]
set -euo pipefail
ROOT=/opt/scholarshiptop
APP="${ROOT}/app"
ENV_FILE="${ROOT}/env/seo-audit.env"
LOG_DIR="${ROOT}/logs"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_FILE="${LOG_DIR}/seo-audit-run-${TS}.log"
DRY_RUN_ARGS=()
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN_ARGS=(--dry-run)
fi

mkdir -p "${LOG_DIR}"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "missing ${ENV_FILE}" >&2
  exit 1
fi
if [[ ! -f "${APP}/scripts/audit-jsonld-sitemap.ts" ]]; then
  echo "missing audit script" >&2
  exit 1
fi

{
  echo "=== seo-audit run ${TS} dry_run=${#DRY_RUN_ARGS[@]} ==="
} >"${LOG_FILE}"

set +e
(
  cd "${APP}"
  node --env-file="${ENV_FILE}" ./node_modules/tsx/dist/cli.mjs scripts/audit-jsonld-sitemap.ts "${DRY_RUN_ARGS[@]}"
) >>"${LOG_FILE}" 2>&1
ec=$?
{
  echo "=== exit_code=${ec} ==="
} >>"${LOG_FILE}"

echo "log=${LOG_FILE} exit=${ec}"
exit "${ec}"
