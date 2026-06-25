#!/usr/bin/env bash
# Stage 5C.1 — Option B: align self-host gateway JWT with hosted production secret.
# Updates ONLY gateway env + legacy JWT files. Does NOT touch site.env / parsers / hosted.
set -uo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
APP="${ROOT}/app"
ENV_DIR="${ROOT}/env"
API_ENV="${ENV_DIR}/supabase-api.env"
JWT_FILE="${SUPABASE_JWT_SECRET_FILE:-/root/.supabase-jwt-secret}"
LEGACY_ANON="/root/.supabase-legacy-anon-jwt"
LEGACY_SVC="/root/.supabase-legacy-service-jwt"
CUTOVER_ENV="${ENV_DIR}/site.cutover-preview.env"
ORIGIN="https://scholarshiptop.com"
FAIL=0
WARN=0

pass() { echo "PASS  $*"; }
warn() { echo "WARN  $*"; WARN=$((WARN + 1)); }
fail() { echo "FAIL  $*"; FAIL=$((FAIL + 1)); }
section() { echo ""; echo "=== $* ==="; }
fp() { printf '%s' "$1" | sha256sum | cut -c57-64; }

ocurl() { curl -sS -k --resolve "scholarshiptop.com:443:127.0.0.1" "$@"; }
ocode() { ocurl -o /dev/null -w '%{http_code}' --max-time "${2:-20}" "$1" 2>/dev/null || echo 000; }

section "Preflight — production unchanged"
if sudo grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "${ENV_DIR}/site.env" 2>/dev/null | grep -q 'supabase.co'; then
  pass "site.env still hosted Supabase"
else
  fail "site.env not hosted"
fi

section "Option B — verify hosted JWT secret file"
if sudo test -s "${JWT_FILE}"; then
  pass "dashboard JWT secret file present"
else
  fail "missing ${JWT_FILE} — install from Supabase Dashboard first"
  echo "STAGE_5C1_BLOCKED"
  exit 1
fi

section "Regenerate legacy anon/service JWT from hosted secret"
sudo bash "${APP}/ops/vps/scripts/generate-legacy-supabase-jwt.sh"
pass "legacy JWT files regenerated"

section "Verify legacy anon JWT signature against dashboard secret (no values printed)"
if sudo python3 - <<'PY'
import jwt
secret = open("/root/.supabase-jwt-secret").read().strip()
anon = open("/root/.supabase-legacy-anon-jwt").read().strip()
p = jwt.decode(anon, secret, algorithms=["HS256"], options={"verify_aud": False, "verify_exp": False})
assert p.get("role") == "anon"
print("  role=anon iss=%s ref=%s" % (p.get("iss"), p.get("ref")))
PY
then
  pass "legacy anon verifies against dashboard JWT secret"
else
  fail "legacy anon does not verify against dashboard secret"
fi

section "Backup + rebuild supabase-api.env (gateway only)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
sudo cp "${API_ENV}" "${ROOT}/backups/supabase-api.env.pre-stage5c1.${TS}"
sudo chmod 600 "${ROOT}/backups/supabase-api.env.pre-stage5c1.${TS}"
pass "backed up supabase-api.env"

sudo bash "${APP}/ops/vps/scripts/setup-supabase-api-env.sh"
sudo bash "${APP}/ops/vps/scripts/sync-gateway-jwt-secrets.sh"
if sudo grep -q '^JWT_MODE=production' "${API_ENV}" 2>/dev/null; then
  pass "supabase-api.env JWT_MODE=production"
else
  warn "JWT_MODE not production in supabase-api.env"
fi

section "Restart self-host API stack only (not production site)"
sudo bash "${APP}/ops/vps/scripts/restart-supabase-api-test-stack.sh"
sudo docker compose -f "${APP}/ops/vps/docker-compose.supabase-api.example.yml" \
  --profile supabase-api-test up -d --force-recreate postgrest gotrue
sleep 15
pass "API stack restarted"

section "Gateway JWT mode — functional REST probe (legacy anon via /supabase)"
ANON="$(sudo cat "${LEGACY_ANON}" | tr -d '\n\r')"
SERVICE="$(sudo cat "${LEGACY_SVC}" | tr -d '\n\r')"
c="$(ocurl -o /dev/null -w '%{http_code}' --max-time 15 -H "apikey: ${ANON}" -H "Authorization: Bearer ${ANON}" \
  "https://127.0.0.1/supabase/rest/v1/profiles?select=id&limit=1" 2>/dev/null || echo 000)"
echo "  legacy anon profiles probe -> ${c}"
[[ "${c}" == "200" ]] && pass "legacy anon REST probe 200" || fail "legacy anon REST probe ${c}"

section "Build cutover-preview env (NOT site.env)"
sudo bash -c "umask 077; cat > '${CUTOVER_ENV}' <<EOF
# Stage 5C.1 cutover-preview — NOT production site.env
# URL = production API route; keys = legacy JWT signed with hosted dashboard secret
NEXT_PUBLIC_SUPABASE_URL=https://scholarshiptop.com/supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE}
EOF"
sudo chmod 600 "${CUTOVER_ENV}"
pass "wrote ${CUTOVER_ENV} (chmod 600)"

section "REST smoke via /supabase (legacy JWT, no Basic Auth)"
c="$(ocode "https://127.0.0.1/supabase/health" 10)"; echo "  /supabase/health -> ${c}"
[[ "${c}" == "200" ]] && pass "health 200" || fail "health ${c}"
c="$(ocode "https://127.0.0.1/supabase/auth/v1/health" 10)"; echo "  /supabase/auth/v1/health -> ${c}"
[[ "${c}" == "200" ]] && pass "auth health 200" || fail "auth health ${c}"

CR="$(ocurl -s -I --max-time 25 -H "apikey: ${ANON}" -H "Authorization: Bearer ${ANON}" \
  -H "Range: 0-0" -H "Prefer: count=exact" \
  "https://127.0.0.1/supabase/rest/v1/scholarships_safe_listing?select=id" 2>/dev/null \
  | tr -d '\r' | grep -i '^content-range:' | awk '{print $2}')"
COUNT="${CR##*/}"
echo "  scholarships_safe_listing count=${COUNT:-none}"
if [[ "${COUNT}" =~ ^[0-9]+$ ]]; then pass "count=${COUNT}"; else fail "count missing"; fi

BODY="$(ocurl -s --max-time 15 -H "apikey: ${ANON}" -H "Authorization: Bearer ${ANON}" \
  "https://127.0.0.1/supabase/rest/v1/profiles?select=id&limit=5" 2>/dev/null)"
[[ "${BODY}" == "[]" ]] && pass "anon profiles []" || fail "anon profiles not []"

BODY="$(ocurl -s --max-time 15 -H "apikey: ${SERVICE}" -H "Authorization: Bearer ${SERVICE}" \
  "https://127.0.0.1/supabase/rest/v1/profiles?select=id&limit=1" 2>/dev/null)"
echo "${BODY}" | grep -q '"id"' && pass "service_role profiles >=1" || fail "service_role profiles empty"

INST_IDS="$(sudo -u postgres psql -t -A -d scholarshiptop_prod -c \
  "select id from public.institutions where slug is not null order by slug limit 2" 2>/dev/null | paste -sd, - || true)"
if [[ "${INST_IDS}" == *,* ]]; then
  IFS=',' read -r A B <<< "${INST_IDS}"
  c="$(ocurl -o /dev/null -w '%{http_code}' --max-time 20 -X POST \
    -H "apikey: ${ANON}" -H "Authorization: Bearer ${ANON}" -H "Content-Type: application/json" \
    "https://127.0.0.1/supabase/rest/v1/rpc/get_comparison_data" \
    -d "{\"p_inst_a\":\"${A}\",\"p_inst_b\":\"${B}\"}" 2>/dev/null || echo 000)"
  echo "  rpc -> ${c}"
  [[ "${c}" =~ ^(200|204)$ ]] && pass "get_comparison_data ${c}" || fail "rpc ${c}"
else
  warn "rpc skipped"
fi

section "Production sb_publishable keys vs self-host PostgREST (expected limitation)"
PROD_ANON="$(sudo grep -E '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "${ENV_DIR}/site.env" | head -1 | cut -d= -f2- | tr -d '"')"
if [[ "${PROD_ANON}" == sb_publishable_* ]]; then
  c="$(ocurl -o /dev/null -w '%{http_code}' --max-time 15 -H "apikey: ${PROD_ANON}" -H "Authorization: Bearer ${PROD_ANON}" \
    "https://127.0.0.1/supabase/rest/v1/profiles?select=id&limit=1" 2>/dev/null || echo 000)"
  echo "  site.env sb_publishable on self-host REST -> ${c}"
  if [[ "${c}" =~ ^(200|204)$ ]]; then pass "sb_publishable works on self-host"; else warn "sb_publishable not accepted by PostgREST (cutover needs legacy JWT in site.env keys)"; fi
else
  pass "site.env anon is JWT-format"
fi

section "CORS preflight"
HDRS="$(ocurl -s -i -X OPTIONS --max-time 15 -H "Origin: ${ORIGIN}" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization, content-type, apikey" \
  "https://127.0.0.1/supabase/auth/v1/token?grant_type=password" 2>/dev/null | tr -d '\r')"
PCODE="$(echo "${HDRS}" | head -1 | awk '{print $2}')"
ACAO="$(echo "${HDRS}" | grep -i '^access-control-allow-origin:' | head -1)"
[[ "${PCODE}" == "204" && "${ACAO}" == *"${ORIGIN}"* ]] && pass "CORS ${ORIGIN}" || fail "CORS preflight"
EVIL="$(ocurl -s -i -X OPTIONS --max-time 15 -H "Origin: https://evil.example.com" \
  "https://127.0.0.1/supabase/auth/v1/token" 2>/dev/null | tr -d '\r' | grep -i '^access-control-allow-origin:' | head -1)"
[[ -z "${EVIL}" || "${EVIL}" != *"evil.example.com"* ]] && pass "foreign origin blocked" || fail "foreign origin leaked"

section "supabase-js cutover-preview smoke"
if sudo bash -c "cd '${APP}' && STAGE5C1_ENV_FILE='${CUTOVER_ENV}' node scripts/vps-migration/stage5c1-cutover-js-smoke.mjs" 2>&1 | sed 's/^/  /'; then
  pass "supabase-js cutover-preview smoke"
else
  fail "supabase-js cutover-preview smoke"
fi

section "Auth smoke (self-host via /supabase, VPS DB only)"
if sudo bash -c "cd '${APP}' && STAGE5C1_ENV_FILE='${CUTOVER_ENV}' node scripts/vps-migration/stage5c1-auth-smoke.mjs" 2>&1 | sed 's/^/  /'; then
  pass "auth smoke"
else
  fail "auth smoke"
fi

section "Production + parsers unchanged"
HOME_C="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 "${ORIGIN}/" 2>/dev/null || echo 000)"
MAP_C="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 "${ORIGIN}/sitemap.xml" 2>/dev/null || echo 000)"
echo "  ${ORIGIN}/ -> ${HOME_C}  sitemap -> ${MAP_C}"
[[ "${HOME_C}" == "200" && "${MAP_C}" == "200" ]] && pass "production smoke" || fail "production smoke"

if sudo docker logs scholarshiptop-site --since 20m 2>/dev/null | grep -qE '/supabase/(auth|rest)'; then
  warn "production site logs mention /supabase"
else
  pass "site app not calling /supabase"
fi

for slug in bigfuture scholarship-america simpler-grants-gov; do
  f="/opt/scholarshiptop-parsers/env/${slug}.env"
  if sudo grep -E '^SUPABASE_URL=' "${f}" 2>/dev/null | grep -q 'supabase.co'; then
    pass "parser ${slug} still hosted"
  else
    fail "parser ${slug} not hosted"
  fi
done

echo ""
if [[ "${FAIL}" -eq 0 && "${WARN}" -eq 0 ]]; then
  echo "STAGE_5C1_JWT_ALIGNMENT_READY"
  exit 0
fi
if [[ "${FAIL}" -eq 0 ]]; then
  echo "STAGE_5C1_JWT_ALIGNMENT_READY_PASS_WITH_WARNINGS (${WARN})"
  exit 0
fi
echo "STAGE_5C1_BLOCKED (${FAIL} failures, ${WARN} warnings)"
exit 1
