#!/usr/bin/env bash
set -euo pipefail
ROOT=/opt/scholarshiptop
ENV_FILE="${ROOT}/env/site.env"

sudo cp /tmp/scholarshiptop-site.conf "${ROOT}/nginx/conf.d/scholarshiptop-site.conf"
sudo mkdir -p "${ROOT}/nginx/includes"
sudo cp /tmp/scholarshiptop-proxy-locations.conf "${ROOT}/nginx/includes/scholarshiptop-proxy-locations.conf"
sudo cp /tmp/docker-compose.yml "${ROOT}/docker-compose.yml"

sudo chown root:root "${ROOT}/secrets/cloudflare-origin.pem" "${ROOT}/secrets/cloudflare-origin.key"
sudo chmod 644 "${ROOT}/secrets/cloudflare-origin.pem"
sudo chmod 600 "${ROOT}/secrets/cloudflare-origin.key"

sudo mkdir -p "${ROOT}/backups"
sudo cp "${ENV_FILE}" "${ROOT}/backups/site.env.pre-ssl-$(date -u +%Y%m%dT%H%M%SZ)"

sudo python3 - <<'PY'
from pathlib import Path
p = Path("/opt/scholarshiptop/env/site.env")
lines = p.read_text(encoding="utf-8").splitlines()
updates = {
    "SITE_URL": "https://scholarshiptop.com",
    "NEXT_PUBLIC_SITE_URL": "https://scholarshiptop.com",
}
seen = set()
out = []
for line in lines:
    if not line or line.lstrip().startswith("#") or "=" not in line:
        out.append(line)
        continue
    key = line.split("=", 1)[0]
    if key in updates:
        out.append(f"{key}={updates[key]}")
        seen.add(key)
    else:
        out.append(line)
for key, val in updates.items():
    if key not in seen:
        out.append(f"{key}={val}")
p.write_text("\n".join(out).rstrip() + "\n", encoding="utf-8")
PY
sudo chmod 600 "${ENV_FILE}"
echo "env-updated"

sudo docker compose -f "${ROOT}/docker-compose.yml" --profile site up -d --no-deps nginx
sleep 5
sudo docker compose -f "${ROOT}/docker-compose.yml" --profile site ps
sudo docker ps --format '{{.Names}}'
