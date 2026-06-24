#!/usr/bin/env bash
# Build Next.js on VPS host (uses swap), then start site via docker compose runtime image.
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
STAGING_URL="${STAGING_URL:-http://213.155.22.74}"

echo "=== host-build-site start ==="

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi
node -v
npm -v

cd "${ROOT}/app"
sudo grep '^NEXT_PUBLIC_' "${ROOT}/env/site.env" | sudo tee "${ROOT}/app/.env.production" >/dev/null

export NODE_OPTIONS="--max-old-space-size=1536"
export NEXT_TELEMETRY_DISABLED=1
export GENERATE_SOURCEMAP=false

if [[ ! -d node_modules ]]; then
  npm ci
fi

npm run build

cd "${ROOT}"
sudo docker compose -f "${ROOT}/docker-compose.yml" --profile site build site
sudo docker compose -f "${ROOT}/docker-compose.yml" --profile site up -d --no-deps site nginx

sleep 8
sudo docker compose -f "${ROOT}/docker-compose.yml" --profile site ps
echo "=== host-build-site done ==="
