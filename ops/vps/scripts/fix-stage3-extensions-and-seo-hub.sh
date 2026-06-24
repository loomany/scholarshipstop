#!/usr/bin/env bash
# Legacy wrapper — use restore-postgres-pre.sh + restore-postgres-post.sh instead.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DB="${DB_NAME:-${POSTGRES_DB:-scholarshiptop_prod}}"
DUMP="${DUMP_PATH:-${1:-/tmp/supabase-restore.dump}}"

export POSTGRES_DB="${DB}" DUMP_PATH="${DUMP}"
bash "${SCRIPT_DIR}/restore-postgres-pre.sh"
bash "${SCRIPT_DIR}/restore-postgres-post.sh" "${DUMP}"
