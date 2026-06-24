#!/usr/bin/env bash
# Stage 4B debug — REST responses (no secrets printed)
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
# shellcheck disable=SC1090
source "${ROOT}/env/supabase-api.env"

ANON="${SUPABASE_ANON_KEY:-}"
SERVICE="${SUPABASE_SERVICE_ROLE_KEY:-}"
BASE="${SELFHOST_API_BASE_URL:-http://127.0.0.1:54321}"
BASE="${BASE%/}"

echo "JWT_MODE=${JWT_MODE:-unset}"
echo "ANON_len=${#ANON} SERVICE_len=${#SERVICE}"

for item in \
  "scholarships_limit|/rest/v1/scholarships_safe_listing?select=id,slug&limit=1" \
  "scholarships_active|/rest/v1/scholarships_safe_listing?select=id,slug&is_active=eq.true&limit=3" \
  "profiles_anon|/rest/v1/profiles?select=id&limit=2"; do
  label="${item%%|*}"
  path="${item#*|}"
  body="$(curl -sS --max-time 15 \
    -H "apikey: ${ANON}" \
    -H "Authorization: Bearer ${ANON}" \
    "${BASE}${path}" 2>/dev/null || echo CURL_ERR)"
  echo "--- ${label} (${#body} bytes) ---"
  echo "${body}" | head -c 400
  echo ""
done

hdr="$(curl -sS --max-time 15 -I \
  -H "apikey: ${ANON}" \
  -H "Authorization: Bearer ${ANON}" \
  -H "Prefer: count=exact" \
  "${BASE}/rest/v1/scholarships?select=id&is_active=eq.true" 2>/dev/null || true)"
echo "--- content-range header ---"
echo "${hdr}" | grep -i content-range || echo "(missing)"

export ANON
python3 - <<'PY'
import os, json, base64
tok = os.environ.get("ANON", "")
parts = tok.split(".")
if len(parts) >= 2:
    pad = parts[1] + "=" * (-len(parts[1]) % 4)
    payload = json.loads(base64.urlsafe_b64decode(pad))
    print(f"anon JWT role={payload.get('role')} ref={payload.get('ref')}")
else:
    print(f"anon key not JWT (prefix={tok[:12]}...)")
PY
