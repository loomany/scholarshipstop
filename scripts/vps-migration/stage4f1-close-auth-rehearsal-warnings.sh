#!/usr/bin/env bash
# Stage 4F.1 — close frontend rehearsal blockers (CORS + refreshSession) before cutover runbook.
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
APP="${ROOT}/app"
SITE_ENV="${ROOT}/env/site.env"
STAGE_ENV="${ROOT}/env/site.stage4e.env"
OUT_JSON="${ROOT}/logs/stage4f1-rehearsal.json"
BUILD_LOG="${ROOT}/logs/stage4f1-build.log"
SITE_LOG="${ROOT}/logs/stage4f1-site.log"
PID_FILE="/tmp/stage4f1-site.pid"
STAGE_PORT=3101
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
delete from public.profiles p using auth.users u
where p.id = u.id and (u.email like 'shadow-stage4f1%@invalid.scholarshiptop.test' or u.email like 'shadow-stage4f1-ui%@invalid.scholarshiptop.test');
delete from auth.identities i using auth.users u
where i.user_id = u.id and (u.email like 'shadow-stage4f1%@invalid.scholarshiptop.test' or u.email like 'shadow-stage4f1-ui%@invalid.scholarshiptop.test');
delete from auth.users u
where u.email like 'shadow-stage4f1%@invalid.scholarshiptop.test' or u.email like 'shadow-stage4f1-ui%@invalid.scholarshiptop.test';
SQL
}

stop_rehearsal_site() {
  if [[ -f "${PID_FILE}" ]]; then
    pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
    [[ -n "${pid}" ]] && sudo kill "${pid}" 2>/dev/null || true
    sudo rm -f "${PID_FILE}" 2>/dev/null || true
  fi
  sudo pkill -f "PORT=${STAGE_PORT} HOSTNAME=127.0.0.1" 2>/dev/null || true
}

check_page() {
  local path="$1" label="$2" timeout="${3:-45}"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time "${timeout}" "http://127.0.0.1:${STAGE_PORT}${path}" 2>/dev/null || true)"
  code="${code:0:3}"
  echo "  ${path} -> ${code}"
  [[ "${code}" == "200" ]] && pass "${label}" || fail "${label} ${code}"
}

section "Preflight"
free -h | sed -n '1,2p'
uptime
prod_url="$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "${SITE_ENV}" | cut -d= -f2- | tr -d '\r"'"'"'' || true)"
echo "${prod_url}" | grep -q 'supabase.co' && pass "production site.env hosted supabase" || fail "production site.env unexpected"

USERS_BEFORE="$(count_auth_users)"
IDENT_BEFORE="$(count_auth_identities)"
PROFILES_BEFORE="$(count_profiles)"
echo "  auth.users before=${USERS_BEFORE}"

section "Patch shadow stack (CORS + GoTrue session compat)"
if [[ "${STAGE4F1_SKIP_PATCH:-0}" == "1" ]]; then
  pass "patch skipped (STAGE4F1_SKIP_PATCH=1)"
else
  if sudo bash "${APP}/ops/vps/scripts/patch-shadow-rehearsal-auth-compat.sh"; then
    pass "patch-shadow-rehearsal-auth-compat.sh"
  else
    fail "patch-shadow-rehearsal-auth-compat.sh"
  fi
fi

section "Production-like rehearsal server"
cleanup_test_users
stop_rehearsal_site
BUILD_OK=0
if [[ "${STAGE4F1_SKIP_BUILD:-0}" == "1" && -d "${APP}/.next" ]]; then
  pass "build skipped (.next present)"
  BUILD_OK=1
elif sudo bash -c "cd '${APP}' && if [[ -f .env.production ]]; then mv .env.production .env.production.bak-stage4f1; fi && set -a && source '${STAGE_ENV}' && set +a && export NODE_OPTIONS='--max-old-space-size=1536' NEXT_TELEMETRY_DISABLED=1 && npm run build && if [[ -f .env.production.bak-stage4f1 ]]; then mv .env.production.bak-stage4f1 .env.production; fi" >"${BUILD_LOG}" 2>&1; then
  pass "npm run build"
  BUILD_OK=1
else
  fail "npm run build"
fi
[[ "${BUILD_OK}" == "1" ]] || { echo "STAGE_4F1_BLOCKED"; exit 1; }

sudo bash -c "cd '${APP}' && set -a && source '${STAGE_ENV}' && set +a && PORT=${STAGE_PORT} HOSTNAME=127.0.0.1 npm run start > '${SITE_LOG}' 2>&1 & echo \$! > '${PID_FILE}'"
STAGE_BASE="http://127.0.0.1:${STAGE_PORT}"
for _ in $(seq 1 45); do
  curl -sf "${STAGE_BASE}/" >/dev/null 2>&1 && break
  sleep 2
done
pass "rehearsal server ${STAGE_BASE}"

section "Minimal page smoke"
check_page "/" "homepage" 30
check_page "/sitemap.xml" "sitemap" 30
check_page "/scholarships" "listing" 45
check_page "/signin/password_signin" "signin" 45

section "Auth SSR smoke"
if sudo bash -c "cd '${APP}' && STAGE4F_ENV_FILE='${STAGE_ENV}' STAGE4F_BASE_URL='${STAGE_BASE}' STAGE4F_OUT_FILE='${OUT_JSON}' node scripts/vps-migration/stage4f1-rehearsal-auth.mjs"; then
  pass "stage4f1-rehearsal-auth.mjs"
else
  fail "stage4f1-rehearsal-auth.mjs"
fi

section "Playwright UI sign-in"
if sudo bash -c "cd '${APP}' && STAGE4F_BASE_URL='${STAGE_BASE}' STAGE4F_ENV_FILE='${STAGE_ENV}' node scripts/vps-migration/stage4f1-rehearsal-ui-signin.mjs"; then
  pass "stage4f1-rehearsal-ui-signin.mjs"
else
  fail "stage4f1-rehearsal-ui-signin.mjs"
fi

section "Cleanup"
cleanup_test_users
USERS_AFTER="$(count_auth_users)"
echo "  auth.users after=${USERS_AFTER}"
[[ "${USERS_AFTER}" == "${USERS_BEFORE}" ]] && pass "counts restored" || warn "counts differ"

section "Production unchanged"
sudo docker inspect scholarshiptop-site --format '{{.State.Status}}' | grep -q running && pass "production container running" || fail "production container down"
sudo docker logs scholarshiptop-site --since 30m 2>/dev/null | grep -q '127.0.0.1:54321' && fail "prod logs reference shadow API" || pass "prod logs clean"
for url in https://scholarshiptop.com https://scholarshiptop.com/sitemap.xml; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 "${url}" 2>/dev/null || true)"
  echo "  ${url} -> ${code:0:3}"
  [[ "${code:0:3}" == "200" ]] || fail "${url}"
done

free -h | sed -n '1,2p'
stop_rehearsal_site

echo ""
if [[ "${FAILED}" -eq 0 && "${WARN}" -eq 0 ]]; then
  echo "STAGE_4F1_READY_FOR_CUTOVER_RUNBOOK"
  exit 0
fi
if [[ "${FAILED}" -eq 0 ]]; then
  echo "STAGE_4F1_PASS_WITH_WARNINGS (${WARN})"
  exit 0
fi
echo "STAGE_4F1_BLOCKED (${FAILED} failures, ${WARN} warnings)"
exit 1
