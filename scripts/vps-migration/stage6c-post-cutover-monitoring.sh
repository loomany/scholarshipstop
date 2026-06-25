#!/usr/bin/env bash
# Stage 6C — post-cutover monitoring (READ-ONLY).
# Does NOT change production site.env, parser env, docker, systemd, cron, or hosted Supabase.
set -uo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
APP="${ROOT}/app"
ENV_DIR="${ROOT}/env"
PARSER_ENV_DIR="${PARSER_ROOT:-/opt/scholarshiptop-parsers}/env"
PROD_BASE="${PROD_BASE:-https://scholarshiptop.com}"
LEGACY_ANON="${LEGACY_ANON:-/root/.supabase-legacy-anon-jwt}"
LEGACY_SVC="${LEGACY_SVC:-/root/.supabase-legacy-service-jwt}"
SITE_ENV="${ENV_DIR}/site.env"
HOSTED_ENV_BACKUP="${HOSTED_ENV_BACKUP:-${ROOT}/backups/site.env.pre-cutover.20260625T181036Z}"
CUTOVER_UTC="${CUTOVER_UTC:-2026-06-25T17:44:40Z}"
DB="${DB:-scholarshiptop_prod}"
SINCE="${SINCE:-3h}"

FAIL=0
WARN=0
pass() { echo "PASS  $*"; }
warn() { echo "WARN  $*"; WARN=$((WARN + 1)); }
fail() { echo "FAIL  $*"; FAIL=$((FAIL + 1)); }
section() { echo ""; echo "=== $* ==="; }

http_code() { curl -sS -o /dev/null -w '%{http_code}' --max-time "${2:-25}" "$1" 2>/dev/null || echo 000; }

classify_url() {
  local v="$1"
  if echo "$v" | grep -q 'supabase\.co'; then echo HOSTED
  elif echo "$v" | grep -q 'scholarshiptop\.com/supabase'; then echo SELFHOST
  elif [[ -z "$v" ]]; then echo MISSING
  else echo OTHER; fi
}

#############################################
section "1. Site smoke"
#############################################
for path in "/" "/sitemap.xml"; do
  c="$(http_code "${PROD_BASE}${path}" 30)"
  echo "  ${PROD_BASE}${path} -> ${c}"
  [[ "$c" == "200" ]] && pass "site ${path}" || fail "site ${path} ${c}"
done

echo "  5 scholarship detail pages:"
DETAIL_URLS="$(curl -sS --max-time 30 "${PROD_BASE}/sitemaps/scholarships-0.xml" 2>/dev/null \
  | grep -oE 'https://scholarshiptop\.com/scholarships/[^<]+' | head -5 || true)"
DETAIL_OK=0
if [[ -z "${DETAIL_URLS}" ]]; then
  warn "could not extract detail URLs from sitemap"
else
  while IFS= read -r u; do
    [[ -z "$u" ]] && continue
    c="$(http_code "$u" 30)"
    echo "    ${c}  ${u:0:90}..."
    [[ "$c" == "200" ]] && DETAIL_OK=$((DETAIL_OK + 1))
  done <<< "${DETAIL_URLS}"
  [[ "${DETAIL_OK}" -eq 5 ]] && pass "5 scholarship detail pages 200" || fail "only ${DETAIL_OK}/5 detail pages 200"
fi

if [[ -d "${APP}/.next/static" ]]; then
  # Match hosted project URLs (*.supabase.co), not supabase.com docs links in SDK bundles.
  HOSTED_FILES="$(sudo grep -rlE '[a-z0-9-]+\.supabase\.co' "${APP}/.next/static" 2>/dev/null | wc -l | tr -d ' ')"
  SELF_FILES="$(sudo grep -rl 'scholarshiptop\.com/supabase' "${APP}/.next/static" 2>/dev/null | wc -l | tr -d ' ')"
  echo "  bundle hosted-project refs files=${HOSTED_FILES} selfhost refs files=${SELF_FILES}"
  [[ "${HOSTED_FILES}" -eq 0 ]] && pass "client bundle 0 hosted project refs" || fail "client bundle has hosted project refs"
  [[ "${SELF_FILES}" -gt 0 ]] && pass "client bundle has self-host refs" || fail "client bundle missing self-host refs"
else
  warn ".next/static missing (bundle scan skipped)"
fi

if sudo test -f "${SITE_ENV}"; then
  cls="$(classify_url "$(sudo grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "${SITE_ENV}" | cut -d= -f2- | tr -d '"')")"
  echo "  production site.env target=${cls}"
  [[ "$cls" == SELFHOST ]] && pass "site.env on self-host" || fail "site.env not self-host (${cls})"
else
  fail "missing ${SITE_ENV}"
fi

#############################################
section "2. Self-host API"
#############################################
ANON="$(sudo cat "${LEGACY_ANON}" 2>/dev/null | tr -d '\n\r' || true)"
SERVICE="$(sudo cat "${LEGACY_SVC}" 2>/dev/null | tr -d '\n\r' || true)"
if [[ -z "${ANON}" || -z "${SERVICE}" ]]; then
  fail "legacy JWT files missing"
else
  c="$(http_code "${PROD_BASE}/supabase/health" 15)"; echo "  /supabase/health -> ${c}"
  [[ "$c" == "200" ]] && pass "selfhost health" || fail "selfhost health ${c}"
  c="$(http_code "${PROD_BASE}/supabase/auth/v1/health" 15)"; echo "  /supabase/auth/v1/health -> ${c}"
  [[ "$c" == "200" ]] && pass "auth health" || fail "auth health ${c}"

  CR="$(curl -sS -I --max-time 30 -H "apikey: ${ANON}" -H "Authorization: Bearer ${ANON}" \
    -H "Range: 0-0" -H "Prefer: count=exact" \
    "${PROD_BASE}/supabase/rest/v1/scholarships_safe_listing?select=id" 2>/dev/null \
    | tr -d '\r' | grep -i '^content-range:' | awk '{print $2}')"
  COUNT="${CR##*/}"
  echo "  scholarships_safe_listing count -> ${COUNT}"
  [[ "${COUNT}" =~ ^[0-9]+$ ]] && pass "listing count numeric" || fail "listing count not numeric"

  BODY="$(curl -sS --max-time 25 -H "apikey: ${ANON}" -H "Authorization: Bearer ${ANON}" \
    "${PROD_BASE}/supabase/rest/v1/profiles?select=id&limit=5" 2>/dev/null)"
  [[ "${BODY}" == "[]" ]] && pass "anon profiles -> []" || fail "anon profiles not empty"

  BODY="$(curl -sS --max-time 25 -H "apikey: ${SERVICE}" -H "Authorization: Bearer ${SERVICE}" \
    "${PROD_BASE}/supabase/rest/v1/profiles?select=id&limit=1" 2>/dev/null)"
  echo "${BODY}" | grep -q '"id"' && pass "service_role profiles >=1" || fail "service_role profiles empty"

  IDS="$(sudo -u postgres psql -t -A -d "${DB}" \
    -c "select id from public.institutions where slug is not null order by slug limit 2" 2>/dev/null | paste -sd, -)"
  IFS=, read -r IA IB <<< "${IDS}"
  if [[ -n "${IA}" && -n "${IB}" ]]; then
    c="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 -X POST \
      -H "apikey: ${ANON}" -H "Authorization: Bearer ${ANON}" -H "Content-Type: application/json" \
      "${PROD_BASE}/supabase/rest/v1/rpc/get_comparison_data" \
      -d "{\"p_inst_a\":\"${IA}\",\"p_inst_b\":\"${IB}\"}" 2>/dev/null)"
    echo "  RPC get_comparison_data -> ${c}"
    [[ "$c" =~ ^(200|204)$ ]] && pass "RPC get_comparison_data" || fail "RPC ${c}"
  else
    warn "could not resolve institution ids for RPC"
  fi
fi

#############################################
section "3. Auth smoke (production self-host)"
#############################################
c_before() { sudo -u postgres psql -tA -d "${DB}" -c "$1" 2>/dev/null; }
U0="$(c_before 'select count(*) from auth.users')"
I0="$(c_before 'select count(*) from auth.identities')"
P0="$(c_before 'select count(*) from public.profiles')"
echo "  BEFORE users=${U0} identities=${I0} profiles=${P0}"
if sudo bash -c "cd '${APP}' && STAGE5C1_ENV_FILE='${SITE_ENV}' node scripts/vps-migration/stage5c1-auth-smoke.mjs"; then
  pass "auth smoke PASS"
else
  fail "auth smoke FAIL"
fi
U1="$(c_before 'select count(*) from auth.users')"
I1="$(c_before 'select count(*) from auth.identities')"
P1="$(c_before 'select count(*) from public.profiles')"
echo "  AFTER  users=${U1} identities=${I1} profiles=${P1}"
[[ "$U0" == "$U1" && "$I0" == "$I1" && "$P0" == "$P1" ]] && pass "auth counts unchanged after cleanup" || fail "auth counts changed"

#############################################
section "4. Parser status (VPS)"
#############################################
PARSER_SERVICES=(
  scholarshiptop-parser-bigfuture.service
  scholarshiptop-parser-scholarship-america.service
  scholarshiptop-parser-simpler-grants-gov.service
)
PARSER_ENVS=(
  "${PARSER_ENV_DIR}/bigfuture.env"
  "${PARSER_ENV_DIR}/scholarship-america.env"
  "${PARSER_ENV_DIR}/simpler-grants-gov.env"
)
for i in "${!PARSER_SERVICES[@]}"; do
  svc="${PARSER_SERVICES[$i]}"
  envf="${PARSER_ENVS[$i]}"
  state="$(systemctl is-active "${svc}" 2>/dev/null || true)"
  enabled="$(systemctl is-enabled "${svc}" 2>/dev/null || true)"
  echo "  ${svc}: active=${state} enabled=${enabled}"
  [[ "$state" == active ]] && pass "${svc} active" || fail "${svc} not active"
  if sudo test -f "${envf}"; then
    cls="$(classify_url "$(sudo grep -E '^SUPABASE_URL=' "${envf}" | cut -d= -f2- | tr -d '"')")"
    echo "    env target=${cls}"
    [[ "$cls" == SELFHOST ]] && pass "${envf} self-host" || fail "${envf} not self-host"
  else
    fail "missing ${envf}"
  fi
  hosted_refs="$(journalctl -u "${svc}" --since "${SINCE}" --no-pager 2>/dev/null | grep -c 'supabase\.co' || true)"
  err_lines="$(journalctl -u "${svc}" --since "${SINCE}" --no-pager 2>/dev/null | grep -ciE 'error|fatal|unauthorized|econnrefused|getaddrinfo' || true)"
  activity="$(journalctl -u "${svc}" --since "${SINCE}" --no-pager 2>/dev/null | grep -ciE 'upsert|insert|saved|done|listing_seen|processed' || true)"
  echo "    since_${SINCE}: hosted_refs=${hosted_refs} error_lines=${err_lines} activity_lines=${activity}"
  [[ "${hosted_refs}" -eq 0 ]] && pass "${svc} no hosted URLs in recent logs" || fail "${svc} hosted URLs in logs"
  [[ "${err_lines}" -eq 0 ]] && pass "${svc} no recent errors" || warn "${svc} has ${err_lines} error-like log lines"
  [[ "${activity}" -gt 0 ]] && pass "${svc} recent activity detected" || warn "${svc} no obvious activity in logs (may be idle cycle)"
done
TIMERS="$(systemctl list-timers --all --no-pager 2>/dev/null | grep -Ei 'parser|bigfuture|scholarship-america|simpler-grants' || true)"
[[ -z "${TIMERS}" ]] && pass "no parser systemd timers on VPS" || warn "parser timers found on VPS"

#############################################
section "5. Hosted Supabase fallback (read-only)"
#############################################
if sudo test -f "${HOSTED_ENV_BACKUP}"; then
  HURL="$(sudo grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "${HOSTED_ENV_BACKUP}" | cut -d= -f2- | tr -d '"')"
  HANON="$(sudo grep -E '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "${HOSTED_ENV_BACKUP}" | cut -d= -f2- | tr -d '"')"
  cls="$(classify_url "${HURL}")"
  echo "  backup env target=${cls}"
  [[ "$cls" == HOSTED ]] && pass "hosted backup env present" || warn "backup env unexpected target"
  hc="$(http_code "${HURL}/rest/v1/" 15 2>/dev/null || echo 000)"
  echo "  hosted REST root reachable -> ${hc}"
  [[ "$hc" =~ ^(200|401|404)$ ]] && pass "hosted Supabase reachable" || warn "hosted reachability code ${hc}"

  HCR="$(curl -sS -I --max-time 30 -H "apikey: ${HANON}" -H "Authorization: Bearer ${HANON}" \
    -H "Range: 0-0" -H "Prefer: count=exact" \
    "${HURL}/rest/v1/scholarships_safe_listing?select=id" 2>/dev/null \
    | tr -d '\r' | grep -i '^content-range:' | awk '{print $2}')"
  HCOUNT="${HCR##*/}"
  echo "  hosted scholarships count -> ${HCOUNT} (cutover dump was 21171)"
  VPS_COUNT="$(sudo -u postgres psql -tA -d "${DB}" -c 'select count(*) from public.scholarships' 2>/dev/null)"
  echo "  VPS prod scholarships count -> ${VPS_COUNT}"
  if [[ "${HCOUNT}" =~ ^[0-9]+$ && "${VPS_COUNT}" =~ ^[0-9]+$ ]]; then
    if [[ "${VPS_COUNT}" -gt "${HCOUNT}" ]]; then
      pass "VPS count > hosted (${VPS_COUNT} > ${HCOUNT}) — parsers likely writing to VPS"
      pass "hosted count frozen at/below cutover snapshot"
    elif [[ "${HCOUNT}" -eq 21171 ]]; then
      pass "hosted count matches cutover dump (no growth detected)"
    else
      warn "hosted count ${HCOUNT} vs cutover 21171 — review manually"
    fi
  else
    warn "could not compare hosted vs VPS counts"
  fi
else
  warn "hosted env backup missing at ${HOSTED_ENV_BACKUP}"
fi

#############################################
section "6. Resources / logs / OOM"
#############################################
free -h || true
echo ""
swapon --show || true
echo ""
df -h / "${ROOT}" /opt/scholarshiptop-db-backups 2>/dev/null || df -h /
echo ""
uptime || true
echo ""
sudo docker ps --format 'table {{.Names}}\t{{.Status}}' 2>/dev/null | sed -n '1,20p'
echo ""
DB_SIZE="$(sudo -u postgres psql -tA -d "${DB}" -c "select pg_size_pretty(pg_database_size('${DB}'))" 2>/dev/null || echo n/a)"
echo "  DB size ${DB} -> ${DB_SIZE}"
OOM="$(dmesg -T 2>/dev/null | grep -ci 'out of memory\|oom-kill\|killed process' || true)"
echo "  OOM/kill mentions in dmesg -> ${OOM}"
[[ "${OOM}" -eq 0 ]] && pass "no OOM in dmesg" || warn "OOM events in dmesg (${OOM})"

echo "  nginx errors (last 40 lines, since ${SINCE}):"
NGX_ERR="$(sudo docker logs scholarshiptop-nginx --since "${SINCE}" 2>&1 | grep -ciE 'error|crit|alert|emerg' || true)"
echo "    error-like lines=${NGX_ERR}"
[[ "${NGX_ERR}" -eq 0 ]] && pass "nginx clean" || warn "nginx has ${NGX_ERR} error-like lines"

echo "  gotrue errors (since ${SINCE}):"
GT_ERR="$(sudo docker logs scholarshiptop-gotrue-test --since "${SINCE}" 2>&1 | grep -ciE 'error|fatal|panic' || true)"
echo "    error-like lines=${GT_ERR}"
[[ "${GT_ERR}" -eq 0 ]] && pass "gotrue clean" || warn "gotrue has ${GT_ERR} error-like lines"

echo "  postgrest errors (since ${SINCE}):"
PR_ERR="$(sudo docker logs scholarshiptop-postgrest-test --since "${SINCE}" 2>&1 | grep -ciE 'error|fatal' || true)"
echo "    error-like lines=${PR_ERR}"
[[ "${PR_ERR}" -eq 0 ]] && pass "postgrest clean" || warn "postgrest has ${PR_ERR} error-like lines"

#############################################
section "VERDICT"
#############################################
echo "CHECK_FAIL=${FAIL} CHECK_WARN=${WARN}"
if [[ "${FAIL}" -eq 0 && "${WARN}" -eq 0 ]]; then
  echo "POST_CUTOVER_STABLE"
  exit 0
fi
if [[ "${FAIL}" -eq 0 ]]; then
  echo "PASS_WITH_WARNINGS"
  exit 0
fi
echo "ROLLBACK_RECOMMENDED"
exit 1
