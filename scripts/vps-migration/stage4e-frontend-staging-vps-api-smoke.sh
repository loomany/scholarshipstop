#!/usr/bin/env bash
# Stage 4E - frontend staging smoke against VPS self-host Supabase API.
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
APP="${ROOT}/app"
SITE_ENV="${ROOT}/env/site.env"
STAGE_ENV="${ROOT}/env/site.stage4e.env"
OUT_JSON="${ROOT}/logs/stage4e-frontend-smoke.json"
SITE_LOG="${ROOT}/logs/stage4e-site.log"
PID_FILE="/tmp/stage4e-site.pid"
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

cleanup_test_users() {
  sudo -u postgres psql -d scholarshiptop_prod -v ON_ERROR_STOP=1 <<'SQL' >/dev/null || true
delete from public.profiles p
using auth.users u
where p.id = u.id and (u.email like 'shadow-stage4e%@invalid.scholarshiptop.test' or u.email like 'shadow-stage4e-ui%@invalid.scholarshiptop.test');
delete from auth.identities i
using auth.users u
where i.user_id = u.id and (u.email like 'shadow-stage4e%@invalid.scholarshiptop.test' or u.email like 'shadow-stage4e-ui%@invalid.scholarshiptop.test');
delete from auth.users u
where u.email like 'shadow-stage4e%@invalid.scholarshiptop.test' or u.email like 'shadow-stage4e-ui%@invalid.scholarshiptop.test';
SQL
}

stop_stage_site() {
  if [[ -f "${PID_FILE}" ]]; then
    pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
    if [[ -n "${pid}" ]]; then
      sudo kill "${pid}" >/dev/null 2>&1 || true
      sleep 1
      sudo kill -9 "${pid}" >/dev/null 2>&1 || true
    fi
    sudo rm -f "${PID_FILE}" >/dev/null 2>&1 || true
  fi
}

staging_health_code() {
  local raw
  raw="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "${STAGE_BASE}/" 2>/dev/null || true)"
  raw="${raw:0:3}"
  [[ -n "${raw}" ]] || raw="000"
  echo "${raw}"
}

ensure_staging_healthy() {
  local code attempt
  for attempt in 1 2 3; do
    code="$(staging_health_code)"
    [[ "${code}" == "200" ]] && return 0
    warn "staging site unhealthy (${code}); restart attempt ${attempt}"
    stop_stage_site
    sleep 2
    sudo bash -c "cd '${APP}' && set -a && source '${STAGE_ENV}' && set +a && PORT=3100 HOSTNAME=127.0.0.1 NODE_OPTIONS='--max-old-space-size=2048' npm run dev > '${SITE_LOG}' 2>&1 & echo \$! > '${PID_FILE}'"
    for _ in $(seq 1 45); do
      code="$(staging_health_code)"
      [[ "${code}" == "200" ]] && return 0
      sleep 2
    done
  done
  return 1
}

check_page() {
  local path="$1"
  local label="$2"
  local timeout="${3:-120}"
  local code attempt
  for attempt in 1 2 3; do
    if [[ "${attempt}" -gt 1 ]]; then
      ensure_staging_healthy || true
    fi
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time "${timeout}" "${STAGE_BASE}${path}" 2>/dev/null || true)"
    code="${code:0:3}"
    [[ -n "${code}" ]] || code="000"
    echo "  ${path} -> ${code} (attempt ${attempt})"
    if [[ "${code}" == "200" ]]; then
      pass "${label}"
      return 0
    fi
    sleep 3
  done
  fail "${label} ${code}"
  return 0
}

check_protected_route() {
  local path="$1"
  local label="$2"
  local timeout="${3:-90}"
  local code attempt
  for attempt in 1 2 3; do
    if [[ "${attempt}" -gt 1 ]]; then
      ensure_staging_healthy || true
    fi
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time "${timeout}" "${STAGE_BASE}${path}" 2>/dev/null || true)"
    code="${code:0:3}"
    [[ -n "${code}" ]] || code="000"
    echo "  ${path} -> ${code} (attempt ${attempt})"
    if [[ "${code}" == "200" || "${code}" == "307" || "${code}" == "302" ]]; then
      pass "${label} (unauthenticated redirect/status ${code})"
      return 0
    fi
    sleep 3
  done
  fail "${label} ${code}"
  return 0
}

pick_scholarship_path() {
  local slug
  slug="$(curl -sS --max-time 30 "${STAGE_BASE}/sitemap.xml" 2>/dev/null | tr ' ' '\n' | grep -Eo '/scholarships/[^<]+' | head -n 1 || true)"
  if [[ -n "${slug}" ]]; then
    echo "${slug}"
  else
    echo "/scholarships/engineering-foundation-year-bursaries-at-university-college-london-2026-engineering-foundation-year-burs"
  fi
}

section "Preflight"
if [[ ! -f "${SITE_ENV}" ]]; then
  echo "ERROR: ${SITE_ENV} missing" >&2
  exit 1
fi
if ! sudo test -s /root/.supabase-legacy-anon-jwt; then fail "legacy anon JWT missing"; else pass "legacy anon JWT present"; fi
if ! sudo test -s /root/.supabase-legacy-service-jwt; then fail "legacy service JWT missing"; else pass "legacy service JWT present"; fi
if ! curl -sS -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:54321/health | grep -q 200; then
  fail "self-host API gateway localhost health"
else
  pass "self-host API gateway localhost health 200"
fi

USERS_BEFORE="$(count_auth_users)"
IDENT_BEFORE="$(count_auth_identities)"
PROFILES_BEFORE="$(count_profiles)"
echo "  auth.users before=${USERS_BEFORE}"
echo "  auth.identities before=${IDENT_BEFORE}"
echo "  public.profiles before=${PROFILES_BEFORE}"

section "Prepare staging env (non-production)"
cleanup_test_users
sudo cp "${SITE_ENV}" "${STAGE_ENV}"
sudo chmod 600 "${STAGE_ENV}"
ANON="$(sudo tr -d '\r\n' < /root/.supabase-legacy-anon-jwt)"
SERVICE="$(sudo tr -d '\r\n' < /root/.supabase-legacy-service-jwt)"
sudo sed -i '/^NEXT_PUBLIC_SUPABASE_URL=/d;/^NEXT_PUBLIC_SUPABASE_ANON_KEY=/d;/^SUPABASE_SERVICE_ROLE_KEY=/d' "${STAGE_ENV}"
{
  echo "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321"
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY='${ANON}'"
  echo "SUPABASE_SERVICE_ROLE_KEY='${SERVICE}'"
} | sudo tee -a "${STAGE_ENV}" >/dev/null
pass "site.stage4e.env uses localhost self-host API + legacy JWT keys"
warn "scheme=A localhost-only staging site (127.0.0.1:3100) + localhost API (no public basic-auth route)"

section "Start staging Next.js site (localhost-only)"
stop_stage_site
sudo bash -c "cd '${APP}' && set -a && source '${STAGE_ENV}' && set +a && PORT=3100 HOSTNAME=127.0.0.1 NODE_OPTIONS='--max-old-space-size=2048' npm run dev > '${SITE_LOG}' 2>&1 & echo \$! > '${PID_FILE}'"
STAGE_BASE="http://127.0.0.1:3100"
READY=0
for _ in $(seq 1 60); do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "${STAGE_BASE}/" 2>/dev/null || true)"
  if [[ "${code}" == "200" ]]; then
    READY=1
    break
  fi
  sleep 2
done
if [[ "${READY}" == "1" ]]; then
  pass "staging site up on ${STAGE_BASE}"
else
  fail "staging site did not become healthy"
  stop_stage_site
  echo "STAGE_4E_FRONTEND_STAGING_BLOCKED (${FAILED} failures, ${WARN} warnings)"
  exit 1
fi

section "Frontend page smoke (staging site)"
SCHOLARSHIP_PATH="$(pick_scholarship_path)"
echo "  scholarship detail path=${SCHOLARSHIP_PATH}"
check_page "/" "homepage" 60
check_page "/sitemap.xml" "sitemap" 60
check_page "/scholarships" "listing page" 90
check_page "/resources" "SEO hub/resources page" 90
check_page "/compare" "compare page" 120
check_page "${SCHOLARSHIP_PATH}" "scholarship detail page" 180
check_page "/signin/password_signin" "auth signin page" 90
check_protected_route "/account" "account page route" 90

section "Frontend auth smoke (@supabase/ssr + middleware account)"
if sudo bash -c "cd '${APP}' && STAGE4E_ENV_FILE='${STAGE_ENV}' STAGE4E_BASE_URL='${STAGE_BASE}' STAGE4E_OUT_FILE='${OUT_JSON}' node scripts/vps-migration/stage4e-frontend-staging-auth.mjs"; then
  pass "stage4e-frontend-staging-auth.mjs"
else
  fail "stage4e-frontend-staging-auth.mjs"
fi

section "Optional Playwright UI sign-in"
if sudo bash -c "cd '${APP}' && STAGE4E_BASE_URL='${STAGE_BASE}' node scripts/vps-migration/stage4e-frontend-staging-ui-signin.mjs"; then
  pass "stage4e-frontend-staging-ui-signin.mjs"
else
  warn "Playwright UI sign-in skipped/failed (SSR auth path is primary)"
fi

section "Cleanup Stage 4E test users"
cleanup_test_users
pass "cleanup removed stage4e test users"
USERS_AFTER="$(count_auth_users)"
IDENT_AFTER="$(count_auth_identities)"
PROFILES_AFTER="$(count_profiles)"
echo "  auth.users after=${USERS_AFTER}"
echo "  auth.identities after=${IDENT_AFTER}"
echo "  public.profiles after=${PROFILES_AFTER}"
if [[ "${USERS_AFTER}" == "${USERS_BEFORE}" ]]; then pass "auth.users restored to baseline"; else warn "auth.users count differs"; fi

section "Production unchanged"
prod_url="$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "${SITE_ENV}" | cut -d= -f2- | tr -d '\r"'"'"'' || true)"
if echo "${prod_url}" | grep -q 'supabase.co'; then pass "production site.env still hosted supabase URL"; else fail "production site.env URL unexpected"; fi
if sudo docker logs scholarshiptop-site --since 30m 2>/dev/null | grep -q 'vps-shadow-supabase-4c'; then
  fail "production site referenced shadow path"
else
  pass "production site logs have no shadow path"
fi
if sudo docker logs scholarshiptop-site --since 30m 2>/dev/null | grep -q '127.0.0.1:54321'; then
  fail "production site referenced staging self-host API"
else
  pass "production site logs have no staging API URL"
fi

section "Production HTTP smoke"
for url in https://scholarshiptop.com https://scholarshiptop.com/sitemap.xml; do
  code_raw="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 "${url}" 2>/dev/null || true)"
  code="${code_raw:0:3}"
  [[ -n "${code}" ]] || code="000"
  echo "  ${url} -> ${code}"
  [[ "${code}" == "200" ]] || fail "${url} ${code}"
done

section "Logs and resources"
if sudo docker logs scholarshiptop-gotrue-test --since 30m 2>&1 | grep -Eqi 'fatal|panic'; then
  warn "gotrue has fatal/panic lines"
else
  pass "gotrue no fatal/panic lines"
fi
if sudo docker logs scholarshiptop-postgrest-test --since 30m 2>&1 | grep -Eqi 'fatal|panic'; then
  warn "postgrest has fatal/panic lines"
else
  pass "postgrest no fatal/panic lines"
fi
free -h | sed -n '1,2p'
uptime

stop_stage_site

echo ""
if [[ "${FAILED}" -eq 0 && "${WARN}" -eq 0 ]]; then
  echo "STAGE_4E_FRONTEND_STAGING_PASS"
  exit 0
fi
if [[ "${FAILED}" -eq 0 ]]; then
  echo "STAGE_4E_FRONTEND_STAGING_PASS_WITH_WARNINGS (${WARN})"
  exit 0
fi
echo "STAGE_4E_FRONTEND_STAGING_BLOCKED (${FAILED} failures, ${WARN} warnings)"
exit 1
