#!/usr/bin/env bash
# Stage 5A - dry rehearsal plan for final Supabase -> VPS cutover.
# Safe by default: prints and validates commands, does not execute cutover.
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
APP="${ROOT}/app"
ENV_DIR="${ROOT}/env"
BACKUP_DIR="${STAGE5A_BACKUP_DIR:-${ROOT}/backups}"
DB_BACKUP_DIR="${STAGE5A_DB_BACKUP_DIR:-/opt/scholarshiptop-db-backups}"
SELFHOST_API="${STAGE5A_SELFHOST_API:-http://127.0.0.1:54321}"
PROD_BASE="${STAGE5A_PROD_BASE:-https://scholarshiptop.com}"
DRY_RUN="${STAGE5A_DRY_RUN:-1}"
FAIL=0
WARN=0

pass() { echo "PASS  $*"; }
warn() { echo "WARN  $*"; WARN=$((WARN + 1)); }
fail() { echo "FAIL  $*"; FAIL=$((FAIL + 1)); }
section() { echo ""; echo "=== $* ==="; }

require_approval() {
  local name="$1"
  if [[ "${!name:-}" == "YES" ]]; then
    pass "approval ${name}=YES"
  else
    fail "missing approval ${name}=YES"
  fi
}

show_cmd() {
  printf '  %s\n' "$*"
}

section "Safety mode"
if [[ "${DRY_RUN}" == "1" ]]; then
  pass "dry-run mode active (no changes executed)"
else
  fail "real execution disabled in Stage 5A deliverable; keep STAGE5A_DRY_RUN=1"
fi

section "Required manual approvals"
require_approval "STAGE5A_OWNER_APPROVED"
require_approval "STAGE5A_FREEZE_WINDOW_APPROVED"
require_approval "STAGE5A_ROLLBACK_OWNER_READY"
require_approval "STAGE5A_HOSTED_SUPABASE_RETENTION_APPROVED"

section "Required local/VPS artifacts"
for path in \
  "${APP}/scripts/vps-migration/stage5a-precutover-check.sh" \
  "${APP}/ops/vps/scripts/patch-shadow-rehearsal-auth-compat.sh" \
  "${APP}/ops/vps/docker-compose.supabase-api.example.yml" \
  "${ENV_DIR}/site.env" \
  "${ENV_DIR}/site.stage4e.env" \
  "${ENV_DIR}/supabase-api.env"; do
  if sudo test -e "${path}"; then
    pass "exists ${path}"
  else
    warn "missing ${path}"
  fi
done

section "Read-only health probes"
for url in "${PROD_BASE}/" "${PROD_BASE}/sitemap.xml" "${SELFHOST_API}/health" "${SELFHOST_API}/auth/v1/health"; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "${url}" 2>/dev/null || true)"
  echo "  ${url} -> ${code}"
done

section "Cutover command order (not executed)"
show_cmd "# 0. Open tmux/screen"
show_cmd "tmux new -s supabase-cutover"
show_cmd "# 1. Freeze writers"
show_cmd "sudo systemctl stop '<parser/content/seo timers and services>'"
show_cmd "sudo crontab -l > '${BACKUP_DIR}/root-crontab-pre-cutover.txt'"
show_cmd "# 2. Backup current env"
show_cmd "sudo cp '${ENV_DIR}/site.env' '${BACKUP_DIR}/site.env.pre-cutover.$(date -u +%Y%m%dT%H%M%SZ)'"
show_cmd "# 3. Final fresh dump from hosted Supabase (URI read from root-only file, never printed)"
show_cmd "SUPABASE_DB_URL_FILE=/root/.supabase-db-url SUPABASE_DUMP_DIR='${DB_BACKUP_DIR}' bash '${APP}/scripts/vps-migration/export-supabase-prod-dump.sh'"
show_cmd "sha256sum -c '${DB_BACKUP_DIR}/supabase-prod-<timestamp>.dump.sha256'"
show_cmd "# 4. Restore into VPS DB"
show_cmd "sudo bash '${APP}/ops/vps/scripts/restore-postgres-clean-test.sh' '${DB_BACKUP_DIR}/supabase-prod-<timestamp>.dump'"
show_cmd "sudo bash '${APP}/ops/vps/scripts/restore-postgres-superuser.sh' '${DB_BACKUP_DIR}/supabase-prod-<timestamp>.dump'"
show_cmd "sudo bash '${APP}/ops/vps/scripts/validate-vps-db-restore-extended.sh'"
show_cmd "# 5. Production-mode self-host API"
show_cmd "sudo bash '${APP}/ops/vps/scripts/patch-shadow-rehearsal-auth-compat.sh'"
show_cmd "sudo docker compose -f '${APP}/ops/vps/docker-compose.supabase-api.example.yml' --profile supabase-api-test up -d"
show_cmd "# 6. Switch site.env atomically from backup/template (manual secret handling)"
show_cmd "sudo install -m 600 '${ENV_DIR}/site.stage4e.env' '${ENV_DIR}/site.env.next-cutover'"
show_cmd "sudo mv '${ENV_DIR}/site.env.next-cutover' '${ENV_DIR}/site.env'"
show_cmd "# 7. Rebuild/restart site only"
show_cmd "sudo bash '${APP}/scripts/vps-migration/host-build-site.sh'"
show_cmd "SMOKE_BASE_URL='http://127.0.0.1' bash '${APP}/ops/vps/scripts/smoke-site.sh'"
show_cmd "# 8. Auth smoke"
show_cmd "sudo bash '${APP}/scripts/vps-migration/stage4f1-close-auth-rehearsal-warnings.sh'"
show_cmd "# 9. Parser switch one-at-a-time after site PASS"
show_cmd "sudo systemctl start '<single parser test service>'"
show_cmd "# 10. Re-enable schedules after parser validation"
show_cmd "sudo systemctl start '<approved timers/services>'"

section "Rollback command order (not executed)"
show_cmd "sudo cp '${BACKUP_DIR}/site.env.pre-cutover.<timestamp>' '${ENV_DIR}/site.env'"
show_cmd "sudo bash '${APP}/ops/vps/scripts/deploy-site.sh'"
show_cmd "sudo cp '${BACKUP_DIR}/parser-env.pre-cutover.<timestamp>' '<parser env path>'"
show_cmd "sudo systemctl restart '<parser timers/services previously active>'"
show_cmd "# Leave VPS DB intact as failed-attempt snapshot; do not delete hosted Supabase for >=7 days."

section "Dry-run verdict"
if [[ "${FAIL}" -eq 0 && "${WARN}" -eq 0 ]]; then
  echo "STAGE_5A_CUTOVER_DRY_RUN_PASS"
  exit 0
fi
if [[ "${FAIL}" -eq 0 ]]; then
  echo "STAGE_5A_CUTOVER_DRY_RUN_PASS_WITH_WARNINGS (${WARN})"
  exit 0
fi
echo "STAGE_5A_CUTOVER_DRY_RUN_BLOCKED (${FAIL} failures, ${WARN} warnings)"
exit 1
