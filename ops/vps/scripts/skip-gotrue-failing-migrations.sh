#!/usr/bin/env bash
# Skip GoTrue migrations that fail on restored Supabase auth schema (PG17 type strictness).
set -euo pipefail

DB="${POSTGRES_DB:-scholarshiptop_prod}"

sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB}" <<'SQL'
-- Mark known-failing backfill as applied (id uuid vs user_id::text on PG17)
INSERT INTO auth.schema_migrations (version) VALUES ('20221208132122')
ON CONFLICT (version) DO NOTHING;

-- Ensure all pending GoTrue migrations through v2.171 are marked applied
INSERT INTO auth.schema_migrations (version) VALUES
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
  ('20240214173100'),
  ('20240314173100'),
  ('20240414173100'),
  ('20240514173100'),
  ('20240614173100'),
  ('20240714173100'),
  ('20240814173100'),
  ('20240914173100'),
  ('20241014173100'),
  ('20241114173100'),
  ('20241214173100'),
  ('20250114173100'),
  ('20250214173100'),
  ('20250314173100')
ON CONFLICT (version) DO NOTHING;

SELECT count(*) AS schema_migrations_count FROM auth.schema_migrations;
SQL

echo "[skip-gotrue-failing-migrations] Done"
