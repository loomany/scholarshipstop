#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
IMAGE="${POSTGRES_TEST_IMAGE:-postgres:17-alpine}"
NAME="provider-webhook-ledger-test-${RANDOM}-${RANDOM}"

cleanup() {
  docker rm -f "${NAME}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --rm -d \
  --name "${NAME}" \
  -e POSTGRES_PASSWORD=test-only-password \
  -e POSTGRES_DB=ledger_test \
  "${IMAGE}" >/dev/null

for _ in $(seq 1 60); do
  if docker exec "${NAME}" pg_isready -U postgres -d ledger_test >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "${NAME}" pg_isready -U postgres -d ledger_test >/dev/null

docker exec "${NAME}" psql -v ON_ERROR_STOP=1 -U postgres -d ledger_test \
  -c 'create role anon; create role authenticated; create role service_role;'
docker exec -i "${NAME}" psql -v ON_ERROR_STOP=1 -U postgres -d ledger_test \
  < "${ROOT}/supabase/migrations/20260628102000_provider_webhook_event_ledger.sql"
docker exec -i "${NAME}" psql -v ON_ERROR_STOP=1 -U postgres -d ledger_test \
  < "${ROOT}/supabase/migrations/20260629134500_subscription_webhook_event_ledger.sql"

RESULT="$(docker exec -i "${NAME}" psql -v ON_ERROR_STOP=1 -At -U postgres -d ledger_test <<'SQL'
select public.claim_provider_webhook_event('lemon_squeezy', 'order:1', 'order_created', 'hash-1', '1', null);
select public.claim_provider_webhook_event('lemon_squeezy', 'order:1', 'order_created', 'hash-1', '1', null);
select public.complete_provider_webhook_event('lemon_squeezy', 'order:1', 'processed');
select public.claim_provider_webhook_event('lemon_squeezy', 'order:1', 'order_created', 'hash-1', '1', null);
select public.claim_provider_webhook_event('lemon_squeezy', 'order:2', 'subscription_created', 'hash-2', '2', '22');
select public.complete_provider_webhook_event('lemon_squeezy', 'order:2', 'failed', 'test failure');
select public.claim_provider_webhook_event('lemon_squeezy', 'order:2', 'subscription_created', 'hash-2', '2', '22');
select attempts from public.provider_webhook_events where event_id = 'order:2';
select provider_order_id || ':' || provider_subscription_id from public.provider_webhook_events where event_id = 'order:2';
select has_table_privilege('anon', 'public.provider_webhook_events', 'select');
select has_table_privilege('authenticated', 'public.provider_webhook_events', 'select');
select has_table_privilege('service_role', 'public.provider_webhook_events', 'select');
select has_function_privilege('anon', 'public.claim_provider_webhook_event(text,text,text,text,text,text)', 'execute');
select has_function_privilege('service_role', 'public.claim_provider_webhook_event(text,text,text,text,text,text)', 'execute');
SQL
)"

EXPECTED=$'t\nf\n\nf\nt\n\nt\n2\n2:22\nf\nf\nt\nf\nt'
[[ "${RESULT}" == "${EXPECTED}" ]]

SERVICE_CLAIM="$(docker exec "${NAME}" psql -v ON_ERROR_STOP=1 -Atq -U postgres -d ledger_test \
  -c "set role service_role; select public.claim_provider_webhook_event('lemon_squeezy', 'service:1', 'subscription_created', 'hash-3', null, '33');")"
[[ "${SERVICE_CLAIM}" == 't' ]]

docker exec -i "${NAME}" psql -v ON_ERROR_STOP=1 -U postgres -d ledger_test \
  < "${ROOT}/supabase/rollbacks/20260629134500_subscription_webhook_event_ledger.down.sql"
docker exec -i "${NAME}" psql -v ON_ERROR_STOP=1 -U postgres -d ledger_test \
  < "${ROOT}/supabase/rollbacks/20260628102000_provider_webhook_event_ledger.down.sql"

DOWN_RESULT="$(docker exec -i "${NAME}" psql -v ON_ERROR_STOP=1 -At -U postgres -d ledger_test <<'SQL'
select to_regclass('public.provider_webhook_events') is null;
select to_regprocedure('public.claim_provider_webhook_event(text,text,text,text,text,text)') is null;
select to_regprocedure('public.complete_provider_webhook_event(text,text,text,text)') is null;
SQL
)"
[[ "${DOWN_RESULT}" == $'t\nt\nt' ]]

echo 'provider webhook ledger migration up/down test: PASS'
