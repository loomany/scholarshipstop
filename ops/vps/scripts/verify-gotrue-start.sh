#!/usr/bin/env bash
# Stage 4B.1 — verify GoTrue starts against a DB after migration metadata fix.
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
ENV_FILE="${ROOT}/env/supabase-api.env"
DB="${1:-scholarshiptop_prod}"
COMPOSE="${ROOT}/app/ops/vps/docker-compose.supabase-api.example.yml"
WAIT_SEC="${GOTRUE_STABILITY_WAIT_SEC:-130}"
FAILED=0

pass() { echo "  PASS  $*"; }
fail() { echo "  FAIL  $*"; FAILED=$((FAILED + 1)); }

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: ${ENV_FILE} missing" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${ENV_FILE}"
export GOTRUE_DB_DATABASE_URL
export TARGET_DB="${DB}"

# Build gotrue DB URL without printing password
GOTRUE_TEST_URL="$(python3 - <<'PY'
import os, urllib.parse
raw = os.environ.get("GOTRUE_DB_DATABASE_URL", "")
db = os.environ.get("TARGET_DB", "scholarshiptop_prod")
if not raw:
    raise SystemExit("GOTRUE_DB_DATABASE_URL missing")
u = urllib.parse.urlparse(raw)
u = u._replace(path="/" + db)
print(u.geturl())
PY
)"

export GOTRUE_DB_DATABASE_URL="${GOTRUE_TEST_URL}"

echo "=== GoTrue start test DB=${DB} (URL not printed) ==="
cd "${ROOT}/app"
docker compose -f "${COMPOSE}" --profile supabase-api-test stop gotrue >/dev/null 2>&1 || true
docker compose -f "${COMPOSE}" --profile supabase-api-test rm -f gotrue >/dev/null 2>&1 || true

GOTRUE_DB_DATABASE_URL="${GOTRUE_TEST_URL}" \
  docker compose -f "${COMPOSE}" --profile supabase-api-test up -d gotrue

sleep 10
code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:9999/health 2>/dev/null || echo 000)"
if [[ "${code}" == "200" ]]; then pass "gotrue :9999/health ${code}"; else fail "gotrue :9999/health ${code}"; fi

echo "  INFO  waiting ${WAIT_SEC}s for stability..."
sleep "${WAIT_SEC}"
status="$(docker inspect scholarshiptop-gotrue-test --format '{{.State.Status}}' 2>/dev/null || echo missing)"
if [[ "${status}" == "running" ]]; then pass "gotrue stable running"; else fail "gotrue status=${status}"; fi

counts="$(sudo -u postgres psql -t -A -d "${DB}" -c "SELECT count(*) FROM auth.users")"
idents="$(sudo -u postgres psql -t -A -d "${DB}" -c "SELECT count(*) FROM auth.identities")"
echo "  INFO  auth.users=${counts} auth.identities=${idents}"

code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:54321/auth/v1/health 2>/dev/null || echo 000)"
if [[ "${code}" == "200" ]]; then pass "gateway /auth/v1/health ${code}"; else fail "gateway /auth/v1/health ${code}"; fi

if [[ "${FAILED}" -eq 0 ]]; then
  echo "GOTRUE_START_PASS"
  exit 0
fi
echo "GOTRUE_START_FAIL (${FAILED})"
exit 1
