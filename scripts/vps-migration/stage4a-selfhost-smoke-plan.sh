#!/usr/bin/env bash
# Stage 4A — Self-host smoke plan (local/VPS test endpoints ONLY).
# Does NOT touch production site.env, parsers, or hosted Supabase.
#
# Prerequisites:
#   - Stage 3 restore complete (scholarshiptop_prod on VPS PG 17)
#   - Optional: docker compose --profile supabase-api-test up (see docker-compose.supabase-api.example.yml)
#   - Env file on VPS: /opt/scholarshiptop/env/supabase-api.env (never commit)
#
# Usage:
#   # Plan only (no network calls):
#   bash scripts/vps-migration/stage4a-selfhost-smoke-plan.sh --plan
#
#   # Run against internal test stack (localhost):
#   SELFHOST_API_BASE_URL=http://127.0.0.1:54321 \
#   SUPABASE_ANON_KEY='...' \
#   bash scripts/vps-migration/stage4a-selfhost-smoke-plan.sh --internal
#
#   # Run DB-only checks (no Auth API):
#   DATABASE_URL='postgresql://...@127.0.0.1:5432/scholarshiptop_prod' \
#   bash scripts/vps-migration/stage4a-selfhost-smoke-plan.sh --db-only

set -euo pipefail

BASE="${SELFHOST_API_BASE_URL:-http://127.0.0.1:54321}"
BASE="${BASE%/}"
MODE="${1:-}"
FAILED=0

pass() { echo "  PASS  $*"; }
fail() { echo "  FAIL  $*"; FAILED=$((FAILED + 1)); }
section() { echo ""; echo "=== $* ==="; }

print_plan() {
  cat <<'EOF'
Stage 4A smoke plan (no production switch)

1. Infrastructure
   - gotrue container healthy (/health on :9999)
   - postgrest responds on /rest/v1/ (OpenAPI or HEAD)
   - nginx gateway maps /auth/v1 and /rest/v1 on :54321

2. Auth session (test user — create on VPS only, not production)
   - POST /auth/v1/token?grant_type=password (test account)
   - GET  /auth/v1/user with Bearer access_token
   - Verify JWT aud=authenticated, sub matches auth.users.id

3. Scholarship reads (anon + RLS public)
   - GET /rest/v1/scholarships?select=id,slug&limit=1
     Header: apikey=<anon>, Authorization=Bearer <anon>
   - Expect 200 + JSON array

4. Profiles (authenticated RLS)
   - GET /rest/v1/profiles?select=id,email&id=eq.<test_user_id>
     Header: Authorization=Bearer <user_access_token>
   - Expect own row only (RLS)

5. RPC (public/service)
   - POST /rest/v1/rpc/get_comparison_data with anon key
   - POST /rest/v1/rpc/trial_reserve_quota with user JWT (server-side pattern)

6. Storage public URLs (hybrid — no Stage 4A API)
   - curl -I a known essay-heroes URL from DB (still on Supabase CDN)
   - curl -I a known content-images URL
   - Expect 200 from hosted Supabase Storage (hybrid OK)

7. RLS negative test
   - GET /rest/v1/profiles with anon key only → expect empty or RLS-filtered
   - GET /rest/v1/subscriptions with anon → expect no foreign rows

8. Rollback check
   - Confirm production site.env still points to hosted SUPABASE_URL
   - Confirm parsers still use hosted SUPABASE_URL

EOF
}

smoke_internal() {
  section "Infrastructure"
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "${BASE}/health" 2>/dev/null || echo 000)"
  if [[ "${code}" == "200" ]]; then pass "gateway /health ${code}"; else fail "gateway /health ${code}"; fi

  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "${BASE}/auth/v1/health" 2>/dev/null || echo 000)"
  if [[ "${code}" =~ ^(200|404)$ ]]; then pass "auth prefix reachable (${code})"; else fail "auth prefix ${code}"; fi

  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "${BASE}/rest/v1/" 2>/dev/null || echo 000)"
  if [[ "${code}" =~ ^(200|401|404)$ ]]; then pass "rest prefix reachable (${code})"; else fail "rest prefix ${code}"; fi

  if [[ -z "${SUPABASE_ANON_KEY:-}" ]]; then
    fail "SUPABASE_ANON_KEY not set — skip DB API checks"
    return
  fi

  section "Scholarship read (anon)"
  body="$(curl -sS --max-time 15 \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    "${BASE}/rest/v1/scholarships?select=id,slug&limit=1" 2>/dev/null || true)"
  if echo "${body}" | grep -q '"slug"'; then
    pass "scholarships select"
  else
    fail "scholarships select (empty or error)"
  fi

  section "RLS — profiles anon"
  body="$(curl -sS --max-time 15 \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    "${BASE}/rest/v1/profiles?select=id&limit=1" 2>/dev/null || true)"
  if [[ -z "${body}" || "${body}" == "[]" ]]; then
    pass "profiles anon filtered (RLS OK)"
  else
    fail "profiles anon returned rows (check RLS policies)"
  fi

  section "Storage hybrid note"
  echo "  INFO  /storage/v1 not in Stage 4A stack — verify hosted CDN URLs separately"
}

smoke_db_only() {
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "ERROR: DATABASE_URL required for --db-only" >&2
    exit 1
  fi
  section "DB row counts (restored VPS)"
  for q in \
    "select count(*) from auth.users" \
    "select count(*) from public.scholarships where is_active=true limit 1" \
    "select count(*) from public.profiles" \
    "select count(*) from storage.objects"; do
    n="$(psql "${DATABASE_URL}" -t -A -c "${q}" 2>/dev/null || echo ERR)"
    if [[ "${n}" =~ ^[0-9]+$ ]] && [[ "${n}" -gt 0 ]]; then
      pass "${q} → ${n}"
    else
      fail "${q} → ${n}"
    fi
  done

  section "RLS policies"
  n="$(psql "${DATABASE_URL}" -t -A -c "select count(*) from pg_policies" 2>/dev/null || echo 0)"
  if [[ "${n}" -ge 40 ]]; then pass "pg_policies count=${n}"; else fail "pg_policies count=${n}"; fi
}

case "${MODE}" in
  --plan) print_plan; exit 0 ;;
  --internal) smoke_internal ;;
  --db-only) smoke_db_only ;;
  *)
    echo "Usage: $0 --plan | --internal | --db-only" >&2
    exit 1
    ;;
esac

echo ""
if [[ "${FAILED}" -eq 0 ]]; then
  echo "STAGE_4A_SMOKE_PASS"
  exit 0
else
  echo "STAGE_4A_SMOKE_FAIL (${FAILED})"
  exit 1
fi
