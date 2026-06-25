#!/usr/bin/env bash
# Stage 4C — Public shadow Supabase API smoke (basic auth + legacy JWT, no secrets printed).
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
SHADOW_ENV="${ROOT}/env/shadow-api.env"
FAILED=0

pass() { echo "  PASS  $*"; }
fail() { echo "  FAIL  $*"; FAILED=$((FAILED + 1)); }
section() { echo ""; echo "=== $* ==="; }

if [[ ! -f "${SHADOW_ENV}" ]]; then
  echo "ERROR: ${SHADOW_ENV} missing — run setup-shadow-supabase-api-nginx.sh --apply" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${SHADOW_ENV}"

BASE="${SHADOW_SUPABASE_URL%/}"
USER="${SHADOW_API_BASIC_AUTH_USER:?}"
PASS="${SHADOW_API_BASIC_AUTH_PASS:?}"
ANON="${SHADOW_SUPABASE_ANON_KEY:?}"
SERVICE="${SHADOW_SUPABASE_SERVICE_ROLE_KEY:-}"

curl_auth() {
  curl -sS -u "${USER}:${PASS}" "$@"
}

# With basic auth, do not set Authorization: Bearer (curl -u owns Authorization).
# PostgREST accepts JWT via apikey header.

section "Public shadow infrastructure"
for path in /health /auth/v1/health /rest/v1/; do
  code="$(curl_auth -o /dev/null -w '%{http_code}' --max-time 20 "${BASE}${path}" 2>/dev/null || echo 000)"
  echo "  ${path} → ${code}"
  if [[ "${path}" == "/rest/v1/" && ! "${code}" =~ ^(200|401)$ ]]; then fail "${path} ${code}"; fi
  if [[ "${path}" != "/rest/v1/" && "${code}" != "200" ]]; then fail "${path} ${code}"; fi
done

section "Scholarships safe listing (anon JWT)"
body="$(curl_auth --max-time 25 \
  -H "apikey: ${ANON}" \
  "${BASE}/rest/v1/scholarships_safe_listing?select=id,slug&is_active=eq.true&limit=3" 2>/dev/null || true)"
count="$(echo "${body}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo 0)"
if [[ "${count}" -ge 1 ]]; then pass "select count=${count}"; else fail "select failed"; fi

section "Scholarships count header"
hdr="$(curl_auth --max-time 25 -I \
  -H "apikey: ${ANON}" \
  -H "Prefer: count=exact" \
  "${BASE}/rest/v1/scholarships_safe_listing?select=id&is_active=eq.true" 2>/dev/null || true)"
if echo "${hdr}" | grep -qi 'content-range: 0-'; then
  pass "content-range present"
else
  fail "content-range missing"
fi

section "RLS profiles"
body="$(curl_auth --max-time 20 \
  -H "apikey: ${ANON}" \
  "${BASE}/rest/v1/profiles?select=id&limit=3" 2>/dev/null || true)"
if [[ "${body}" == "[]" || -z "${body}" ]]; then pass "profiles anon empty"; else fail "profiles anon leaked"; fi

if [[ -n "${SERVICE}" ]]; then
  body="$(curl_auth --max-time 20 \
    -H "apikey: ${SERVICE}" \
    "${BASE}/rest/v1/profiles?select=id&limit=1" 2>/dev/null || true)"
  scount="$(echo "${body}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo 0)"
  if [[ "${scount}" -ge 1 ]]; then pass "profiles service_role count=${scount}"; else fail "service_role profiles"; fi
else
  fail "SHADOW_SUPABASE_SERVICE_ROLE_KEY empty"
fi

section "RPC get_comparison_data"
INST_IDS="$(sudo -u postgres psql -t -A -d scholarshiptop_prod -c "select id from public.institutions where slug is not null order by slug limit 2" 2>/dev/null | paste -sd, - || true)"
if [[ -z "${INST_IDS}" || "${INST_IDS}" != *,* ]]; then
  fail "need 2 institution UUIDs"
else
  IFS=',' read -r INST_A INST_B <<< "${INST_IDS}"
  code="$(curl_auth -o /tmp/shadow-rpc.json -w '%{http_code}' --max-time 30 \
    -X POST \
    -H "apikey: ${ANON}" \
    -H "Content-Type: application/json" \
    "${BASE}/rest/v1/rpc/get_comparison_data" \
    -d "{\"p_inst_a\":\"${INST_A}\",\"p_inst_b\":\"${INST_B}\"}" 2>/dev/null || echo 000)"
  if [[ "${code}" =~ ^(200|204)$ ]]; then pass "HTTP ${code}"; else fail "HTTP ${code}"; fi
fi

section "Auth config (no login)"
code="$(curl_auth -o /dev/null -w '%{http_code}' --max-time 15 "${BASE}/auth/v1/settings" 2>/dev/null || echo 000)"
if [[ "${code}" == "200" ]]; then pass "auth settings ${code}"; else fail "auth settings ${code}"; fi

section "Storage hybrid"
code="$(curl_auth -o /dev/null -w '%{http_code}' --max-time 10 "${BASE}/storage/v1/object/public/test" 2>/dev/null || echo 000)"
if [[ "${code}" == "503" ]]; then pass "storage/v1 returns 503 (hybrid)"; else fail "storage/v1 ${code} (expected 503)"; fi

section "Production unchanged"
site_url="$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "${ROOT}/env/site.env" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r"'"'"'' || true)"
if echo "${site_url}" | grep -q 'supabase.co'; then pass "site.env still hosted Supabase URL"; else fail "site.env URL unexpected"; fi

section "Site logs — no shadow traffic from production site"
if docker logs scholarshiptop-site --since 30m 2>/dev/null | grep -q 'vps-shadow-supabase-4c'; then
  fail "site container referenced shadow path"
else
  pass "no shadow path in recent site logs"
fi

echo ""
if [[ "${FAILED}" -eq 0 ]]; then
  echo "STAGE_4C_SHADOW_PASS"
  exit 0
fi
echo "STAGE_4C_SHADOW_FAIL (${FAILED})"
exit 1
