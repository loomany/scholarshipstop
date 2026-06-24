#!/usr/bin/env bash
set -euo pipefail
cd /opt/scholarshiptop/app
export NODE_OPTIONS="--max-old-space-size=1536"
export NEXT_TELEMETRY_DISABLED=1
export GENERATE_SOURCEMAP=false
npm run build
cd /opt/scholarshiptop
docker compose -f docker-compose.yml --profile site build site
docker compose -f docker-compose.yml --profile site up -d --no-deps site nginx
docker compose -f docker-compose.yml --profile site ps
