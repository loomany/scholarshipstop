#!/usr/bin/env bash
# One-shot SEO indexing (flush + url inspection). Never prints env values.
set -euo pipefail
ROOT=/opt/scholarshiptop
APP="${ROOT}/app"
ENV_FILE="${ROOT}/env/seo-indexing.env"
LOG_DIR="${ROOT}/logs"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_FILE="${LOG_DIR}/seo-indexing-run-${TS}.log"

mkdir -p "${LOG_DIR}"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "missing ${ENV_FILE}" >&2
  exit 1
fi
if [[ ! -f "${APP}/scripts/railway-cron.sh" ]]; then
  echo "missing railway-cron.sh" >&2
  exit 1
fi

{
  echo "=== seo-indexing run ${TS} ==="
} >"${LOG_FILE}"

set +e
(
  cd "${APP}"
  node --env-file="${ENV_FILE}" -e "
    const { spawnSync } = require('child_process');
    const env = {
      ...process.env,
      PUBLIC_URL: 'http://127.0.0.1:3000',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000'
    };
    const run = (task) => spawnSync('bash', ['scripts/railway-cron.sh', task], {
      cwd: process.cwd(),
      env,
      stdio: 'inherit'
    });
    let r = run('google-indexing-flush');
    if ((r.status ?? 1) !== 0) process.exit(r.status ?? 1);
    r = run('seo-url-inspection');
    process.exit(r.status ?? 1);
  "
) >>"${LOG_FILE}" 2>&1
ec=$?
{
  echo "=== exit_code=${ec} ==="
} >>"${LOG_FILE}"

echo "log=${LOG_FILE} exit=${ec}"
exit "${ec}"
