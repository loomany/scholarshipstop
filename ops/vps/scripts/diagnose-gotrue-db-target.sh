#!/usr/bin/env bash
set -euo pipefail
DB="${1:-scholarshiptop_auth_test}"
echo "=== DB ${DB} ==="
sudo -u postgres psql -d "${DB}" <<'SQL'
SELECT count(*) AS public_migrations FROM public.schema_migrations;
SELECT version FROM public.schema_migrations WHERE version IN ('20221125140132','20221208132122','20241009103726') ORDER BY 1;
SELECT count(*) AS auth_migrations FROM auth.schema_migrations;
SQL
echo "=== gotrue container DB path (redacted) ==="
sudo docker inspect scholarshiptop-gotrue-test --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep GOTRUE_DB_DATABASE_URL \
  | sed -E 's#(postgresql://[^:]+:)[^@]+(@.*)#\1***\2#' \
  | sed -E 's#/[^/?]+(\?.*)?$#/.../DBNAME#'
