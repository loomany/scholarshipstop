#!/usr/bin/env bash
# Stage 5C — deploy production no-Basic-Auth Supabase API route and smoke it.
# Does NOT change site.env, the site container, parsers, or hosted Supabase.
# Adds an nginx route + zero-downtime reload, then validates. No secrets printed.
set -uo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
NGX_INCLUDES="${ROOT}/nginx/includes"
NGX_CONFD="${ROOT}/nginx/conf.d"
ENV_DIR="${ROOT}/env"
STAGE_ENV="${ENV_DIR}/site.stage4e.env"
ORIGIN="https://scholarshiptop.com"
# Origin-direct base (bypasses Cloudflare): hit local nginx with prod Host header.
LOCAL_TLS="https://127.0.0.1"
HOSTHDR="scholarshiptop.com"
FAIL=0
WARN=0

pass() { echo "PASS  $*"; }
warn() { echo "WARN  $*"; WARN=$((WARN + 1)); }
fail() { echo "FAIL  $*"; FAIL=$((FAIL + 1)); }
section() { echo ""; echo "=== $* ==="; }

# curl helper hitting the origin directly with the production Host header.
ocurl() { curl -sS -k --resolve "${HOSTHDR}:443:127.0.0.1" "$@"; }
ocode() { ocurl -o /dev/null -w '%{http_code}' --max-time "${2:-20}" "$1" 2>/dev/null || echo 000; }

section "Validate nginx config"
if sudo docker exec scholarshiptop-nginx nginx -t 2>&1 | sed 's/^/  /'; then
  pass "nginx -t OK"
else
  fail "nginx -t failed"
  echo "STAGE_5C_BLOCKED (nginx config invalid)"
  exit 1
fi

section "Reload nginx (zero downtime, no container restart)"
if sudo docker exec scholarshiptop-nginx nginx -s reload 2>&1 | sed 's/^/  /'; then
  pass "nginx reloaded"
else
  fail "nginx reload failed"
fi
sleep 1

section "Load gateway-matching legacy JWT keys (redacted)"
# The self-host gateway PostgREST/GoTrue are configured with the legacy JWT secret
# (.supabase-jwt-secret). The matching legacy anon/service tokens are these root files.
# NOTE for cutover: site.env must use these legacy JWTs (not the hosted publishable keys).
ANON="$(sudo cat /root/.supabase-legacy-anon-jwt 2>/dev/null | tr -d '\n\r ')"
SERVICE="$(sudo cat /root/.supabase-legacy-service-jwt 2>/dev/null | tr -d '\n\r ')"
[[ -n "${ANON}" ]] && pass "anon key loaded" || fail "anon key missing"
[[ -n "${SERVICE}" ]] && pass "service_role key loaded" || fail "service_role key missing"

section "Health endpoints"
c="$(ocode "${LOCAL_TLS}/supabase/health" 10)"; echo "  /supabase/health -> ${c}"
[[ "${c}" == "200" ]] && pass "gateway health 200" || fail "gateway health ${c}"
c="$(ocode "${LOCAL_TLS}/supabase/auth/v1/health" 10)"; echo "  /supabase/auth/v1/health -> ${c}"
[[ "${c}" == "200" ]] && pass "auth health 200" || fail "auth health ${c}"

section "PostgREST root reachable (no Basic Auth)"
c="$(ocurl -o /dev/null -w '%{http_code}' --max-time 15 -H "apikey: ${ANON}" -H "Authorization: Bearer ${ANON}" "${LOCAL_TLS}/supabase/rest/v1/" 2>/dev/null || echo 000)"
echo "  /supabase/rest/v1/ -> ${c}"
[[ "${c}" =~ ^(200|204)$ ]] && pass "rest root ${c}" || fail "rest root ${c}"

section "scholarships_safe_listing count"
CR="$(ocurl -s -I --max-time 25 \
  -H "apikey: ${ANON}" -H "Authorization: Bearer ${ANON}" \
  -H "Range-Unit: items" -H "Range: 0-0" -H "Prefer: count=exact" \
  "${LOCAL_TLS}/supabase/rest/v1/scholarships_safe_listing?select=id" 2>/dev/null \
  | tr -d '\r' | grep -i '^content-range:' | awk '{print $2}')"
echo "  content-range: ${CR:-none}"
COUNT="${CR##*/}"
if [[ "${COUNT}" =~ ^[0-9]+$ ]]; then
  pass "scholarships_safe_listing count=${COUNT}"
else
  fail "no count returned"
fi

section "anon profiles must be []"
BODY="$(ocurl -s --max-time 15 -H "apikey: ${ANON}" -H "Authorization: Bearer ${ANON}" \
  "${LOCAL_TLS}/supabase/rest/v1/profiles?select=id&limit=5" 2>/dev/null)"
echo "  anon profiles body: $(echo "${BODY}" | head -c 60)"
[[ "${BODY}" == "[]" ]] && pass "anon profiles [] (RLS)" || fail "anon profiles not empty: ${BODY:0:60}"

section "service_role profiles must be >=1"
BODY="$(ocurl -s --max-time 15 -H "apikey: ${SERVICE}" -H "Authorization: Bearer ${SERVICE}" \
  "${LOCAL_TLS}/supabase/rest/v1/profiles?select=id&limit=1" 2>/dev/null)"
if echo "${BODY}" | grep -q '"id"'; then
  pass "service_role profiles >=1 row"
else
  fail "service_role profiles empty: ${BODY:0:60}"
fi

section "RPC get_comparison_data"
INST_IDS="$(sudo -u postgres psql -t -A -d scholarshiptop_prod \
  -c "select id from public.institutions where slug is not null order by slug limit 2" 2>/dev/null | paste -sd, - || true)"
if [[ "${INST_IDS}" == *,* ]]; then
  IFS=',' read -r A B <<< "${INST_IDS}"
  c="$(ocurl -o /dev/null -w '%{http_code}' --max-time 20 -X POST \
    -H "apikey: ${ANON}" -H "Authorization: Bearer ${ANON}" -H "Content-Type: application/json" \
    "${LOCAL_TLS}/supabase/rest/v1/rpc/get_comparison_data" \
    -d "{\"p_inst_a\":\"${A}\",\"p_inst_b\":\"${B}\"}" 2>/dev/null || echo 000)"
  echo "  rpc -> ${c}"
  [[ "${c}" =~ ^(200|204)$ ]] && pass "get_comparison_data ${c}" || fail "get_comparison_data ${c}"
else
  warn "RPC skipped (need 2 institution UUIDs)"
fi

section "CORS preflight from ${ORIGIN}"
HDRS="$(ocurl -s -i -X OPTIONS --max-time 15 \
  -H "Origin: ${ORIGIN}" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization, content-type, apikey" \
  "${LOCAL_TLS}/supabase/auth/v1/token?grant_type=password" 2>/dev/null | tr -d '\r')"
PCODE="$(echo "${HDRS}" | head -1 | awk '{print $2}')"
ACAO="$(echo "${HDRS}" | grep -i '^access-control-allow-origin:' | head -1)"
echo "  preflight status: ${PCODE}"
echo "  ${ACAO:-no ACAO header}"
if [[ "${PCODE}" == "204" && "${ACAO}" == *"${ORIGIN}"* ]]; then
  pass "CORS preflight allows ${ORIGIN}"
else
  fail "CORS preflight not allowing origin (status ${PCODE})"
fi

section "CORS must NOT allow a foreign origin"
EVIL="$(ocurl -s -i -X OPTIONS --max-time 15 -H "Origin: https://evil.example.com" \
  -H "Access-Control-Request-Method: POST" \
  "${LOCAL_TLS}/supabase/auth/v1/token?grant_type=password" 2>/dev/null | tr -d '\r' \
  | grep -i '^access-control-allow-origin:' | head -1)"
if [[ -z "${EVIL}" || "${EVIL}" == *":"* && "${EVIL}" != *"evil.example.com"* ]]; then
  pass "foreign origin not echoed in ACAO"
else
  fail "foreign origin allowed: ${EVIL}"
fi

section "Storage hybrid 503"
c="$(ocode "${LOCAL_TLS}/supabase/storage/v1/object/public/x" 10)"
echo "  /supabase/storage/v1/... -> ${c}"
[[ "${c}" == "503" ]] && pass "storage documented hybrid 503" || warn "storage returned ${c}"

section "Production site still on hosted Supabase"
if sudo grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "${ENV_DIR}/site.env" 2>/dev/null | grep -q 'supabase.co'; then
  pass "site.env still hosted Supabase"
else
  fail "site.env not hosted Supabase"
fi
HOME_C="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 "${ORIGIN}/" 2>/dev/null || echo 000)"
SITE_C="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 "${ORIGIN}/sitemap.xml" 2>/dev/null || echo 000)"
echo "  ${ORIGIN}/ -> ${HOME_C}   /sitemap.xml -> ${SITE_C}"
[[ "${HOME_C}" == "200" && "${SITE_C}" == "200" ]] && pass "production smoke 200/200" || fail "production smoke ${HOME_C}/${SITE_C}"

section "Production logs must not reference shadow/self-host from the app"
if sudo docker logs scholarshiptop-site --since 15m 2>/dev/null | grep -qE '127\.0\.0\.1:54321|/supabase/auth|/supabase/rest'; then
  warn "site logs reference self-host API (review)"
else
  pass "site app not calling self-host API"
fi

echo ""
if [[ "${FAIL}" -eq 0 && "${WARN}" -eq 0 ]]; then
  echo "STAGE_5C_API_ROUTE_READY"
  exit 0
fi
if [[ "${FAIL}" -eq 0 ]]; then
  echo "STAGE_5C_API_ROUTE_READY_PASS_WITH_WARNINGS (${WARN})"
  exit 0
fi
echo "STAGE_5C_BLOCKED (${FAIL} failures, ${WARN} warnings)"
exit 1
