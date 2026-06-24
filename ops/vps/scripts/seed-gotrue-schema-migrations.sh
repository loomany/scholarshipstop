#!/usr/bin/env bash
# Mark GoTrue migrations as applied on restored Supabase auth schema (skip automigrate failures).
set -euo pipefail
DB="${POSTGRES_DB:-scholarshiptop_prod}"

sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB}" <<'SQL'
CREATE TABLE IF NOT EXISTS auth.schema_migrations (
  version varchar(255) PRIMARY KEY
);

INSERT INTO auth.schema_migrations (version) VALUES
  ('20221208132122'),
  ('20230131181611'),
  ('20230215170200'),
  ('20230306185208'),
  ('20230413175158'),
  ('20230523124352'),
  ('20230607181300'),
  ('20230626173300'),
  ('20230714182300'),
  ('20230907171700'),
  ('20230929173100'),
  ('20231027173100'),
  ('20231114173100'),
  ('20231214173100'),
  ('20240115173100'),
  ('20240214173100')
ON CONFLICT (version) DO NOTHING;

SELECT count(*) AS schema_migrations_count FROM auth.schema_migrations;
SQL

echo "[seed-gotrue-migrations] Done"
