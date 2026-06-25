#!/usr/bin/env bash
# Stage 4B.1 — Sync GoTrue v2.171.0 Pop migration metadata on restored VPS PostgreSQL.
#
# Root cause: GoTrue Pop tracks embedded migrations in public.schema_migrations,
# while Supabase hosted auth stores newer versions in auth.schema_migrations.
# Restored DB has public.schema_migrations stuck at 20221125140132, so GoTrue
# re-runs 20221208132122 which fails on PG17 (auth.identities.id is uuid, not text).
#
# Fix (option A): mark all GoTrue v2.171 embedded migrations as applied in
# public.schema_migrations — idempotent, no DDL on auth.users/identities.
#
# Usage:
#   bash scripts/vps-migration/fix-gotrue-auth-migrations-vps.sh --dry-run
#   bash scripts/vps-migration/fix-gotrue-auth-migrations-vps.sh --create-test-db
#   bash scripts/vps-migration/fix-gotrue-auth-migrations-vps.sh --apply --db scholarshiptop_auth_test
#   bash scripts/vps-migration/fix-gotrue-auth-migrations-vps.sh --apply --db scholarshiptop_prod --confirm-prod
#
# No secrets. No destructive auth DDL without --allow-destructive (not used here).

set -euo pipefail

DB="${DB:-scholarshiptop_auth_test}"
SOURCE_DB="${SOURCE_DB:-scholarshiptop_prod}"
MODE="dry-run"
CONFIRM_PROD=0
CREATE_TEST_DB=0
ALLOW_DESTRUCTIVE=0
BACKUP_SUFFIX="$(date -u +%Y%m%dT%H%M%SZ)"

# GoTrue v2.171.0 embedded migration versions (54)
read -r -d '' GOTRUE_V2171_MIGRATIONS <<'EOF' || true
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
EOF

usage() {
  sed -n '1,20p' "$0"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) MODE="dry-run"; shift ;;
    --apply) MODE="apply"; shift ;;
    --db) DB="$2"; shift 2 ;;
    --source-db) SOURCE_DB="$2"; shift 2 ;;
    --create-test-db) CREATE_TEST_DB=1; shift ;;
    --confirm-prod) CONFIRM_PROD=1; shift ;;
    --allow-destructive) ALLOW_DESTRUCTIVE=1; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown arg: $1" >&2; usage ;;
  esac
done

log() { echo "[fix-gotrue-migrations] $*"; }

require_db_exists() {
  local db="$1"
  if ! sudo -u postgres psql -t -A -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '${db}'" | grep -q 1; then
    echo "ERROR: database '${db}' does not exist" >&2
    exit 1
  fi
}

create_test_db() {
  log "Creating throwaway DB ${DB} from ${SOURCE_DB} auth schema snapshot"
  if [[ "${MODE}" == "dry-run" ]]; then
    log "DRY-RUN: would create database ${DB}, copy auth schema + public.schema_migrations"
    return 0
  fi
  if sudo -u postgres psql -t -A -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '${DB}'" | grep -q 1; then
    log "DB ${DB} exists — dropping for clean snapshot"
    sudo -u postgres psql -v ON_ERROR_STOP=1 -d postgres -c \
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB}' AND pid <> pg_backend_pid();"
    sudo -u postgres dropdb "${DB}"
  fi
  sudo -u postgres createdb "${DB}"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB}" <<'SQL'
CREATE SCHEMA IF NOT EXISTS extensions;
SQL
  sudo -u postgres pg_dump -d "${SOURCE_DB}" -n auth --no-owner --no-acl --clean --if-exists \
    | grep -Ev '^(CREATE TRIGGER|ALTER TABLE .* ENABLE TRIGGER|ALTER TABLE .* DISABLE TRIGGER)' \
    | sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB}" >/dev/null
  sudo -u postgres pg_dump -d "${SOURCE_DB}" -t public.schema_migrations --no-owner --no-acl --clean --if-exists \
    | sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB}" >/dev/null
  log "Test DB ${DB} ready"
}

backup_migration_tables() {
  local db="$1"
  local backup_public="schema_migrations_gotrue_backup_${BACKUP_SUFFIX}"
  log "Backing up public.schema_migrations → public.${backup_public} on ${db}"
  if [[ "${MODE}" == "dry-run" ]]; then
    log "DRY-RUN: backup table public.${backup_public}"
    return 0
  fi
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${db}" <<SQL
CREATE TABLE IF NOT EXISTS public.${backup_public} AS
SELECT *, now() AS backed_up_at FROM public.schema_migrations;
SQL
}

count_auth_rows() {
  local db="$1"
  sudo -u postgres psql -t -A -d "${db}" <<'SQL'
SELECT json_build_object(
  'users', (SELECT count(*) FROM auth.users),
  'identities', (SELECT count(*) FROM auth.identities),
  'public_migrations', (SELECT count(*) FROM public.schema_migrations),
  'auth_migrations', (SELECT count(*) FROM auth.schema_migrations)
)::text;
SQL
}

apply_public_migration_sync() {
  local db="$1"
  local missing=0
  local tmp
  tmp="$(mktemp)"
  trap 'rm -f "${tmp}"' RETURN
  while IFS= read -r ver; do
    [[ -z "${ver}" ]] && continue
    if ! sudo -u postgres psql -t -A -d "${db}" -c \
      "SELECT 1 FROM public.schema_migrations WHERE version = '${ver}'" | grep -q 1; then
      missing=$((missing + 1))
      printf "%s\n" "${ver}" >> "${tmp}"
    fi
  done <<< "${GOTRUE_V2171_MIGRATIONS}"

  log "GoTrue v2.171 embedded migrations missing in public.schema_migrations on ${db}: ${missing}"
  if [[ "${missing}" -eq 0 ]]; then
    log "Nothing to insert — already synced"
    return 0
  fi
  if [[ "${MODE}" == "dry-run" ]]; then
    log "DRY-RUN: would INSERT ${missing} versions into public.schema_migrations"
    return 0
  fi
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${db}" <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version character varying(255) PRIMARY KEY
);
SQL
  while IFS= read -r ver; do
    sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${db}" -c \
      "INSERT INTO public.schema_migrations (version) VALUES ('${ver}') ON CONFLICT (version) DO NOTHING;"
  done < "${tmp}"
  log "Inserted missing GoTrue migration versions into public.schema_migrations"
}

if [[ "${CREATE_TEST_DB}" -eq 1 ]]; then
  DB="${DB:-scholarshiptop_auth_test}"
  create_test_db
  if [[ "${MODE}" == "dry-run" ]]; then
    log "DRY-RUN complete after test DB plan"
    echo "STAGE_4B1_FIX_DRY_RUN_OK"
    exit 0
  fi
fi

if [[ "${DB}" == "scholarshiptop_prod" && "${MODE}" == "apply" && "${CONFIRM_PROD}" -ne 1 ]]; then
  echo "ERROR: --apply on scholarshiptop_prod requires --confirm-prod" >&2
  exit 1
fi

if [[ "${ALLOW_DESTRUCTIVE}" -eq 1 ]]; then
  echo "ERROR: this script does not perform destructive auth DDL; remove --allow-destructive" >&2
  exit 1
fi

require_db_exists "${DB}"

log "Mode=${MODE} DB=${DB}"
BEFORE="$(count_auth_rows "${DB}")"
log "Before: ${BEFORE}"

backup_migration_tables "${DB}"
apply_public_migration_sync "${DB}"

AFTER="$(count_auth_rows "${DB}")"
log "After: ${AFTER}"

if [[ "${MODE}" == "dry-run" ]]; then
  echo "STAGE_4B1_FIX_DRY_RUN_OK"
else
  echo "STAGE_4B1_FIX_APPLIED"
fi
