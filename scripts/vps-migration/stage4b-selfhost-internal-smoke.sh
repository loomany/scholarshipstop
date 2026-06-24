#!/usr/bin/env bash
# Stage 4B — Extended internal smoke (localhost GoTrue + PostgREST).
# Sources anon key from supabase-api.env without printing secrets.
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
ENV_FILE="${ROOT}/env/supabase-api.env"
SMOKE="${ROOT}/app/scripts/vps-migration/stage4a-selfhost-smoke-plan.sh"
BASE="${SELFHOST_API_BASE_URL:-http://127.0.0.1:54321}"
BASE="${BASE%/}"
FAILED=0

pass() { echo "  PASS  $*"; }
fail() { echo "  FAIL  $*"; FAILED=$((FAILED + 1)); }
section() { echo ""; echo "=== $* ==="; }

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: ${ENV_FILE} missing — run setup-supabase-api-env.sh first" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${ENV_FILE}"

ANON="${SUPABASE_ANON_KEY:-}"
SERVICE="${SUPABASE_SERVICE_ROLE_KEY:-}"

section "Infrastructure"
for path in /health /auth/v1/health /rest/v1/; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "${BASE}${path}" 2>/dev/null || echo 000)"
  echo "  ${path} → ${code}"
done

if [[ -z "${ANON}" ]]; then
  fail "SUPABASE_ANON_KEY empty in env file"
else
  pass "anon key loaded (not printed)"
fi

section "Scholarships read (anon)"
body="$(curl -sS --max-time 20 \
  -H "apikey: ${ANON}" \
  -H "Authorization: Bearer ${ANON}" \
  -H "Accept-Profile: public" \
  "${BASE}/rest/v1/scholarships_safe_listing?select=id,slug&is_active=eq.true&limit=3" 2>/dev/null || true)"
count="$(echo "${body}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo 0)"
if [[ "${count}" -ge 1 ]]; then
  pass "scholarships_safe_listing select count=${count}"
else
  fail "scholarships_safe_listing select (body length $(echo -n "${body}" | wc -c))"
fi

section "Scholarships count header"
hdr="$(curl -sS --max-time 20 -I \
  -H "apikey: ${ANON}" \
  -H "Authorization: Bearer ${ANON}" \
  -H "Prefer: count=exact" \
  "${BASE}/rest/v1/scholarships_safe_listing?select=id&is_active=eq.true" 2>/dev/null || true)"
if echo "${hdr}" | grep -qi 'content-range'; then
  pass "content-range present ($(echo "${hdr}" | grep -i content-range | tr -d '\r'))"
else
  fail "content-range missing"
fi

section "RLS — profiles anon"
body="$(curl -sS --max-time 15 \
  -H "apikey: ${ANON}" \
  -H "Authorization: Bearer ${ANON}" \
  "${BASE}/rest/v1/profiles?select=id&limit=5" 2>/dev/null || true)"
if [[ "${body}" == "[]" || -z "${body}" ]]; then
  pass "profiles anon empty (RLS OK)"
elif echo "${body}" | grep -q '"code"'; then
  fail "profiles anon error ($(echo "${body}" | head -c 120))"
else
  fail "profiles anon returned data"
fi

section "RLS — profiles service role"
if [[ -n "${SERVICE}" ]]; then
  body="$(curl -sS --max-time 15 \
    -H "apikey: ${SERVICE}" \
    -H "Authorization: Bearer ${SERVICE}" \
    "${BASE}/rest/v1/profiles?select=id&limit=1" 2>/dev/null || true)"
  scount="$(echo "${body}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo 0)"
  if [[ "${scount}" -ge 1 ]]; then
    pass "profiles service role read count=${scount}"
  else
    fail "profiles service role read failed"
  fi
else
  fail "SUPABASE_SERVICE_ROLE_KEY empty"
fi

section "RPC — get_comparison_data (anon)"
INST_IDS="$(sudo -u postgres psql -t -A -d scholarshiptop_prod -c "select id from public.institutions where slug is not null order by slug limit 2" 2>/dev/null | paste -sd, - || true)"
if [[ -z "${INST_IDS}" || "${INST_IDS}" != *,* ]]; then
  fail "get_comparison_data skipped (need 2 institution UUIDs in DB)"
else
  IFS=',' read -r INST_A INST_B <<< "${INST_IDS}"
  rpc_body="{\"p_inst_a\":\"${INST_A}\",\"p_inst_b\":\"${INST_B}\"}"
  code="$(curl -sS -o /tmp/rpc-out.json -w '%{http_code}' --max-time 30 \
    -X POST \
    -H "apikey: ${ANON}" \
    -H "Authorization: Bearer ${ANON}" \
    -H "Content-Type: application/json" \
    "${BASE}/rest/v1/rpc/get_comparison_data" \
    -d "${rpc_body}" 2>/dev/null || echo 000)"
  if [[ "${code}" =~ ^(200|204)$ ]]; then
    pass "get_comparison_data HTTP ${code}"
  else
    fail "get_comparison_data HTTP ${code} ($(head -c 200 /tmp/rpc-out.json 2>/dev/null))"
  fi
fi

section "GoTrue health direct"
code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:9999/health 2>/dev/null || echo 000)"
if [[ "${code}" == "200" ]]; then pass "gotrue :9999/health ${code}"; else fail "gotrue health ${code}"; fi

section "PostgREST direct"
code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:3001/ 2>/dev/null || echo 000)"
if [[ "${code}" =~ ^(200|401)$ ]]; then pass "postgrest :3001 ${code}"; else fail "postgrest ${code}"; fi

section "JWT sanity (decode anon payload, no secret printed)"
export ANON
python3 - <<'PY' || fail "anon JWT decode failed"
import os, json, base64
tok = os.environ.get("ANON","")
parts = tok.split(".")
if len(parts) < 2:
    raise SystemExit(1)
pad = parts[1] + "=" * (-len(parts[1]) % 4)
payload = json.loads(base64.urlsafe_b64decode(pad))
role = payload.get("role")
print(f"  INFO  anon JWT role={role}")
if role not in ("anon", "service_role"):
    raise SystemExit(1)
PY

section "Listening ports (must be 127.0.0.1 only)"
while read -r line; do
  if echo "${line}" | grep -qE ':(54321|9999|3001)'; then
    if echo "${line}" | grep -q '127.0.0.1'; then
      pass "localhost bind: ${line}"
    else
      fail "public bind detected: ${line}"
    fi
  fi
done < <(ss -tlnp 2>/dev/null | grep -E ':(54321|9999|3001)' || true)

section "Production unchanged"
site_url="$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "${ROOT}/env/site.env" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r"'"'"'' || true)"
if echo "${site_url}" | grep -q 'supabase.co'; then
  pass "site.env still hosted Supabase URL"
else
  fail "site.env SUPABASE_URL unexpected"
fi

echo ""
if [[ "${FAILED}" -eq 0 ]]; then
  echo "STAGE_4B_INTERNAL_PASS"
  exit 0
else
  echo "STAGE_4B_INTERNAL_FAIL (${FAILED})"
  exit 1
fi
