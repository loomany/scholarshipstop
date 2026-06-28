#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
IMAGE="${POSTGRES_TEST_IMAGE:-postgres:17-alpine}"
NAME="legacy-users-trigger-test-${RANDOM}-${RANDOM}"

cleanup() {
  docker rm -f "${NAME}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --rm -d \
  --name "${NAME}" \
  -e POSTGRES_PASSWORD=test-only-password \
  -e POSTGRES_DB=trigger_test \
  "${IMAGE}" >/dev/null

for _ in $(seq 1 60); do
  if docker exec "${NAME}" pg_isready -U postgres -d trigger_test >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "${NAME}" pg_isready -U postgres -d trigger_test >/dev/null

docker exec "${NAME}" psql -v ON_ERROR_STOP=1 -U postgres -d trigger_test <<'SQL'
create schema auth;
create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
create function public.handle_new_user() returns trigger language plpgsql as $$
begin
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();
SQL

docker exec -i "${NAME}" psql -v ON_ERROR_STOP=1 -U postgres -d trigger_test \
  < "${ROOT}/supabase/migrations/20260628103000_remove_legacy_public_users_trigger.sql"

REMOVED="$(docker exec "${NAME}" psql -v ON_ERROR_STOP=1 -At -U postgres -d trigger_test -c "select to_regprocedure('public.handle_new_user()') is null, count(*) from pg_trigger where tgname = 'on_auth_user_created' and not tgisinternal;")"
[[ "${REMOVED}" == 't|0' ]]

docker exec -i "${NAME}" psql -v ON_ERROR_STOP=1 -U postgres -d trigger_test \
  < "${ROOT}/supabase/rollbacks/20260628103000_remove_legacy_public_users_trigger.down.sql"

RESTORED="$(docker exec "${NAME}" psql -v ON_ERROR_STOP=1 -At -U postgres -d trigger_test -c "select to_regprocedure('public.handle_new_user()') is not null, count(*) from pg_trigger where tgname = 'on_auth_user_created' and not tgisinternal;")"
[[ "${RESTORED}" == 't|1' ]]

echo 'legacy public.users trigger migration test: PASS'
