#!/usr/bin/env bash
# Write postgres.env from init secret without printing password.
set -euo pipefail
INIT="/root/.scholarshiptop-db-init"
ENV="/opt/scholarshiptop/env/postgres.env"
# shellcheck disable=SC1090
source "${INIT}"
umask 077
cat > "${ENV}" <<EOF
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_APP_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}
DB_PROVIDER=supabase
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_BACKUP_DIR=/opt/scholarshiptop-db-backups
POSTGRES_BACKUP_RETENTION_DAYS=14
EOF
chmod 600 "${ENV}"
echo "[finalize-postgres-env] wrote ${ENV}"
