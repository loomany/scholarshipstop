#!/usr/bin/env bash
# Quick GoTrue start against arbitrary DB (localhost test stack).
set -euo pipefail
DB="${1:?usage: start-gotrue-test-db.sh DBNAME}"
ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
ENV_FILE="${ROOT}/env/supabase-api.env"
COMPOSE="${ROOT}/app/ops/vps/docker-compose.supabase-api.example.yml"

# shellcheck disable=SC1090
source "${ENV_FILE}"
export GOTRUE_DB_DATABASE_URL TARGET_DB="${DB}"

URL="$(python3 - <<'PY'
import os, urllib.parse
u = urllib.parse.urlparse(os.environ["GOTRUE_DB_DATABASE_URL"])
u = u._replace(path="/" + os.environ["TARGET_DB"])
print(u.geturl())
PY
)"

cd "${ROOT}/app"
docker compose -f "${COMPOSE}" --profile supabase-api-test stop gotrue >/dev/null 2>&1 || true
docker compose -f "${COMPOSE}" --profile supabase-api-test rm -f gotrue >/dev/null 2>&1 || true
GOTRUE_DB_DATABASE_URL="${URL}" \
  docker compose -f "${COMPOSE}" --profile supabase-api-test up -d gotrue
sleep 12
docker logs scholarshiptop-gotrue-test 2>&1 | tail -10
curl -sS -o /dev/null -w 'direct_health:%{http_code}\n' http://127.0.0.1:9999/health || echo direct_health:000
