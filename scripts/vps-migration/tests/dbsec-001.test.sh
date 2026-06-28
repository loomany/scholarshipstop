#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
IMAGE="${POSTGRES_TEST_IMAGE:-postgres:17-alpine}"
NAME="dbsec-001-test-${RANDOM}-${RANDOM}"

cleanup() {
  docker rm -f "${NAME}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --rm -d \
  --name "${NAME}" \
  -e POSTGRES_PASSWORD=test-only-password \
  -e POSTGRES_DB=dbsec_test \
  "${IMAGE}" >/dev/null

for _ in $(seq 1 60); do
  if docker exec "${NAME}" pg_isready -U postgres -d dbsec_test >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "${NAME}" pg_isready -U postgres -d dbsec_test >/dev/null

docker exec -i "${NAME}" psql -v ON_ERROR_STOP=1 -U postgres -d dbsec_test <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END
$$;
ALTER ROLE service_role BYPASSRLS;
CREATE TABLE public.schema_migrations (version text PRIMARY KEY);
CREATE TABLE public.schema_migrations_gotrue_backup_20260624t233812z (version text);
CREATE TABLE public.schema_migrations_gotrue_backup_20260625t063235z (version text);
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON public.schema_migrations_gotrue_backup_20260624t233812z TO anon, authenticated;
GRANT ALL ON public.schema_migrations_gotrue_backup_20260625t063235z TO anon, authenticated;
INSERT INTO public.schema_migrations VALUES ('before');
SQL

SNAPSHOT_OUTPUT="$(
  docker exec -i "${NAME}" psql -v ON_ERROR_STOP=1 -U postgres -d dbsec_test \
    < "${ROOT}/scripts/vps-migration/dbsec-001-acl-snapshot.sql"
)"
grep -q 'schema_migrations' <<< "${SNAPSHOT_OUTPUT}"
grep -q 'authenticated' <<< "${SNAPSHOT_OUTPUT}"

docker exec -i "${NAME}" psql -v ON_ERROR_STOP=1 -U postgres -d dbsec_test \
  < "${ROOT}/supabase/migrations/20260628100000_lock_down_exposed_migration_tables.sql"
docker exec -i "${NAME}" psql -v ON_ERROR_STOP=1 -U postgres -d dbsec_test \
  < "${ROOT}/scripts/vps-migration/check-dbsec-001.sql"

docker exec -i "${NAME}" psql -v ON_ERROR_STOP=1 -U postgres -d dbsec_test <<'SQL'
SET ROLE service_role;
INSERT INTO public.schema_migrations VALUES ('service-role-still-works');
SELECT count(*) FROM public.schema_migrations;
RESET ROLE;
SQL

docker exec -i "${NAME}" psql -v ON_ERROR_STOP=1 -U postgres -d dbsec_test \
  < "${ROOT}/supabase/rollbacks/20260628100000_lock_down_exposed_migration_tables.down.sql"
docker exec -i "${NAME}" psql -v ON_ERROR_STOP=1 -U postgres -d dbsec_test <<'SQL'
DO $$
BEGIN
  IF NOT has_table_privilege('anon', 'public.schema_migrations', 'SELECT') THEN
    RAISE EXCEPTION 'rollback did not restore anon SELECT';
  END IF;
END
$$;
SQL

echo 'DBSEC-001 disposable PostgreSQL tests: PASS'
