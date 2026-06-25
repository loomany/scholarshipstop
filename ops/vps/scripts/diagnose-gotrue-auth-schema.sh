#!/usr/bin/env bash
# Stage 4B.1 — diagnose GoTrue auth schema vs migration state (no secrets printed).
set -euo pipefail
DB="${1:-scholarshiptop_prod}"

echo "=== DB: ${DB} ==="

sudo -u postgres psql -d "${DB}" <<'SQL'
\echo '--- auth table counts ---'
SELECT 'auth.users' AS rel, count(*)::text AS n FROM auth.users
UNION ALL SELECT 'auth.identities', count(*)::text FROM auth.identities
UNION ALL SELECT 'auth.sessions', count(*)::text FROM auth.sessions
UNION ALL SELECT 'auth.refresh_tokens', count(*)::text FROM auth.refresh_tokens
UNION ALL SELECT 'auth.audit_log_entries', count(*)::text FROM auth.audit_log_entries
UNION ALL SELECT 'auth.schema_migrations', count(*)::text FROM auth.schema_migrations;

\echo '--- auth.identities id column type ---'
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'identities'
  AND column_name IN ('id', 'user_id', 'provider_id')
ORDER BY column_name;

\echo '--- migration 20221208132122 present? ---'
SELECT version FROM auth.schema_migrations WHERE version = '20221208132122';

\echo '--- recent schema_migrations (last 10 by version) ---'
SELECT version FROM auth.schema_migrations ORDER BY version DESC LIMIT 10;

\echo '--- profiles FK to auth.users ---'
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass AND contype = 'f';
SQL
