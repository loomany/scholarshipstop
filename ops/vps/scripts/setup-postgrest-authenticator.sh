#!/usr/bin/env bash
# Create PostgREST authenticator role on VPS (Supabase-compatible).
set -euo pipefail
INIT="/root/.scholarshiptop-db-init"
AUTH_PASS_FILE="/root/.postgrest-authenticator-pass"

if [[ -f "${INIT}" ]]; then
  # shellcheck disable=SC1090
  source "${INIT}"
fi
POSTGRES_DB="${POSTGRES_DB:-scholarshiptop_prod}"

if [[ -f "${AUTH_PASS_FILE}" ]]; then
  AUTH_PASS="$(tr -d '\r\n' < "${AUTH_PASS_FILE}")"
else
  AUTH_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
  umask 077
  printf '%s\n' "${AUTH_PASS}" > "${AUTH_PASS_FILE}"
  chmod 600 "${AUTH_PASS_FILE}"
fi

sudo -u postgres psql -v ON_ERROR_STOP=1 -d postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '${AUTH_PASS}';
  ELSE
    ALTER ROLE authenticator PASSWORD '${AUTH_PASS}';
  END IF;
END \$\$;
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO authenticator;
SQL

sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${POSTGRES_DB}" <<'SQL'
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA public TO authenticator;
GRANT USAGE ON SCHEMA storage TO authenticator;
GRANT USAGE ON SCHEMA extensions TO authenticator;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
ALTER ROLE service_role BYPASSRLS;
SQL

echo "[setup-postgrest-authenticator] OK (password in ${AUTH_PASS_FILE}, not printed)"
