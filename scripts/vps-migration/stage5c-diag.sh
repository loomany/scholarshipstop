#!/usr/bin/env bash
# Stage 5C diag round 3: which anon key file matches the live PostgREST secret?
set -uo pipefail

echo "=== Live PGRST_JWT_SECRET fingerprint (sha256 of value, last 8 hex) ==="
LIVE="$(sudo docker exec scholarshiptop-postgrest-test printenv PGRST_JWT_SECRET 2>/dev/null)"
if [[ -n "${LIVE}" ]]; then
  echo "  postgrest live secret sha256 tail: $(printf '%s' "${LIVE}" | sha256sum | cut -c57-64)"
fi
for f in /root/.supabase-jwt-secret /root/.supabase-jwt-secret-internal; do
  if sudo test -f "${f}"; then
    v="$(sudo cat "${f}" | tr -d '\n\r ')"
    echo "  $(basename "${f}") sha256 tail: $(printf '%s' "${v}" | sha256sum | cut -c57-64)"
  fi
done

echo ""
echo "=== Which anon key file validates against PostgREST (direct :3001)? ==="
for f in \
  /root/.supabase-legacy-anon-jwt \
  /root/.supabase-legacy-anon-jwt-internal; do
  if sudo test -f "${f}"; then
    K="$(sudo cat "${f}" | tr -d '\n\r ')"
    c="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 -H "apikey: ${K}" -H "Authorization: Bearer ${K}" "http://127.0.0.1:3001/profiles?select=id&limit=1" 2>/dev/null || echo 000)"
    echo "  $(basename "${f}") -> ${c}"
  fi
done
# site.stage4e.env key
K="$(sudo grep -E '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' /opt/scholarshiptop/env/site.stage4e.env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"')"
c="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 -H "apikey: ${K}" -H "Authorization: Bearer ${K}" "http://127.0.0.1:3001/profiles?select=id&limit=1" 2>/dev/null || echo 000)"
echo "  site.stage4e.env anon -> ${c}"

echo ""
echo "=== gotrue live GOTRUE_JWT_SECRET fingerprint ==="
GLIVE="$(sudo docker exec scholarshiptop-gotrue-test printenv GOTRUE_JWT_SECRET 2>/dev/null)"
[[ -n "${GLIVE}" ]] && echo "  gotrue live secret sha256 tail: $(printf '%s' "${GLIVE}" | sha256sum | cut -c57-64)"

echo ""
echo "=== supabase-api.env secret fingerprints (presence + tail) ==="
for k in PGRST_JWT_SECRET GOTRUE_JWT_SECRET; do
  v="$(sudo grep -E "^${k}=" /opt/scholarshiptop/env/supabase-api.env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"')"
  [[ -n "${v}" ]] && echo "  ${k} sha256 tail: $(printf '%s' "${v}" | sha256sum | cut -c57-64)"
done
