#!/usr/bin/env bash
# Stage 5A - read-only pre-cutover checklist for Supabase -> VPS cutover.
# Does not switch production, edit env files, stop services, or print secrets.
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
APP="${ROOT}/app"
ENV_DIR="${ROOT}/env"
BACKUP_DIR="${STAGE5A_BACKUP_DIR:-${ROOT}/backups}"
DB_BACKUP_DIR="${STAGE5A_DB_BACKUP_DIR:-/opt/scholarshiptop-db-backups}"
COMPOSE_SITE="${ROOT}/docker-compose.yml"
COMPOSE_API="${APP}/ops/vps/docker-compose.supabase-api.example.yml"
PROD_BASE="${STAGE5A_PROD_BASE:-https://scholarshiptop.com}"
SELFHOST_API="${STAGE5A_SELFHOST_API:-http://127.0.0.1:54321}"
SINCE="${STAGE5A_LOG_SINCE:-30m}"
FAIL=0
WARN=0

pass() { echo "PASS  $*"; }
warn() { echo "WARN  $*"; WARN=$((WARN + 1)); }
fail() { echo "FAIL  $*"; FAIL=$((FAIL + 1)); }
section() { echo ""; echo "=== $* ==="; }

http_code() {
  curl -sS -o /dev/null -w '%{http_code}' --max-time "${2:-25}" "$1" 2>/dev/null || true
}

redacted_env_key_exists() {
  local file="$1" key="$2"
  if sudo test -f "${file}" && sudo grep -qE "^${key}=" "${file}"; then
    pass "${key} present in $(basename "${file}")"
  else
    warn "${key} missing in $(basename "${file}")"
  fi
}

section "Git status / latest commits"
if [[ -d "${APP}/.git" ]]; then
  git -C "${APP}" status --short || warn "git status failed"
  echo "Recent commits:"
  git -C "${APP}" --no-pager log --oneline -5 || warn "git log failed"
else
  warn "${APP} is not a git checkout"
fi

section "VPS RAM / disk / swap"
free -h || warn "free failed"
uptime || warn "uptime failed"
df -h / "${ROOT}" 2>/dev/null || df -h /
if swapon --show --noheadings | grep -q .; then
  swapon --show
  pass "swap configured"
else
  warn "swap not configured"
fi

section "Production smoke"
for path in "/" "/sitemap.xml"; do
  code="$(http_code "${PROD_BASE}${path}" 30)"
  echo "${PROD_BASE}${path} -> ${code}"
  [[ "${code}" == "200" ]] && pass "production ${path}" || fail "production ${path} ${code}"
done

section "Production env source"
SITE_ENV="${ENV_DIR}/site.env"
if sudo test -f "${SITE_ENV}"; then
  if sudo grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "${SITE_ENV}" | grep -q 'supabase.co'; then
    pass "production site.env still points to hosted Supabase"
  else
    fail "production site.env is not hosted Supabase"
  fi
else
  fail "missing ${SITE_ENV}"
fi

section "Self-host Supabase API health"
for path in "/health" "/auth/v1/health" "/rest/v1/"; do
  code="$(http_code "${SELFHOST_API}${path}" 15)"
  echo "${SELFHOST_API}${path} -> ${code}"
done
if [[ "$(http_code "${SELFHOST_API}/health" 10)" == "200" ]]; then
  pass "self-host gateway health"
else
  fail "self-host gateway health"
fi

section "Docker services"
if command -v docker >/dev/null 2>&1; then
  sudo docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' | sed -n '1,40p'
  sudo docker inspect scholarshiptop-site --format '{{.State.Status}}' 2>/dev/null | grep -q running \
    && pass "production site container running" || fail "production site container not running"
  sudo docker inspect scholarshiptop-gotrue-test --format '{{.Config.Image}}' 2>/dev/null || warn "gotrue test container missing"
else
  fail "docker missing"
fi

section "Parser / cron / systemd schedules"
echo "systemd timers matching scholarship/parser/job names:"
systemctl list-timers --all --no-pager 2>/dev/null | grep -Ei 'scholarship|parser|seo|mailing|content|translation' || true
echo "systemd services matching scholarship/parser/job names:"
systemctl list-units --type=service --all --no-pager 2>/dev/null | grep -Ei 'scholarship|parser|seo|mailing|content|translation' || true
echo "root crontab matching job names:"
sudo crontab -l 2>/dev/null | grep -Ei 'scholarship|parser|seo|mailing|content|translation' || true
echo "user crontab matching job names:"
crontab -l 2>/dev/null | grep -Ei 'scholarship|parser|seo|mailing|content|translation' || true

section "Backup folders / tmux"
sudo test -d "${BACKUP_DIR}" && pass "backup dir exists: ${BACKUP_DIR}" || fail "backup dir missing: ${BACKUP_DIR}"
sudo test -d "${DB_BACKUP_DIR}" && pass "db backup dir exists: ${DB_BACKUP_DIR}" || fail "db backup dir missing: ${DB_BACKUP_DIR}"
command -v tmux >/dev/null 2>&1 && pass "tmux installed" || warn "tmux missing"
command -v screen >/dev/null 2>&1 && pass "screen installed" || warn "screen missing"

section "Env key presence (values redacted)"
redacted_env_key_exists "${ENV_DIR}/supabase-api.env" "GOTRUE_URI_ALLOW_LIST"
redacted_env_key_exists "${ENV_DIR}/supabase-api.env" "GOTRUE_JWT_SECRET"
redacted_env_key_exists "${ENV_DIR}/site.stage4e.env" "NEXT_PUBLIC_SUPABASE_URL"
redacted_env_key_exists "${ENV_DIR}/site.stage4e.env" "NEXT_PUBLIC_SUPABASE_ANON_KEY"
redacted_env_key_exists "${ENV_DIR}/site.stage4e.env" "SUPABASE_SERVICE_ROLE_KEY"

section "Production logs must not reference shadow API"
if sudo docker logs scholarshiptop-site --since "${SINCE}" 2>/dev/null | grep -qE '127\.0\.0\.1:54321|vps-shadow-supabase'; then
  fail "production logs reference shadow API"
else
  pass "production logs clean for shadow API references"
fi

echo ""
if [[ "${FAIL}" -eq 0 && "${WARN}" -eq 0 ]]; then
  echo "STAGE_5A_PRECUTOVER_CHECK_PASS"
  exit 0
fi
if [[ "${FAIL}" -eq 0 ]]; then
  echo "STAGE_5A_PRECUTOVER_CHECK_PASS_WITH_WARNINGS (${WARN})"
  exit 0
fi
echo "STAGE_5A_PRECUTOVER_CHECK_BLOCKED (${FAIL} failures, ${WARN} warnings)"
exit 1
