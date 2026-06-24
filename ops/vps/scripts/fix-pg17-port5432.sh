#!/usr/bin/env bash
set -euo pipefail
pg_ctlcluster 16 main stop 2>/dev/null || true
pg_dropcluster 16 main --stop 2>/dev/null || true
sed -i 's/^port = 5433/port = 5432/' /etc/postgresql/17/main/postgresql.conf
sed -i "s/^#*listen_addresses = .*/listen_addresses = 'localhost'/" /etc/postgresql/17/main/postgresql.conf
pg_ctlcluster 17 main restart
pg_lsclusters

POSTGRES_DB="scholarshiptop_prod"
POSTGRES_USER="scholarshiptop_app"
source /root/.scholarshiptop-db-init

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

sudo -u postgres psql -d "${POSTGRES_DB}" -c "GRANT USAGE ON SCHEMA public TO ${POSTGRES_USER};" 2>/dev/null || true
echo PG17_5432_READY
