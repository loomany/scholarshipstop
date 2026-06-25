#!/usr/bin/env bash
set -euo pipefail
source /opt/scholarshiptop/env/shadow-api.env
echo "anon_len=${#SHADOW_SUPABASE_ANON_KEY}"
echo "service_len=${#SHADOW_SUPABASE_SERVICE_ROLE_KEY}"
code="$(curl -sS -u "${SHADOW_API_BASIC_AUTH_USER}:${SHADOW_API_BASIC_AUTH_PASS}" -o /dev/null -w '%{http_code}' \
  -H "apikey: ${SHADOW_SUPABASE_SERVICE_ROLE_KEY}" \
  "https://scholarshiptop.com/vps-shadow-supabase-4c/rest/v1/profiles?select=id&limit=1")"
echo "shadow_service_http=${code}"
code3="$(curl -sS -o /tmp/loc-prof-bearer.json -w '%{http_code}' \
  -H "apikey: ${SHADOW_SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SHADOW_SUPABASE_SERVICE_ROLE_KEY}" \
  "http://127.0.0.1:54321/rest/v1/profiles?select=id&limit=1")"
echo "localhost_bearer_http=${code3} body_len=$(wc -c </tmp/loc-prof-bearer.json)"
