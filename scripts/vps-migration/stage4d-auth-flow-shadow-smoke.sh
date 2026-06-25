#!/usr/bin/env bash
# Stage 4D — Auth flow shadow smoke orchestration (no secrets printed).
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
APP="${ROOT}/app"
SHADOW_ENV="${ROOT}/env/shadow-api.env"
STATE_FILE="${STAGE4D_STATE_FILE:-/tmp/stage4d-shadow-auth-state.json}"
FAILED=0
WARN=0

pass() { echo "  PASS  $*"; }
fail() { echo "  FAIL  $*"; FAILED=$((FAILED + 1)); }
warn() { echo "  WARN  $*"; WARN=$((WARN + 1)); }
section() { echo ""; echo "=== $* ==="; }

count_auth_users() {
  sudo -u postgres psql -t -A -d scholarshiptop_prod -c 'select count(*) from auth.users' 2>/dev/null || echo 0
}
count_auth_identities() {
  sudo -u postgres psql -t -A -d scholarshiptop_prod -c 'select count(*) from auth.identities' 2>/dev/null || echo 0
}
count_profiles() {
  sudo -u postgres psql -t -A -d scholarshiptop_prod -c 'select count(*) from public.profiles' 2>/dev/null || echo 0
}

section "Preflight"
if [[ ! -f "${SHADOW_ENV}" ]]; then
  echo "ERROR: ${SHADOW_ENV} missing" >&2
  exit 1
fi
# Remove stale Stage 4D test users from prior failed runs.
sudo -u postgres psql -d scholarshiptop_prod -v ON_ERROR_STOP=1 <<'SQL' >/dev/null || true
delete from public.profiles p
using auth.users u
where p.id = u.id and u.email like 'shadow-stage4d+%@invalid.scholarshiptop.test';
delete from auth.identities i
using auth.users u
where i.user_id = u.id and u.email like 'shadow-stage4d+%@invalid.scholarshiptop.test';
delete from auth.users u
where u.email like 'shadow-stage4d+%@invalid.scholarshiptop.test';
SQL
if ! sudo test -s /root/.supabase-jwt-secret; then
  fail "dashboard JWT secret missing"
else
  pass "dashboard JWT secret present"
fi
if ! curl -sS -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:54321/auth/v1/health | grep -q 200; then
  fail "localhost shadow auth health"
else
  pass "localhost shadow auth health 200"
fi

USERS_BEFORE="$(count_auth_users)"
IDENT_BEFORE="$(count_auth_identities)"
PROFILES_BEFORE="$(count_profiles)"
echo "  auth.users before=${USERS_BEFORE}"
echo "  auth.identities before=${IDENT_BEFORE}"
echo "  public.profiles before=${PROFILES_BEFORE}"

section "Auth flow smoke (internal shadow gateway)"
export SHADOW_ENV_FILE="${SHADOW_ENV}"
export SHADOW_AUTH_BASE_URL="${SHADOW_AUTH_BASE_URL:-http://127.0.0.1:54321}"
export STAGE4D_STATE_FILE="${STATE_FILE}"
if sudo bash -c "cd '${APP}' && node scripts/vps-migration/stage4d-auth-flow-shadow-smoke.mjs"; then
  pass "stage4d-auth-flow-shadow-smoke.mjs"
else
  fail "stage4d-auth-flow-shadow-smoke.mjs"
fi

USERS_AFTER="$(count_auth_users)"
IDENT_AFTER="$(count_auth_identities)"
PROFILES_AFTER="$(count_profiles)"
echo "  auth.users after smoke=${USERS_AFTER}"
echo "  auth.identities after smoke=${IDENT_AFTER}"
echo "  public.profiles after smoke=${PROFILES_AFTER}"

if [[ "${USERS_AFTER}" -gt "${USERS_BEFORE}" ]]; then
  pass "auth.users increased during smoke (+$((USERS_AFTER - USERS_BEFORE)))"
else
  fail "auth.users did not increase"
fi

section "Test user cleanup"
if [[ -f "${STATE_FILE}" ]]; then
  TEST_USER_ID="$(python3 -c "import json; print(json.load(open('${STATE_FILE}'))['userId'])" 2>/dev/null || true)"
  TEST_EMAIL="$(python3 -c "import json; print(json.load(open('${STATE_FILE}'))['email'])" 2>/dev/null || true)"
  if [[ -n "${TEST_USER_ID}" ]]; then
    sudo -u postgres psql -v ON_ERROR_STOP=1 -d scholarshiptop_prod <<SQL >/dev/null
delete from public.profiles where id = '${TEST_USER_ID}';
delete from auth.identities where user_id = '${TEST_USER_ID}';
delete from auth.users where id = '${TEST_USER_ID}';
SQL
    pass "cleanup deleted test user id=${TEST_USER_ID}"
  else
    fail "cleanup skipped (no test user id in state file)"
  fi
  sudo rm -f "${STATE_FILE}"
else
  warn "state file missing — cleanup may be incomplete"
fi

USERS_CLEAN="$(count_auth_users)"
IDENT_CLEAN="$(count_auth_identities)"
PROFILES_CLEAN="$(count_profiles)"
echo "  auth.users after cleanup=${USERS_CLEAN}"
echo "  auth.identities after cleanup=${IDENT_CLEAN}"
echo "  public.profiles after cleanup=${PROFILES_CLEAN}"

if [[ "${USERS_CLEAN}" -eq "${USERS_BEFORE}" ]]; then
  pass "auth.users restored to baseline"
else
  warn "auth.users count differs from baseline after cleanup (${USERS_BEFORE} -> ${USERS_CLEAN})"
  WARN=$((WARN + 1))
fi

section "Public shadow auth endpoints (read-only)"
# shellcheck disable=SC1090
source "${SHADOW_ENV}"
BASE="${SHADOW_SUPABASE_URL%/}"
for path in /auth/v1/health /auth/v1/settings; do
  code="$(curl -sS -u "${SHADOW_API_BASIC_AUTH_USER}:${SHADOW_API_BASIC_AUTH_PASS}" -o /dev/null -w '%{http_code}' --max-time 15 "${BASE}${path}" 2>/dev/null || echo 000)"
  echo "  ${path} → ${code}"
  [[ "${code}" == "200" ]] || fail "public shadow ${path} ${code}"
done
pass "public shadow auth health/settings reachable"
warn "Bearer session flows on public shadow path not tested (basic auth shares Authorization header)"

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

section "Service logs (recent errors)"
for c in scholarshiptop-gotrue-test scholarshiptop-postgrest-test scholarshiptop-supabase-api-gateway-test; do
  if sudo docker logs "${c}" --since 20m 2>&1 | grep -Ei 'fatal|panic|error' | grep -vi 'level=info' | tail -1 | grep -q .; then
    warn "${c} has recent error lines (see docker logs)"
  else
    pass "${c} no fatal errors in last 20m"
  fi
done

section "RAM / CPU"
free -h | sed -n '1,2p'
uptime

echo ""
if [[ "${FAILED}" -eq 0 && "${WARN}" -eq 0 ]]; then
  echo "STAGE_4D_AUTH_FLOW_PASS"
  exit 0
fi
if [[ "${FAILED}" -eq 0 ]]; then
  echo "STAGE_4D_AUTH_FLOW_PASS_WITH_WARNINGS (${WARN})"
  exit 0
fi
echo "STAGE_4D_AUTH_FLOW_BLOCKED (${FAILED} failures, ${WARN} warnings)"
exit 1
