#!/usr/bin/env bash
# Stage 4 remote bootstrap on VPS — site only, jobs OFF.
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
STAGING_URL="${STAGING_URL:-http://213.155.22.74}"

echo "=== stage4-remote start ROOT=${ROOT} ==="

if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  if ! grep -q '^/swapfile ' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  fi
fi
free -h

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$USER" || true

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: docker compose plugin missing" >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq git curl ca-certificates
fi

sudo mkdir -p "${ROOT}/"{app,env,logs,backups,nginx/conf.d,nginx/certs,scripts}
sudo chmod 700 "${ROOT}/env"

if [[ -f /tmp/scholarshiptop-scaffold/docker-compose.yml ]]; then
  sudo cp -f /tmp/scholarshiptop-scaffold/docker-compose.yml "${ROOT}/"
  sudo cp -f /tmp/scholarshiptop-scaffold/Dockerfile "${ROOT}/"
  sudo cp -f /tmp/scholarshiptop-scaffold/nginx/conf.d/"*.conf" "${ROOT}/nginx/conf.d/" 2>/dev/null || true
  sudo cp -f /tmp/scholarshiptop-scaffold/scripts/"*.sh" "${ROOT}/scripts/"
  sudo chmod +x "${ROOT}/scripts/"*.sh
fi

if [[ ! -f "${ROOT}/env/site.env" ]]; then
  echo "ERROR: missing ${ROOT}/env/site.env" >&2
  exit 1
fi
sudo chmod 600 "${ROOT}/env/site.env"

# Ensure staging URLs (no secrets printed)
sudo sed -i "s|^SITE_URL=.*|SITE_URL=${STAGING_URL}|" "${ROOT}/env/site.env"
sudo sed -i "s|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=${STAGING_URL}|" "${ROOT}/env/site.env"

cd "${ROOT}"
sudo docker compose --profile site build site
sudo docker compose --profile site up -d --no-deps site nginx

sleep 8
sudo docker compose --profile site ps
sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo "=== stage4-remote done ==="
