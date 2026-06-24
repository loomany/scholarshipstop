#!/usr/bin/env bash
# Host build + site image rebuild after NEXT_PUBLIC_* change. Site/nginx only.
set -euo pipefail
ROOT=/opt/scholarshiptop
APP="${ROOT}/app"

cd "${APP}"
sudo chown -R "$(whoami):$(whoami)" "${APP}/.next" 2>/dev/null || true
sudo grep '^NEXT_PUBLIC_' "${ROOT}/env/site.env" | sudo tee "${APP}/.env.production" >/dev/null

export NODE_OPTIONS="--max-old-space-size=1536"
export NEXT_TELEMETRY_DISABLED=1
export GENERATE_SOURCEMAP=false
npm run build

cd "${ROOT}"
sudo docker compose -f "${ROOT}/docker-compose.yml" --profile site build site
sudo docker compose -f "${ROOT}/docker-compose.yml" --profile site up -d --no-deps site nginx

sleep 10
sudo docker compose -f "${ROOT}/docker-compose.yml" --profile site ps
sudo docker ps --format '{{.Names}}'
echo "host-rebuild-done"
