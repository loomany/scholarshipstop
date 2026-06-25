#!/usr/bin/env bash
# Stage 4C.1 — Dashboard JWT compatibility smoke (no secrets printed).
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
APP="${ROOT}/app"
SHADOW_ENV="${ROOT}/env/shadow-api.env"
SUPABASE_ENV="${ROOT}/env/supabase-api.env"
FAILED=0
WARN=0

pass() { echo "  PASS  $*"; }
fail() { echo "  FAIL  $*"; FAILED=$((FAILED + 1)); }
warn() { echo "  WARN  $*"; WARN=$((WARN + 1)); }
section() { echo ""; echo "=== $* ==="; }

section "Dashboard JWT files"
if sudo test -s /root/.supabase-jwt-secret; then pass "dashboard JWT secret file present"; else fail "dashboard JWT secret missing"; fi
if sudo test -s /root/.supabase-legacy-anon-jwt; then pass "legacy anon JWT file present"; else fail "legacy anon JWT missing"; fi
if sudo test -s /root/.supabase-legacy-service-jwt; then pass "legacy service JWT file present"; else fail "legacy service JWT missing"; fi

section "supabase-api.env JWT mode"
if [[ ! -f "${SUPABASE_ENV}" ]]; then
  fail "supabase-api.env missing"
else
  if sudo grep -q '^JWT_MODE=production$' "${SUPABASE_ENV}"; then
    pass "JWT_MODE=production"
  else
    fail "JWT_MODE is not production"
  fi
  if sudo grep -q '^JWT_MODE=internal$' "${SUPABASE_ENV}"; then
    fail "JWT_MODE=internal still active"
  else
    pass "JWT_MODE is not internal"
  fi
  if sudo grep -qE '^SUPABASE_ANON_KEY=.*-internal' "${SUPABASE_ENV}"; then
    fail "supabase-api.env still uses internal JWT key files"
  else
    pass "no internal JWT key paths in supabase-api.env"
  fi
fi

section "Localhost stack health"
for path in /health /auth/v1/health; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "http://127.0.0.1:54321${path}" 2>/dev/null || echo 000)"
  echo "  ${path} → ${code}"
  [[ "${code}" == "200" ]] || fail "${path} ${code}"
done
code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "http://127.0.0.1:54321/auth/v1/settings" 2>/dev/null || echo 000)"
echo "  /auth/v1/settings → ${code}"
[[ "${code}" == "200" ]] || fail "auth settings ${code}"

section "Localhost PostgREST (legacy JWT)"
if [[ -f "${SUPABASE_ENV}" ]]; then
  # shellcheck disable=SC1090
  source "${SUPABASE_ENV}"
fi
ANON="${SUPABASE_ANON_KEY:-}"
SERVICE="${SUPABASE_SERVICE_ROLE_KEY:-}"
if [[ -z "${ANON}" || -z "${SERVICE}" ]]; then
  fail "SUPABASE_ANON_KEY or SERVICE_ROLE_KEY empty in supabase-api.env"
else
  hdr="$(curl -sS -I -H "apikey: ${ANON}" -H "Authorization: Bearer ${ANON}" \
    -H "Prefer: count=exact" \
    "http://127.0.0.1:54321/rest/v1/scholarships_safe_listing?select=id&is_active=eq.true" 2>/dev/null | grep -i '^content-range:' || true)"
  if echo "${hdr}" | grep -q '21107/21108'; then
    pass "scholarships count 21108"
  else
    fail "scholarships count header unexpected"
  fi
  body="$(curl -sS -H "apikey: ${ANON}" -H "Authorization: Bearer ${ANON}" \
    "http://127.0.0.1:54321/rest/v1/profiles?select=id&limit=3" 2>/dev/null || true)"
  [[ "${body}" == "[]" ]] && pass "anon profiles empty" || fail "anon profiles leaked"
  body="$(curl -sS -H "apikey: ${SERVICE}" -H "Authorization: Bearer ${SERVICE}" \
    "http://127.0.0.1:54321/rest/v1/profiles?select=id&limit=1" 2>/dev/null || true)"
  scount="$(echo "${body}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo 0)"
  [[ "${scount}" -ge 1 ]] && pass "service_role profiles count=${scount}" || fail "service_role profiles"
  INST_IDS="$(sudo -u postgres psql -t -A -d scholarshiptop_prod -c "select id from public.institutions where slug is not null order by slug limit 2" 2>/dev/null | paste -sd, - || true)"
  if [[ -z "${INST_IDS}" || "${INST_IDS}" != *,* ]]; then
    fail "need 2 institution UUIDs for RPC"
  else
    IFS=',' read -r INST_A INST_B <<< "${INST_IDS}"
    code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
      -H "apikey: ${ANON}" -H "Authorization: Bearer ${ANON}" \
      -H "Content-Type: application/json" \
      "http://127.0.0.1:54321/rest/v1/rpc/get_comparison_data" \
      -d "{\"p_inst_a\":\"${INST_A}\",\"p_inst_b\":\"${INST_B}\"}" 2>/dev/null || echo 000)"
    [[ "${code}" =~ ^(200|204)$ ]] && pass "RPC HTTP ${code}" || fail "RPC HTTP ${code}"
  fi
fi

section "Public shadow smoke"
if [[ -f "${APP}/scripts/vps-migration/stage4c-public-shadow-smoke.sh" ]]; then
  if sudo bash "${APP}/scripts/vps-migration/stage4c-public-shadow-smoke.sh"; then
    pass "stage4c-public-shadow-smoke.sh"
  else
    fail "stage4c-public-shadow-smoke.sh"
  fi
else
  fail "stage4c-public-shadow-smoke.sh missing"
fi

section "supabase-js shadow smoke"
if sudo bash -c "cd '${APP}' && node scripts/vps-migration/stage4c-supabase-js-shadow-smoke.mjs"; then
  pass "stage4c-supabase-js-shadow-smoke.mjs"
else
  fail "stage4c-supabase-js-shadow-smoke.mjs"
fi

section "Production unchanged"
site_url="$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "${ROOT}/env/site.env" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r"'"'"'' || true)"
if echo "${site_url}" | grep -q 'supabase.co'; then pass "site.env hosted Supabase URL"; else fail "site.env URL unexpected"; fi
if sudo docker logs scholarshiptop-site --since 30m 2>/dev/null | grep -q 'vps-shadow-supabase-4c'; then
  fail "site logs reference shadow path"
else
  pass "no shadow path in site logs"
fi

section "Production HTTP smoke"
for url in https://scholarshiptop.com https://scholarshiptop.com/sitemap.xml; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 "${url}" 2>/dev/null || echo 000)"
  echo "  ${url} → ${code}"
  [[ "${code}" == "200" ]] || fail "${url} ${code}"
done
SLUGS="$(sudo -u postgres psql -t -A -d scholarshiptop_prod -c "select slug from public.scholarships where is_active=true and slug is not null order by updated_at desc nulls last limit 3" 2>/dev/null || true)"
n=0
while IFS= read -r slug; do
  [[ -z "${slug}" ]] && continue
  n=$((n + 1))
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 "https://scholarshiptop.com/scholarships/${slug}" 2>/dev/null || echo 000)"
  echo "  /scholarships/${slug} → ${code}"
  [[ "${code}" == "200" ]] || fail "scholarship detail ${slug} ${code}"
done <<< "${SLUGS}"
[[ "${n}" -ge 3 ]] && pass "3 scholarship detail pages" || fail "fewer than 3 scholarship detail pages"

section "RAM / CPU"
free -h | sed -n '1,2p'
uptime

echo ""
if [[ "${FAILED}" -eq 0 && "${WARN}" -eq 0 ]]; then
  echo "STAGE_4C1_JWT_COMPAT_PASS"
  exit 0
fi
if [[ "${FAILED}" -eq 0 ]]; then
  echo "STAGE_4C1_JWT_COMPAT_PASS_WITH_WARNINGS (${WARN})"
  exit 0
fi
echo "STAGE_4C1_JWT_COMPAT_BLOCKED (${FAILED} failures, ${WARN} warnings)"
exit 1
