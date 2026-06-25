#!/usr/bin/env bash
set -euo pipefail
DB="${1:-scholarshiptop_auth_test}"
sudo -u postgres psql -d "${DB}" <<'SQL'
SELECT version FROM public.schema_migrations WHERE version IN ('00','20221208132122') ORDER BY 1;
SELECT version FROM auth.schema_migrations WHERE version IN ('00','20221208132122') ORDER BY 1;
SQL
