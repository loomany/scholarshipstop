#!/usr/bin/env bash
# Stage 9.0 — install autostart hardening on VPS (no secrets printed)
set -euo pipefail

UNIT_SRC="/tmp/scholarshiptop-site.service"
UNIT_DST="/etc/systemd/system/scholarshiptop-site.service"

echo "=== Step 2: mask host nginx ==="
sudo systemctl stop nginx 2>/dev/null || true
sudo systemctl disable nginx 2>/dev/null || true
sudo systemctl mask nginx 2>/dev/null || true
echo "nginx is-enabled: $(systemctl is-enabled nginx 2>&1 || true)"
echo "nginx is-active: $(systemctl is-active nginx 2>&1 || true)"

echo "=== Step 3: install systemd unit ==="
sudo install -m 644 "${UNIT_SRC}" "${UNIT_DST}"
sudo systemctl daemon-reload
sudo systemctl enable scholarshiptop-site.service
echo "scholarshiptop-site is-enabled: $(systemctl is-enabled scholarshiptop-site.service)"

echo "=== Step 4: restart via unit ==="
sudo systemctl restart scholarshiptop-site.service
sleep 10
systemctl status scholarshiptop-site.service --no-pager || true
echo "=== docker ps ==="
sudo docker ps -a
echo "=== ss 80/443 ==="
sudo ss -tulpn | grep -E ':(80|443)' || true
echo "=== nginx logs tail ==="
sudo docker logs --tail=20 scholarshiptop-nginx 2>&1
echo "=== site health ==="
sudo docker inspect scholarshiptop-site --format '{{.State.Health.Status}}' 2>/dev/null || true
echo "=== jobs check ==="
ls /etc/cron.d/ 2>/dev/null | grep -i scholarshiptop || echo "no_scholarshiptop_cron"
sudo docker ps -a --format '{{.Names}}' | grep -vE 'scholarshiptop-site|scholarshiptop-nginx' || echo "only_site_nginx"
