#!/usr/bin/env bash
# Install PostgreSQL 17 server on port 5432 (replace 16 cluster for Supabase parity).
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

if ! dpkg -l postgresql-client-17 >/dev/null 2>&1; then
  bash "$(dirname "$0")/install-pg17-client.sh"
fi

apt-get install -y postgresql-17

# Stop 16 cluster if present; run 17 on 5432
if command -v pg_lsclusters >/dev/null 2>&1; then
  pg_lsclusters || true
  if pg_lsclusters 2>/dev/null | grep -q '^16'; then
    pg_ctlcluster 16 main stop || true
    pg_dropcluster 16 main --stop || true
  fi
fi

# Ensure 17 listens localhost only
PG_CONF="$(find /etc/postgresql/17 -name postgresql.conf | head -1)"
PG_HBA="$(find /etc/postgresql/17 -name pg_hba.conf | head -1)"
if [[ -n "${PG_CONF}" ]]; then
  sed -i "s/^#*port = .*/port = 5432/" "${PG_CONF}"
  sed -i "s/^#*listen_addresses = .*/listen_addresses = 'localhost'/" "${PG_CONF}"
fi
if [[ -n "${PG_HBA}" ]]; then
  grep -q '127.0.0.1/32.*scram-sha-256' "${PG_HBA}" || \
    echo "host all all 127.0.0.1/32 scram-sha-256" >> "${PG_HBA}"
fi

pg_ctlcluster 17 main start
systemctl enable postgresql

POSTGRES_DB="${POSTGRES_DB:-scholarshiptop_prod}"
POSTGRES_USER="${POSTGRES_USER:-scholarshiptop_app}"
INIT="/root/.scholarshiptop-db-init"

if [[ -f "${INIT}" ]]; then
  # shellcheck disable=SC1090
  source "${INIT}"
else
  POSTGRES_APP_PASSWORD="$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)"
  umask 077
  cat > "${INIT}" <<EOF
POSTGRES_APP_PASSWORD='${POSTGRES_APP_PASSWORD}'
POSTGRES_DB='${POSTGRES_DB}'
POSTGRES_USER='${POSTGRES_USER}'
EOF
  chmod 600 "${INIT}"
fi

sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
SELECT 'CREATE DATABASE ${POSTGRES_DB}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${POSTGRES_DB}')\\gexec
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${POSTGRES_USER}') THEN
    CREATE ROLE ${POSTGRES_USER} LOGIN PASSWORD '${POSTGRES_APP_PASSWORD}';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END\$\$;
GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${POSTGRES_USER};
SQL

sudo -u postgres psql -d "${POSTGRES_DB}" -v ON_ERROR_STOP=1 <<SQL
GRANT USAGE ON SCHEMA public TO ${POSTGRES_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${POSTGRES_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${POSTGRES_USER};
SQL

echo "[install-pg17-server] PostgreSQL 17 on 5432, DB ${POSTGRES_DB}"
