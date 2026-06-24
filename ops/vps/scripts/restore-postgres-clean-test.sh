#!/usr/bin/env bash
# Stage 3B — Repeatable clean restore into a throwaway test database (VPS only).
# Does NOT modify scholarshiptop_prod or Supabase production.
#
# Usage:
#   sudo bash restore-postgres-clean-test.sh /opt/scholarshiptop-db-backups/supabase-prod-*.dump
#
# Env:
#   TEST_DB=scholarshiptop_restore_test (default)
#   KEEP_TEST_DB=1 — skip DROP at end (debug)
set -euo pipefail

DUMP="${1:?Usage: restore-postgres-clean-test.sh /path/to/file.dump}"
TEST_DB="${TEST_DB:-scholarshiptop_restore_test}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PG_RESTORE="/usr/lib/postgresql/17/bin/pg_restore"

if [[ ! -f "${DUMP}" ]]; then
  echo "[clean-test] ERROR: dump not found" >&2
  exit 1
fi

echo "[clean-test] Drop/create ${TEST_DB}..."
sudo -u postgres psql -v ON_ERROR_STOP=1 -d postgres <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TEST_DB}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS ${TEST_DB};
CREATE DATABASE ${TEST_DB};
SQL

export POSTGRES_DB="${TEST_DB}" DUMP_PATH="${DUMP}"

echo "[clean-test] Pre-restore..."
bash "${SCRIPT_DIR}/restore-postgres-pre.sh"

echo "[clean-test] pg_restore..."
sudo -u postgres "${PG_RESTORE}" \
  --no-owner --no-acl \
  --dbname="${TEST_DB}" "${DUMP}" 2>&1 | tail -25 || true

echo "[clean-test] Post-restore..."
bash "${SCRIPT_DIR}/restore-postgres-post.sh" "${DUMP}"

echo "[clean-test] Validation..."
POSTGRES_DB="${TEST_DB}" bash "${SCRIPT_DIR}/validate-vps-db-restore-extended.sh"
RESULT=$?

if [[ "${KEEP_TEST_DB:-0}" != "1" ]]; then
  echo "[clean-test] Dropping ${TEST_DB}..."
  sudo -u postgres psql -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB};"
else
  echo "[clean-test] KEEP_TEST_DB=1 — ${TEST_DB} retained for inspection"
fi

if [[ "${RESULT}" -eq 0 ]]; then
  echo "CLEAN_RESTORE_TEST_PASS"
else
  echo "CLEAN_RESTORE_TEST_FAIL"
  exit 1
fi
