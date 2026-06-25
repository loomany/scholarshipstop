#!/usr/bin/env bash
# Restart self-host Supabase API test stack and refresh nginx upstream DNS.
set -euo pipefail

APP="${SCHOLARSHIPTOP_APP_ROOT:-/opt/scholarshiptop/app}"
COMPOSE="${APP}/ops/vps/docker-compose.supabase-api.example.yml"

docker compose -f "${COMPOSE}" --profile supabase-api-test down
docker compose -f "${COMPOSE}" --profile supabase-api-test up -d
sleep 8
docker network connect scholarshiptop-supabase-api_supabase_api_test scholarshiptop-nginx 2>/dev/null || true
docker exec scholarshiptop-nginx nginx -s reload
echo "[restart-supabase-api-test] stack restarted and nginx reloaded"
