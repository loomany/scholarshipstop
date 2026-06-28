#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
IMAGE="${POSTGRES_TEST_IMAGE:-postgres:17-alpine}"
NAME="essay-unaccent-test-${RANDOM}-${RANDOM}"

cleanup() {
  docker rm -f "${NAME}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --rm -d \
  --name "${NAME}" \
  -e POSTGRES_PASSWORD=test-only-password \
  -e POSTGRES_DB=essay_test \
  "${IMAGE}" >/dev/null

for _ in $(seq 1 60); do
  if docker exec "${NAME}" pg_isready -U postgres -d essay_test >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "${NAME}" pg_isready -U postgres -d essay_test >/dev/null

docker exec -i "${NAME}" psql -v ON_ERROR_STOP=1 -U postgres -d essay_test \
  < "${ROOT}/supabase/migrations/20260628101000_fix_essay_unaccent_schema.sql"

RESULT="$(docker exec "${NAME}" psql -v ON_ERROR_STOP=1 -At -U postgres -d essay_test -c "select public.essay_index_normalize('Café  Scholarships!');")"
[[ "${RESULT}" == 'cafe scholarships' ]]

echo 'essay unaccent migration test: PASS'
