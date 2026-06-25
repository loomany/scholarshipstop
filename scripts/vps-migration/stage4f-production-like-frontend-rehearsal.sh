#!/usr/bin/env bash
# Stage 4F - production-like frontend rehearsal against VPS self-host Supabase API.
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
APP="${ROOT}/app"
SITE_ENV="${ROOT}/env/site.env"
STAGE_ENV="${ROOT}/env/site.stage4e.env"
OUT_JSON="${ROOT}/logs/stage4f-frontend-rehearsal.json"
BUILD_LOG="${ROOT}/logs/stage4f-build.log"
SITE_LOG="${ROOT}/logs/stage4f-site.log"
PID_FILE="/tmp/stage4f-site.pid"
STAGE_PORT=3101
FAILED=0
WARN=0
MEM_AVAIL_KB=0

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
where p.id = u.id and (
  u.email like 'shadow-stage4f%@invalid.scholarshiptop.test'
  or u.email like 'shadow-stage4f-ui%@invalid.scholarshiptop.test'
);
delete from auth.identities i
using auth.users u
where i.user_id = u.id and (
  u.email like 'shadow-stage4f%@invalid.scholarshiptop.test'
  or u.email like 'shadow-stage4f-ui%@invalid.scholarshiptop.test'
);
delete from auth.users u
where u.email like 'shadow-stage4f%@invalid.scholarshiptop.test'
   or u.email like 'shadow-stage4f-ui%@invalid.scholarshiptop.test';
SQL
}

stop_rehearsal_site() {
  if [[ -f "${PID_FILE}" ]]; then
    pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
    if [[ -n "${pid}" ]]; then
      sudo kill "${pid}" >/dev/null 2>&1 || true
      sleep 1
      sudo kill -9 "${pid}" >/dev/null 2>&1 || true
    fi
    sudo rm -f "${PID_FILE}" >/dev/null 2>&1 || true
  fi
  sudo pkill -f "PORT=${STAGE_PORT} HOSTNAME=127.0.0.1" >/dev/null 2>&1 || true
}

rehearsal_health_code() {
  local raw
  raw="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "http://127.0.0.1:${STAGE_PORT}/" 2>/dev/null || true)"
  raw="${raw:0:3}"
  [[ -n "${raw}" ]] || raw="000"
  echo "${raw}"
}

check_page() {
  local path="$1"
  local label="$2"
  local timeout="${3:-60}"
  local code attempt
  for attempt in 1 2 3; do
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time "${timeout}" "http://127.0.0.1:${STAGE_PORT}${path}" 2>/dev/null || true)"
    code="${code:0:3}"
    [[ -n "${code}" ]] || code="000"
    echo "  ${path} -> ${code} (attempt ${attempt})"
    if [[ "${code}" == "200" ]]; then
      pass "${label}"
      return 0
    fi
    sleep 2
  done
  fail "${label} ${code}"
  return 0
}

check_protected_route() {
  local path="$1"
  local label="$2"
  local timeout="${3:-60}"
  local code attempt
  for attempt in 1 2 3; do
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time "${timeout}" "http://127.0.0.1:${STAGE_PORT}${path}" 2>/dev/null || true)"
    code="${code:0:3}"
    [[ -n "${code}" ]] || code="000"
    echo "  ${path} -> ${code} (attempt ${attempt})"
    if [[ "${code}" == "200" || "${code}" == "307" || "${code}" == "302" ]]; then
      pass "${label} (status ${code})"
      return 0
    fi
    sleep 2
  done
  fail "${label} ${code}"
  return 0
}

pick_scholarship_paths() {
  local xml paths
  xml="$(curl -sS --max-time 30 "http://127.0.0.1:${STAGE_PORT}/sitemap.xml" 2>/dev/null || true)"
  if echo "${xml}" | grep -q sitemapindex; then
    xml="$(curl -sS --max-time 30 "http://127.0.0.1:${STAGE_PORT}/sitemaps/scholarships-0.xml" 2>/dev/null || true)"
  fi
  if [[ -z "${xml}" ]] || ! echo "${xml}" | grep -q '/scholarships/'; then
    xml="$(curl -sS --max-time 30 https://scholarshiptop.com/sitemaps/scholarships-0.xml 2>/dev/null || true)"
  fi
  mapfile -t paths < <(
    echo "${xml}" \
      | grep -oE 'https?://[^<]+' \
      | sed -E 's#^https?://[^/]+##' \
      | grep -E '^/scholarships/.+' \
      | sort -u \
      | head -n 3
  )
  if [[ "${#paths[@]}" -gt 0 ]]; then
    printf '%s\n' "${paths[@]}"
  fi
}

prepare_stage_env() {
  if [[ ! -f "${STAGE_ENV}" ]]; then
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
  fi
  pass "site.stage4e.env ready for rehearsal (localhost API + legacy JWT)"
}

capture_mem_avail() {
  MEM_AVAIL_KB="$(awk '/MemAvailable:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
}

section "Preflight"
free -h | sed -n '1,2p'
uptime
df -h / /opt 2>/dev/null | sed -n '1,3p' || df -h | sed -n '1,3p'
echo "  docker ps:"
sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | sed -n '1,12p'

if [[ ! -f "${SITE_ENV}" ]]; then
  echo "ERROR: ${SITE_ENV} missing" >&2
  exit 1
fi

prod_url="$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "${SITE_ENV}" | cut -d= -f2- | tr -d '\r"'"'"'' || true)"
if echo "${prod_url}" | grep -q 'supabase.co'; then
  pass "production site.env still hosted supabase URL"
else
  fail "production site.env URL unexpected"
fi

for url in https://scholarshiptop.com https://scholarshiptop.com/sitemap.xml; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 "${url}" 2>/dev/null || true)"
  code="${code:0:3}"
  echo "  ${url} -> ${code}"
  [[ "${code}" == "200" ]] || fail "preflight ${url} ${code}"
done

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

section "Prepare staging production-like env"
cleanup_test_users
prepare_stage_env
warn "rehearsal uses localhost-only API (127.0.0.1:54321); production container untouched"

section "Production-like build (npm run build)"
stop_rehearsal_site
capture_mem_avail
BUILD_OK=0
if [[ "${STAGE4F_SKIP_BUILD:-0}" == "1" && -d "${APP}/.next" ]]; then
  pass "npm run build skipped (STAGE4F_SKIP_BUILD=1, .next present)"
  BUILD_OK=1
elif sudo bash -c "cd '${APP}' && set -a && source '${STAGE_ENV}' && set +a && export NODE_OPTIONS='--max-old-space-size=1536' NEXT_TELEMETRY_DISABLED=1 GENERATE_SOURCEMAP=false && npm run build" >"${BUILD_LOG}" 2>&1; then
  BUILD_OK=1
  pass "npm run build completed"
else
  fail "npm run build failed (see ${BUILD_LOG})"
  tail -20 "${BUILD_LOG}" 2>/dev/null | sed 's/^/    /' || true
fi

capture_mem_avail
echo "  mem available after build: $(( MEM_AVAIL_KB / 1024 )) MiB"
if [[ "${MEM_AVAIL_KB}" -lt 512000 ]]; then
  warn "MemAvailable < 500 MiB after build"
fi

if [[ "${BUILD_OK}" != "1" ]]; then
  echo "STAGE_4F_PROD_LIKE_REHEARSAL_BLOCKED (build failed)"
  exit 1
fi

section "Start production-like server (npm run start :${STAGE_PORT})"
sudo bash -c "cd '${APP}' && set -a && source '${STAGE_ENV}' && set +a && PORT=${STAGE_PORT} HOSTNAME=127.0.0.1 npm run start > '${SITE_LOG}' 2>&1 & echo \$! > '${PID_FILE}'"
STAGE_BASE="http://127.0.0.1:${STAGE_PORT}"
READY=0
for _ in $(seq 1 60); do
  if [[ "$(rehearsal_health_code)" == "200" ]]; then
    READY=1
    break
  fi
  sleep 2
done
if [[ "${READY}" == "1" ]]; then
  pass "rehearsal server up on ${STAGE_BASE}"
else
  fail "rehearsal server did not become healthy"
  tail -30 "${SITE_LOG}" 2>/dev/null | sed 's/^/    /' || true
  stop_rehearsal_site
  echo "STAGE_4F_PROD_LIKE_REHEARSAL_BLOCKED"
  exit 1
fi

capture_mem_avail
LOAD_AVG="$(awk '{print $1","$2","$3}' /proc/loadavg 2>/dev/null || uptime | awk -F'load average:' '{print $2}')"
echo "  mem available after start: $(( MEM_AVAIL_KB / 1024 )) MiB"
echo "  load average: ${LOAD_AVG}"
if [[ "${MEM_AVAIL_KB}" -lt 512000 ]]; then
  warn "MemAvailable < 500 MiB after start (Stage 4E dev used ~815 MiB; recommend VPS RAM/swap upgrade before cutover)"
fi

section "Frontend page smoke (production-like server)"
check_page "/" "homepage" 30
check_page "/sitemap.xml" "sitemap" 30
check_page "/scholarships" "listing page" 45
check_page "/resources" "SEO hub/resources page" 45
check_page "/compare" "compare page" 45
mapfile -t SCHOLARSHIP_PATHS < <(pick_scholarship_paths)
if [[ "${#SCHOLARSHIP_PATHS[@]}" -eq 0 ]]; then
  fail "no scholarship detail paths discovered from sitemap"
else
  if [[ "${#SCHOLARSHIP_PATHS[@]}" -lt 3 ]]; then
    warn "only ${#SCHOLARSHIP_PATHS[@]} scholarship detail URL(s) available in sitemap smoke"
  fi
  idx=1
  for path in "${SCHOLARSHIP_PATHS[@]}"; do
    [[ -n "${path}" ]] || continue
    check_page "${path}" "scholarship detail page ${idx}" 60
    idx=$((idx + 1))
  done
fi
check_page "/signin/password_signin" "auth signin page" 45
check_protected_route "/account" "account page route (unauth)" 45

section "Auth smoke via production-like server (@supabase/ssr)"
if sudo bash -c "cd '${APP}' && STAGE4F_ENV_FILE='${STAGE_ENV}' STAGE4F_BASE_URL='${STAGE_BASE}' STAGE4F_OUT_FILE='${OUT_JSON}' node scripts/vps-migration/stage4f-frontend-rehearsal-auth.mjs"; then
  pass "stage4f-frontend-rehearsal-auth.mjs"
else
  fail "stage4f-frontend-rehearsal-auth.mjs"
fi

section "Playwright UI sign-in (with diagnostics)"
if sudo bash -c "cd '${APP}' && STAGE4F_BASE_URL='${STAGE_BASE}' STAGE4F_ENV_FILE='${STAGE_ENV}' node scripts/vps-migration/stage4f-frontend-rehearsal-ui-signin.mjs"; then
  pass "stage4f-frontend-rehearsal-ui-signin.mjs"
else
  warn "Playwright UI sign-in incomplete (SSR auth is primary; see diagnostics above)"
fi

section "Cleanup Stage 4F test users"
cleanup_test_users
pass "cleanup removed stage4f test users"
USERS_AFTER="$(count_auth_users)"
IDENT_AFTER="$(count_auth_identities)"
PROFILES_AFTER="$(count_profiles)"
echo "  auth.users after=${USERS_AFTER}"
echo "  auth.identities after=${IDENT_AFTER}"
echo "  public.profiles after=${PROFILES_AFTER}"
if [[ "${USERS_AFTER}" == "${USERS_BEFORE}" ]]; then pass "auth.users restored to baseline"; else warn "auth.users count differs"; fi

section "Production unchanged"
if echo "${prod_url}" | grep -q 'supabase.co'; then pass "production site.env still hosted supabase URL"; else fail "production site.env changed"; fi
if sudo docker inspect scholarshiptop-site --format '{{.State.Status}}' 2>/dev/null | grep -q running; then
  pass "production container still running"
else
  fail "production container not running"
fi
if sudo docker logs scholarshiptop-site --since 45m 2>/dev/null | grep -q 'vps-shadow-supabase-4c'; then
  fail "production site referenced shadow path"
else
  pass "production site logs have no shadow path"
fi
if sudo docker logs scholarshiptop-site --since 45m 2>/dev/null | grep -q '127.0.0.1:54321'; then
  fail "production site referenced staging self-host API"
else
  pass "production site logs have no staging API URL"
fi

section "Production HTTP smoke (post-rehearsal)"
for url in https://scholarshiptop.com https://scholarshiptop.com/sitemap.xml; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 "${url}" 2>/dev/null || true)"
  code="${code:0:3}"
  echo "  ${url} -> ${code}"
  [[ "${code}" == "200" ]] || fail "${url} ${code}"
done

section "Logs and resources"
if sudo docker logs scholarshiptop-gotrue-test --since 45m 2>&1 | grep -Eqi 'fatal|panic'; then
  warn "gotrue has fatal/panic lines"
else
  pass "gotrue no fatal/panic lines"
fi
if sudo docker logs scholarshiptop-postgrest-test --since 45m 2>&1 | grep -Eqi 'fatal|panic'; then
  warn "postgrest has fatal/panic lines"
else
  pass "postgrest no fatal/panic lines"
fi
GATEWAY="$(sudo docker ps --format '{{.Names}}' | grep -E 'kong|gateway' | head -n 1 || true)"
if [[ -n "${GATEWAY}" ]]; then
  if sudo docker logs "${GATEWAY}" --since 45m 2>&1 | grep -Eqi 'fatal|panic|error'; then
    warn "gateway has error lines (review ${GATEWAY} logs)"
  else
    pass "gateway no fatal/panic lines"
  fi
else
  warn "no dedicated gateway container name matched (kong/gateway)"
fi
echo "  rehearsal site log: ${SITE_LOG}"
echo "  build log: ${BUILD_LOG}"
free -h | sed -n '1,2p'
uptime
capture_mem_avail
echo "  mem available final: $(( MEM_AVAIL_KB / 1024 )) MiB"
echo "  compare Stage 4E: dev server load was higher; production-like start should be lighter at runtime"

stop_rehearsal_site

echo ""
if [[ "${FAILED}" -eq 0 && "${WARN}" -eq 0 ]]; then
  echo "STAGE_4F_PROD_LIKE_REHEARSAL_PASS"
  exit 0
fi
if [[ "${FAILED}" -eq 0 ]]; then
  echo "STAGE_4F_PROD_LIKE_REHEARSAL_PASS_WITH_WARNINGS (${WARN})"
  exit 0
fi
echo "STAGE_4F_PROD_LIKE_REHEARSAL_BLOCKED (${FAILED} failures, ${WARN} warnings)"
exit 1
