#!/usr/bin/env bash
# Stage 6A - final live cutover preflight and approval gate (READ-ONLY).
#
# Hard guarantees of this script:
#   * Does NOT change production site.env.
#   * Does NOT rebuild/restart/switch the production site.
#   * Does NOT switch, stop, or restart parsers.
#   * Does NOT touch hosted Supabase.
#   * Does NOT run a final dump/restore.
#   * Does NOT print secrets/tokens/passwords/URIs (legacy JWTs are read into
#     shell vars and used only as curl headers; never echoed).
#   * Does NOT execute the cutover. It only PRINTS the cutover/rollback plan.
#
# Run on the VPS:
#   bash /opt/scholarshiptop/app/scripts/vps-migration/stage6a-final-preflight.sh
#
# Exit code: 0 = PASS or PASS_WITH_WARNINGS, 1 = BLOCKED.
set -uo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
APP="${ROOT}/app"
ENV_DIR="${ROOT}/env"
PARSER_ROOT="${PARSER_ROOT:-/opt/scholarshiptop-parsers}"
PARSER_ENV_DIR="${PARSER_ROOT}/env"
BACKUP_DIR="${ROOT}/backups"
DB_BACKUP_DIR="${DB_BACKUP_DIR:-/opt/scholarshiptop-db-backups}"
PROD_BASE="${PROD_BASE:-https://scholarshiptop.com}"
ORIGIN="${ORIGIN:-https://scholarshiptop.com}"
FOREIGN_ORIGIN="${FOREIGN_ORIGIN:-https://evil-foreign-origin.example}"
LEGACY_ANON="${LEGACY_ANON:-/root/.supabase-legacy-anon-jwt}"
LEGACY_SVC="${LEGACY_SVC:-/root/.supabase-legacy-service-jwt}"
CUTOVER_ENV="${CUTOVER_ENV:-${ENV_DIR}/site.cutover-preview.env}"
EXPECTED_COUNT="${EXPECTED_COUNT:-21110}"
COUNT_TOLERANCE="${COUNT_TOLERANCE:-2000}"
SINCE="${SINCE:-60m}"
RUN_AUTH_SMOKE="${RUN_AUTH_SMOKE:-1}"

# Exact active parser services + env files (frozen inventory for cutover).
PARSER_SERVICES=(
  "scholarshiptop-parser-bigfuture.service"
  "scholarshiptop-parser-scholarship-america.service"
  "scholarshiptop-parser-simpler-grants-gov.service"
)
PARSER_ENV_FILES=(
  "${PARSER_ENV_DIR}/bigfuture.env"
  "${PARSER_ENV_DIR}/scholarship-america.env"
  "${PARSER_ENV_DIR}/simpler-grants-gov.env"
)

FAIL=0
WARN=0
pass() { echo "PASS  $*"; }
warn() { echo "WARN  $*"; WARN=$((WARN + 1)); }
fail() { echo "FAIL  $*"; FAIL=$((FAIL + 1)); }
section() { echo ""; echo "=== $* ==="; }
show() { printf '  %s\n' "$*"; }

http_code() { curl -sS -o /dev/null -w '%{http_code}' --max-time "${2:-25}" "$1" 2>/dev/null || echo 000; }

#############################################
section "1. Git / repo state"
#############################################
if [[ -d "${APP}/.git" ]]; then
  echo "App dir IS a git checkout; cutover must use host-build-site.sh snapshot, NOT git pull."
  git -C "${APP}" --no-pager log --oneline -8 || warn "git log failed"
  STAGED="$(git -C "${APP}" diff --cached --name-only 2>/dev/null | grep -Ei '\.env$|secret|\.dump$|credential|\.pem$|\.key$' || true)"
  if [[ -n "${STAGED}" ]]; then
    fail "secret-like files staged: ${STAGED}"
  else
    pass "no secret/env/dump files staged"
  fi
else
  warn "${APP} is not a git checkout (snapshot deploy assumed)"
fi
echo "Reports 12-27 present:"
MISSING_REPORTS=0
for n in 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27; do
  if ls "${APP}/reports/vps-migration/${n}"-*.md >/dev/null 2>&1; then
    echo "  report ${n}: present"
  else
    echo "  report ${n}: MISSING"
    MISSING_REPORTS=$((MISSING_REPORTS + 1))
  fi
done
[[ "${MISSING_REPORTS}" -eq 0 ]] && pass "reports 12-27 all present" || fail "${MISSING_REPORTS} reports missing"

#############################################
section "2. Production smoke (unchanged)"
#############################################
for path in "/" "/sitemap.xml"; do
  code="$(http_code "${PROD_BASE}${path}" 30)"
  echo "  ${PROD_BASE}${path} -> ${code}"
  [[ "${code}" == "200" ]] && pass "production ${path}" || fail "production ${path} ${code}"
done

echo "  3 scholarship detail pages:"
DETAIL_URLS="$(curl -sS --max-time 30 "${PROD_BASE}/sitemaps/scholarships-0.xml" 2>/dev/null \
  | grep -oE 'https://scholarshiptop\.com/scholarships/[^<]+' | head -3 || true)"
if [[ -z "${DETAIL_URLS}" ]]; then
  warn "could not extract scholarship detail URLs from sitemap"
else
  while IFS= read -r u; do
    [[ -z "${u}" ]] && continue
    code="$(http_code "${u}" 30)"
    echo "    ${code}  ${u:0:80}..."
    [[ "${code}" == "200" ]] && pass "scholarship detail 200" || fail "scholarship detail ${code}"
  done <<< "${DETAIL_URLS}"
fi

SITE_ENV="${ENV_DIR}/site.env"
if sudo test -f "${SITE_ENV}"; then
  if sudo grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "${SITE_ENV}" | grep -q 'supabase\.co'; then
    pass "production site.env STILL hosted Supabase (*.supabase.co)"
  else
    fail "production site.env is NOT hosted Supabase — unexpected"
  fi
else
  fail "missing ${SITE_ENV}"
fi

echo "  Production site logs must not call /supabase:"
if sudo docker logs scholarshiptop-site --since "${SINCE}" 2>/dev/null \
    | grep -qE 'scholarshiptop\.com/supabase|127\.0\.0\.1:54321|vps-shadow-supabase'; then
  fail "production site logs reference /supabase self-host API"
else
  pass "production site logs clean of /supabase calls"
fi

#############################################
section "3. Self-host API smoke (/supabase, legacy JWT)"
#############################################
ANON="$(sudo cat "${LEGACY_ANON}" 2>/dev/null | tr -d '\n\r' || true)"
SERVICE="$(sudo cat "${LEGACY_SVC}" 2>/dev/null | tr -d '\n\r' || true)"
if [[ -z "${ANON}" || -z "${SERVICE}" ]]; then
  fail "legacy JWT files missing (${LEGACY_ANON} / ${LEGACY_SVC})"
else
  pass "legacy JWT files present (values not printed)"

  c="$(http_code "${PROD_BASE}/supabase/health" 15)"; echo "  /supabase/health -> ${c}"
  [[ "${c}" == "200" ]] && pass "selfhost /health" || fail "selfhost /health ${c}"
  c="$(http_code "${PROD_BASE}/supabase/auth/v1/health" 15)"; echo "  /supabase/auth/v1/health -> ${c}"
  [[ "${c}" == "200" ]] && pass "selfhost /auth/v1/health" || fail "selfhost /auth/v1/health ${c}"

  CR="$(curl -sS -I --max-time 30 \
    -H "apikey: ${ANON}" -H "Authorization: Bearer ${ANON}" \
    -H "Range: 0-0" -H "Prefer: count=exact" \
    "${PROD_BASE}/supabase/rest/v1/scholarships_safe_listing?select=id" 2>/dev/null \
    | tr -d '\r' | grep -i '^content-range:' | awk '{print $2}')"
  COUNT="${CR##*/}"
  echo "  scholarships_safe_listing count -> ${COUNT} (expected ~${EXPECTED_COUNT})"
  if [[ "${COUNT}" =~ ^[0-9]+$ ]]; then
    DIFF=$(( COUNT > EXPECTED_COUNT ? COUNT - EXPECTED_COUNT : EXPECTED_COUNT - COUNT ))
    [[ "${DIFF}" -le "${COUNT_TOLERANCE}" ]] && pass "count within tolerance" || warn "count off by ${DIFF}"
  else
    fail "count not numeric"
  fi

  BODY="$(curl -sS --max-time 25 -H "apikey: ${ANON}" -H "Authorization: Bearer ${ANON}" \
    "${PROD_BASE}/supabase/rest/v1/profiles?select=id&limit=5" 2>/dev/null)"
  [[ "${BODY}" == "[]" ]] && pass "anon profiles -> [] (RLS enforced)" || fail "anon profiles not empty"

  BODY="$(curl -sS --max-time 25 -H "apikey: ${SERVICE}" -H "Authorization: Bearer ${SERVICE}" \
    "${PROD_BASE}/supabase/rest/v1/profiles?select=id&limit=1" 2>/dev/null)"
  echo "${BODY}" | grep -q '"id"' && pass "service_role profiles -> >=1 row" || fail "service_role profiles empty"

  IDS="$(sudo -u postgres psql -t -A -d scholarshiptop_prod \
    -c "select id from public.institutions where slug is not null order by slug limit 2" 2>/dev/null | paste -sd, -)"
  IFS=, read -r IA IB <<< "${IDS}"
  if [[ -n "${IA}" && -n "${IB}" ]]; then
    c="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 -X POST \
      -H "apikey: ${ANON}" -H "Authorization: Bearer ${ANON}" -H "Content-Type: application/json" \
      "${PROD_BASE}/supabase/rest/v1/rpc/get_comparison_data" \
      -d "{\"p_inst_a\":\"${IA}\",\"p_inst_b\":\"${IB}\"}" 2>/dev/null)"
    echo "  RPC get_comparison_data -> ${c}"
    [[ "${c}" =~ ^(200|204)$ ]] && pass "RPC get_comparison_data" || fail "RPC get_comparison_data ${c}"
  else
    warn "could not resolve two institution ids for RPC probe"
  fi

  HDR="$(curl -sS -i -X OPTIONS --max-time 20 \
    -H "Origin: ${ORIGIN}" -H "Access-Control-Request-Method: POST" \
    "${PROD_BASE}/supabase/auth/v1/token" 2>/dev/null | tr -d '\r')"
  if echo "${HDR}" | grep -i '^access-control-allow-origin:' | grep -q "${ORIGIN}"; then
    pass "CORS echoes production origin"
  else
    fail "CORS did not echo production origin"
  fi

  FHDR="$(curl -sS -i -X OPTIONS --max-time 20 \
    -H "Origin: ${FOREIGN_ORIGIN}" -H "Access-Control-Request-Method: POST" \
    "${PROD_BASE}/supabase/auth/v1/token" 2>/dev/null | tr -d '\r')"
  if echo "${FHDR}" | grep -i '^access-control-allow-origin:' | grep -q "${FOREIGN_ORIGIN}"; then
    fail "CORS echoed FOREIGN origin"
  else
    pass "CORS does NOT echo foreign origin"
  fi

  c="$(http_code "${PROD_BASE}/supabase/storage/v1/object/list" 15)"
  echo "  /supabase/storage/v1/* -> ${c} (hybrid: hosted storage retained)"
  [[ "${c}" == "503" ]] && pass "storage hybrid 503 as expected" || warn "storage code ${c} (expected 503 hybrid)"
fi

#############################################
section "4. Auth smoke (safe, cutover-preview env, test user cleaned up)"
#############################################
if [[ "${RUN_AUTH_SMOKE}" != "1" ]]; then
  warn "auth smoke skipped (RUN_AUTH_SMOKE!=1)"
elif ! sudo test -f "${CUTOVER_ENV}"; then
  fail "missing cutover-preview env ${CUTOVER_ENV}"
elif sudo grep -qE '^NEXT_PUBLIC_SUPABASE_URL=' "${CUTOVER_ENV}" && sudo grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "${CUTOVER_ENV}" | grep -q 'supabase\.co'; then
  fail "cutover-preview env points to hosted Supabase; refusing auth smoke"
else
  echo "  Using cutover-preview env (NOT production site.env)."
  echo "  Counts BEFORE:"
  sudo -u postgres psql -t -A -d scholarshiptop_prod \
    -c "select 'auth.users='||count(*) from auth.users" 2>/dev/null || warn "users count failed"
  sudo -u postgres psql -t -A -d scholarshiptop_prod \
    -c "select 'auth.identities='||count(*) from auth.identities" 2>/dev/null || warn "identities count failed"
  sudo -u postgres psql -t -A -d scholarshiptop_prod \
    -c "select 'public.profiles='||count(*) from public.profiles" 2>/dev/null || warn "profiles count failed"

  if sudo bash -c "cd '${APP}' && STAGE5C1_ENV_FILE='${CUTOVER_ENV}' node scripts/vps-migration/stage5c1-auth-smoke.mjs"; then
    pass "auth smoke (signUp/signIn/getUser/refreshSession/logout/cleanup)"
  else
    fail "auth smoke failed"
  fi

  echo "  Counts AFTER (must equal BEFORE):"
  sudo -u postgres psql -t -A -d scholarshiptop_prod \
    -c "select 'auth.users='||count(*) from auth.users" 2>/dev/null || true
  sudo -u postgres psql -t -A -d scholarshiptop_prod \
    -c "select 'auth.identities='||count(*) from auth.identities" 2>/dev/null || true
  sudo -u postgres psql -t -A -d scholarshiptop_prod \
    -c "select 'public.profiles='||count(*) from public.profiles" 2>/dev/null || true
fi

#############################################
section "5. Parser freeze inventory (no changes made)"
#############################################
for i in "${!PARSER_SERVICES[@]}"; do
  svc="${PARSER_SERVICES[$i]}"
  envf="${PARSER_ENV_FILES[$i]}"
  state="$(systemctl is-active "${svc}" 2>/dev/null || true)"
  enabled="$(systemctl is-enabled "${svc}" 2>/dev/null || true)"
  echo "  ${svc} : active=${state} enabled=${enabled}"
  if systemctl list-unit-files --no-pager 2>/dev/null | grep -q "^${svc}"; then
    pass "service present: ${svc}"
  else
    fail "service NOT found: ${svc}"
  fi
  if sudo test -f "${envf}"; then
    pass "parser env present: ${envf}"
  else
    fail "parser env missing: ${envf}"
  fi
done

echo "  Parser-related cron timers (expect none):"
TIMERS="$(systemctl list-timers --all --no-pager 2>/dev/null | grep -Ei 'parser|bigfuture|scholarship-america|simpler-grants' || true)"
if [[ -z "${TIMERS}" ]]; then
  pass "no parser systemd timers"
else
  echo "${TIMERS}"
  warn "parser-related timers found (review before freeze)"
fi
CRON="$(sudo crontab -l 2>/dev/null | grep -Ei 'parser|bigfuture|scholarship-america|simpler-grants' || true)"
[[ -z "${CRON}" ]] && pass "no parser root cron entries" || { echo "${CRON}"; warn "parser cron entries found"; }

#############################################
section "6. VPS resources"
#############################################
free -h || warn "free failed"
echo ""
swapon --show || warn "swapon failed"
echo ""
df -h / "${ROOT}" "${DB_BACKUP_DIR}" 2>/dev/null || df -h /
echo ""
uptime || true
echo ""
sudo docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' 2>/dev/null | sed -n '1,40p'

SWAP_KB="$(awk '/SwapTotal/{print $2}' /proc/meminfo 2>/dev/null || echo 0)"
SWAP_GIB=$(( SWAP_KB / 1024 / 1024 ))
echo "  swap total ~= ${SWAP_GIB} GiB"
[[ "${SWAP_GIB}" -ge 4 ]] && pass "4 GiB+ swap present" || warn "swap < 4 GiB (recommended 4 GiB for build)"

DISK_AVAIL_GIB="$(df -BG --output=avail "${DB_BACKUP_DIR}" 2>/dev/null | tail -1 | tr -dc '0-9' || echo 0)"
[[ -z "${DISK_AVAIL_GIB}" ]] && DISK_AVAIL_GIB=0
echo "  disk avail on ${DB_BACKUP_DIR} ~= ${DISK_AVAIL_GIB} GiB"
[[ "${DISK_AVAIL_GIB}" -ge 20 ]] && pass "disk >= 20 GiB free for dump+restore" || warn "disk < 20 GiB free; verify dump+restore headroom"

sudo test -d "${BACKUP_DIR}" && pass "backup dir exists: ${BACKUP_DIR}" || warn "backup dir missing: ${BACKUP_DIR}"
sudo test -d "${DB_BACKUP_DIR}" && pass "db backup dir exists: ${DB_BACKUP_DIR}" || warn "db backup dir missing: ${DB_BACKUP_DIR}"
command -v tmux >/dev/null 2>&1 && pass "tmux installed" || warn "tmux missing"

#############################################
section "7. FINAL CUTOVER COMMAND PLAN (PRINT ONLY - DO NOT RUN)"
#############################################
cat <<'PLAN'
  # Placeholders: <TS>=date -u +%Y%m%dT%H%M%SZ ; <DUMP>=supabase-prod-<TS>.dump
  #
  # 0. Long-running shell
  tmux new -s supabase-cutover
  #
  # 1. Freeze parsers (writers) - record state first
  systemctl list-units --type=service --all --no-pager > ${ROOT}/backups/systemd-services-pre-cutover.<TS>.txt
  sudo systemctl stop scholarshiptop-parser-bigfuture.service
  sudo systemctl stop scholarshiptop-parser-scholarship-america.service
  sudo systemctl stop scholarshiptop-parser-simpler-grants-gov.service
  #
  # 2. Final fresh dump in tmux (hosted URI from root-only file; never printed)
  SUPABASE_DB_URL_FILE=/root/.supabase-db-url \
    SUPABASE_DUMP_DIR=${DB_BACKUP_DIR} \
    bash ${APP}/scripts/vps-migration/export-supabase-prod-dump.sh
  #
  # 3. sha256 integrity
  sha256sum -c ${DB_BACKUP_DIR}/<DUMP>.sha256
  #
  # 4. Restore into clean-test DB (validation target)
  sudo bash ${APP}/ops/vps/scripts/restore-postgres-clean-test.sh ${DB_BACKUP_DIR}/<DUMP>
  #
  # 5. Restore (superuser) into VPS prod DB
  sudo bash ${APP}/ops/vps/scripts/restore-postgres-superuser.sh ${DB_BACKUP_DIR}/<DUMP>
  #
  # 6. Extended validation (counts/sequences/RLS/RPC/auth/extensions)
  sudo bash ${APP}/ops/vps/scripts/validate-vps-db-restore-extended.sh
  #
  # 7. Backup current production site.env
  sudo cp ${ENV_DIR}/site.env ${ROOT}/backups/site.env.pre-cutover.<TS>
  sudo chmod 600 ${ROOT}/backups/site.env.pre-cutover.<TS>
  #
  # 8. Install prepared cutover-preview env as production site.env (atomic)
  #    (site.cutover-preview.env already uses /supabase URL + legacy JWT keys)
  sudo install -m 600 ${ENV_DIR}/site.cutover-preview.env ${ENV_DIR}/site.env
  #
  # 9. Rebuild + restart site ONLY via snapshot host build (NOT git pull)
  sudo bash ${APP}/scripts/vps-migration/host-build-site.sh
  #
  # 10. Site smoke
  SMOKE_BASE_URL=http://127.0.0.1 sudo bash ${APP}/ops/vps/scripts/smoke-site.sh
  #
  # 11. Switch parser env one-by-one (backup each first), one parser test before the rest
  sudo cp <PARSER_ENV> ${ROOT}/backups/parser-env.<NAME>.pre-cutover.<TS>
  sudo install -m 600 <PREPARED_PARSER_VPS_ENV> <PARSER_ENV>
  #
  # 12. Restart parser services (one first, validate, then remaining)
  sudo systemctl start scholarshiptop-parser-bigfuture.service
  #   validate one write/read path against VPS, then:
  sudo systemctl start scholarshiptop-parser-scholarship-america.service
  sudo systemctl start scholarshiptop-parser-simpler-grants-gov.service
PLAN

#############################################
section "8. ROLLBACK PLAN (PRINT ONLY - DO NOT RUN)"
#############################################
cat <<'RB'
  # Trigger: homepage/auth fails >10 min, refreshSession/profile fails, parser writes wrong target.
  #
  # 1. Restore hosted-Supabase production site.env
  sudo cp ${ROOT}/backups/site.env.pre-cutover.<TS> ${ENV_DIR}/site.env
  sudo chmod 600 ${ENV_DIR}/site.env
  #
  # 2. Rebuild/restart site on hosted Supabase (snapshot host build)
  sudo bash ${APP}/scripts/vps-migration/host-build-site.sh
  SMOKE_BASE_URL=http://127.0.0.1 sudo bash ${APP}/ops/vps/scripts/smoke-site.sh
  #
  # 3. Restore parser env backups
  sudo cp ${ROOT}/backups/parser-env.<NAME>.pre-cutover.<TS> <PARSER_ENV>
  #
  # 4. Restart parsers (hosted Supabase target)
  sudo systemctl restart scholarshiptop-parser-bigfuture.service
  sudo systemctl restart scholarshiptop-parser-scholarship-america.service
  sudo systemctl restart scholarshiptop-parser-simpler-grants-gov.service
  #
  # 5. Keep hosted Supabase ACTIVE for >= 7 days. Keep VPS dump as forensic snapshot.
  # Rollback time estimate: 10-20 minutes (backups present, build cache warm).
RB

#############################################
section "VERDICT"
#############################################
echo "Production unchanged: YES (read-only preflight)"
echo "Hosted Supabase unchanged: YES"
echo "Parser state unchanged: YES"
echo ""
if [[ "${FAIL}" -eq 0 && "${WARN}" -eq 0 ]]; then
  echo "READY_FOR_OWNER_GO_REAL_CUTOVER"
  exit 0
fi
if [[ "${FAIL}" -eq 0 ]]; then
  echo "READY_FOR_OWNER_GO_REAL_CUTOVER_PASS_WITH_WARNINGS (${WARN})"
  exit 0
fi
echo "BLOCKED (${FAIL} failures, ${WARN} warnings)"
exit 1
