#!/usr/bin/env bash
# Stage 4F.1 — patch shadow stack for rehearsal CORS + GoTrue session schema compat.
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
APP="${ROOT}/app"
COMPOSE="${APP}/ops/vps/docker-compose.supabase-api.example.yml"
ENV_FILE="${ROOT}/env/supabase-api.env"
NGINX_INC="${APP}/ops/vps/nginx/includes/scholarshiptop-supabase-api-locations.example.conf"
SQL_FILE="${APP}/ops/vps/sql/stage4f1-shadow-sessions-oauth-client-id.sql"
TEST_DB="${STAGE4F1_TEST_DB:-scholarshiptop_auth_test}"

echo "=== Stage 4F.1 patch shadow rehearsal auth compat ==="

if [[ -f "${APP}/ops/vps/scripts/setup-supabase-api-env.sh" ]]; then
  sudo bash "${APP}/ops/vps/scripts/setup-supabase-api-env.sh"
  echo "  refreshed supabase-api.env"
fi

if [[ -f "${ENV_FILE}" ]]; then
  if ! sudo grep -q '127.0.0.1:3101' "${ENV_FILE}"; then
    sudo sed -i 's|^GOTRUE_URI_ALLOW_LIST=.*|GOTRUE_URI_ALLOW_LIST=https://scholarshiptop.com,http://127.0.0.1:54321,http://127.0.0.1:3100,http://127.0.0.1:3101|' "${ENV_FILE}"
    echo "  patched GOTRUE_URI_ALLOW_LIST for rehearsal ports"
  else
    echo "  GOTRUE_URI_ALLOW_LIST already includes rehearsal ports"
  fi
fi

if sudo -u postgres psql -t -A -c "SELECT 1 FROM pg_database WHERE datname='${TEST_DB}'" | grep -q 1; then
  echo "  applying idempotent sessions DDL on test DB ${TEST_DB}"
  sudo -u postgres psql -d "${TEST_DB}" -v ON_ERROR_STOP=1 -f "${SQL_FILE}"
else
  echo "  WARN test DB ${TEST_DB} not found; skipping test DDL"
fi

echo "  applying idempotent sessions DDL on scholarshiptop_prod"
sudo -u postgres psql -d scholarshiptop_prod -v ON_ERROR_STOP=1 -f "${SQL_FILE}"

echo "  pulling gotrue v2.184.0 and restarting shadow stack"
sudo docker compose -f "${COMPOSE}" --profile supabase-api-test pull gotrue
sudo docker compose -f "${COMPOSE}" --profile supabase-api-test up -d --force-recreate gotrue supabase-api-gateway postgrest
sleep 10

if curl -sf http://127.0.0.1:54321/health >/dev/null && curl -sf http://127.0.0.1:54321/auth/v1/health >/dev/null; then
  echo "  PASS gateway + auth health"
else
  echo "  FAIL gateway/auth health after patch" >&2
  exit 1
fi

ORIGIN='http://127.0.0.1:3101'
CODE="$(curl -sS -o /dev/null -w '%{http_code}' -X OPTIONS \
  -H "Origin: ${ORIGIN}" \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: authorization,content-type,apikey' \
  http://127.0.0.1:54321/auth/v1/token 2>/dev/null || echo 000)"
HDR="$(curl -sS -D - -o /dev/null -X OPTIONS \
  -H "Origin: ${ORIGIN}" \
  -H 'Access-Control-Request-Method: POST' \
  http://127.0.0.1:54321/auth/v1/token 2>/dev/null | grep -i '^access-control-allow-origin' || true)"
echo "  CORS preflight OPTIONS /auth/v1/token -> ${CODE}"
echo "  ${HDR:-  (no Access-Control-Allow-Origin header)}"
if [[ "${CODE}" == "204" || "${CODE}" == "200" ]] && echo "${HDR}" | grep -q '127.0.0.1:3101'; then
  echo "  PASS rehearsal CORS preflight"
else
  echo "  WARN rehearsal CORS preflight not fully confirmed"
fi

echo "=== Stage 4F.1 patch complete ==="
