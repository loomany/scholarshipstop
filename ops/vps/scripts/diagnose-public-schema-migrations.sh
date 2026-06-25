#!/usr/bin/env bash
set -euo pipefail
DB="${1:-scholarshiptop_prod}"
sudo -u postgres psql -d "${DB}" <<'SQL'
\echo '--- public.schema_migrations ---'
SELECT count(*) AS n FROM public.schema_migrations;
SELECT version FROM public.schema_migrations ORDER BY version DESC LIMIT 15;
\echo '--- is 20221208132122 in public? ---'
SELECT version FROM public.schema_migrations WHERE version = '20221208132122';
SQL
