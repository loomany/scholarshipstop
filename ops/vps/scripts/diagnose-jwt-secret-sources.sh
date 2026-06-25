#!/usr/bin/env bash
# Check for JWT secret sources on VPS (never prints secret values).
set -euo pipefail
echo "=== JWT secret file checks ==="
for f in /root/.supabase-jwt-secret /root/.supabase-jwt-secret-internal /root/.supabase-legacy-anon-jwt /root/.supabase-legacy-anon-jwt-internal; do
  if sudo test -s "$f"; then echo "  present: $f"; else echo "  missing: $f"; fi
done
echo "=== site.env JWT-related keys (names only) ==="
sudo grep -E '^(JWT|SUPABASE.*KEY|NEXT_PUBLIC_SUPABASE)' /opt/scholarshiptop/env/site.env 2>/dev/null \
  | cut -d= -f1 | sort || true
echo "=== auth.instances columns ==="
sudo -u postgres psql -t -A -d scholarshiptop_prod -c \
  "SELECT column_name FROM information_schema.columns WHERE table_schema='auth' AND table_name='instances' ORDER BY 1"
