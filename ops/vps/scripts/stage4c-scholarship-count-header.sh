#!/usr/bin/env bash
# Print Content-Range for scholarships_safe_listing (no secrets).
set -euo pipefail
ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
# shellcheck disable=SC1090
source "${ROOT}/env/shadow-api.env"
BASE="${SHADOW_SUPABASE_URL%/}"
curl -sS -u "${SHADOW_API_BASIC_AUTH_USER}:${SHADOW_API_BASIC_AUTH_PASS}" -I \
  -H "apikey: ${SHADOW_SUPABASE_ANON_KEY}" \
  -H "Prefer: count=exact" \
  "${BASE}/rest/v1/scholarships_safe_listing?select=id&is_active=eq.true" \
  | grep -i '^content-range:' || true
