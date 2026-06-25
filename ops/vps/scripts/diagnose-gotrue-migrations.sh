#!/usr/bin/env bash
set -euo pipefail
DB="${1:-scholarshiptop_prod}"
sudo -u postgres psql -d "${DB}" <<'SQL'
\echo '--- schema_migrations tables ---'
SELECT schemaname, tablename FROM pg_tables WHERE tablename = 'schema_migrations' ORDER BY 1;

\echo '--- auth.schema_migrations structure ---'
\d auth.schema_migrations

\echo '--- GoTrue embedded migrations present in DB (sample) ---'
SELECT version FROM auth.schema_migrations
WHERE version IN (
  '20221208132122','20221215195500','20221215195800','20260302000000'
) ORDER BY version;

\echo '--- embedded migrations NOT in DB (first 10 gaps) ---'
WITH embedded(version) AS (VALUES
  ('00'),('20210710035447'),('20210909172000'),('20220811173540'),('20221208132122'),
  ('20221215195500'),('20240115173100'),('20250314173100')
)
SELECT e.version FROM embedded e
LEFT JOIN auth.schema_migrations m ON m.version = e.version
WHERE m.version IS NULL;
SQL
