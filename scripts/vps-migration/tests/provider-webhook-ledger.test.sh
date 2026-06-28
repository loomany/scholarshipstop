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

RESULT="$(docker exec "${NAME}" psql -v ON_ERROR_STOP=1 -At -U postgres -d ledger_test <<'SQL'
select public.claim_provider_webhook_event('lemon_squeezy', 'order:1', 'order_created', 'hash-1');
select public.claim_provider_webhook_event('lemon_squeezy', 'order:1', 'order_created', 'hash-1');
select public.complete_provider_webhook_event('lemon_squeezy', 'order:1', 'processed');
select public.claim_provider_webhook_event('lemon_squeezy', 'order:1', 'order_created', 'hash-1');
select public.claim_provider_webhook_event('lemon_squeezy', 'order:2', 'order_created', 'hash-2');
select public.complete_provider_webhook_event('lemon_squeezy', 'order:2', 'failed', 'test failure');
select public.claim_provider_webhook_event('lemon_squeezy', 'order:2', 'order_created', 'hash-2');
select attempts from public.provider_webhook_events where event_key = 'order:2';
select has_table_privilege('anon', 'public.provider_webhook_events', 'select');
select has_table_privilege('authenticated', 'public.provider_webhook_events', 'select');
select has_function_privilege('anon', 'public.claim_provider_webhook_event(text,text,text,text)', 'execute');
select has_function_privilege('service_role', 'public.claim_provider_webhook_event(text,text,text,text)', 'execute');
SQL
)"

EXPECTED=$'t\nf\n\nf\nt\n\nt\n2\nf\nf\nf\nt'
[[ "${RESULT}" == "${EXPECTED}" ]]

echo 'provider webhook ledger migration test: PASS'
