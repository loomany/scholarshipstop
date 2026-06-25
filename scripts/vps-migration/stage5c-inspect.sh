#!/usr/bin/env bash
# Stage 5C read-only inspection: nginx mounts, docker networks, gateway reachability.
set -uo pipefail

echo "=== Deployed shadow supabase api conf ==="
sudo cat /opt/scholarshiptop/nginx/includes/scholarshiptop-shadow-supabase-api.conf 2>/dev/null | sed 's/^/  /'

echo ""
echo "=== nginx container mounts (host -> container) ==="
sudo docker inspect scholarshiptop-nginx --format '{{range .Mounts}}{{.Source}} -> {{.Destination}} ({{.Mode}}){{println}}{{end}}' 2>/dev/null | sed 's/^/  /'

echo ""
echo "=== nginx container networks ==="
sudo docker inspect scholarshiptop-nginx --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} ip={{$v.IPAddress}}{{println}}{{end}}' 2>/dev/null | sed 's/^/  /'

echo ""
echo "=== gateway container networks ==="
sudo docker inspect scholarshiptop-supabase-api-gateway-test --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} ip={{$v.IPAddress}}{{println}}{{end}}' 2>/dev/null | sed 's/^/  /'

echo ""
echo "=== Can production nginx resolve+reach the gateway by name? ==="
sudo docker exec scholarshiptop-nginx sh -c "getent hosts scholarshiptop-supabase-api-gateway-test 2>/dev/null || echo 'NO_DNS'" 2>/dev/null | sed 's/^/  /'
sudo docker exec scholarshiptop-nginx sh -c "wget -qO- --timeout=5 http://scholarshiptop-supabase-api-gateway-test:8080/health 2>/dev/null || echo 'NO_REACH'" 2>/dev/null | sed 's/^/  health: /'

echo ""
echo "=== docker networks list ==="
sudo docker network ls | sed 's/^/  /'

echo ""
echo "=== nginx include dir (host) ==="
sudo ls -la /opt/scholarshiptop/nginx/includes/ 2>/dev/null | sed 's/^/  /'

echo ""
echo "=== site conf server blocks ==="
sudo grep -nE 'server_name|listen|include' /opt/scholarshiptop/nginx/conf.d/scholarshiptop-site.conf 2>/dev/null | sed 's/^/  /'
