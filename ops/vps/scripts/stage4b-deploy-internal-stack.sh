#!/usr/bin/env bash
# Stage 4B — Deploy localhost-only GoTrue + PostgREST test stack (no production switch).
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
APP="${ROOT}/app"
COMPOSE="${APP}/ops/vps/docker-compose.supabase-api.example.yml"

echo "[stage4b-deploy] Starting internal test stack (localhost only)"

bash "${APP}/ops/vps/scripts/setup-postgrest-authenticator.sh"
bash "${APP}/ops/vps/scripts/grant-postgrest-api-roles.sh"
bash "${APP}/ops/vps/scripts/skip-gotrue-failing-migrations.sh"
bash "${APP}/ops/vps/scripts/seed-gotrue-schema-migrations.sh"

if [[ ! -f /root/.supabase-jwt-secret ]]; then
  echo "[stage4b-deploy] No production JWT secret — using internal JWT mode"
  bash "${APP}/ops/vps/scripts/generate-internal-supabase-jwt.sh"
fi

bash "${APP}/ops/vps/scripts/setup-supabase-api-env.sh"

cd "${APP}"
docker compose -f "${COMPOSE}" --profile supabase-api-test up -d

echo "[stage4b-deploy] Waiting for health..."
sleep 8
curl -sf http://127.0.0.1:54321/health >/dev/null && echo "[stage4b-deploy] gateway OK" || echo "[stage4b-deploy] WARN gateway not ready yet"
curl -sf http://127.0.0.1:9999/health >/dev/null && echo "[stage4b-deploy] gotrue OK" || echo "[stage4b-deploy] WARN gotrue not ready yet"

docker ps --filter name=scholarshiptop-gotrue-test --filter name=scholarshiptop-postgrest-test --filter name=scholarshiptop-supabase-api-gateway-test --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo "[stage4b-deploy] Done"
