#!/usr/bin/env bash
# Post-reboot verification for Stage 9.0
set -euo pipefail
echo "=== uptime ==="
uptime
echo "=== scholarshiptop-site.service ==="
systemctl status scholarshiptop-site.service --no-pager || true
echo "=== nginx host ==="
systemctl is-enabled nginx 2>&1 || true
systemctl is-active nginx 2>&1 || true
echo "=== docker ps ==="
sudo docker ps -a
echo "=== ss 80/443 ==="
sudo ss -tulpn | grep -E ':(80|443)' || true
echo "=== site health ==="
sudo docker inspect scholarshiptop-site --format '{{.State.Health.Status}}' 2>/dev/null || echo "no_site"
echo "=== jobs ==="
ls /etc/cron.d/ 2>/dev/null | grep -i scholarshiptop || echo "no_scholarshiptop_cron"
sudo docker ps -a --format '{{.Names}}' | grep -vE 'scholarshiptop-site|scholarshiptop-nginx' || echo "only_site_nginx"
echo "=== origin curl ==="
curl -skI --resolve scholarshiptop.com:443:127.0.0.1 https://scholarshiptop.com/ | head -4
