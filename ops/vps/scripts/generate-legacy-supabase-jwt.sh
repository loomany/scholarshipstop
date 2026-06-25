#!/usr/bin/env bash
# Generate legacy eyJ... anon + service_role JWTs from Supabase Dashboard JWT secret.
# Does NOT print tokens. Writes /root/.supabase-legacy-anon-jwt and service file.
set -euo pipefail

JWT_FILE="${SUPABASE_JWT_SECRET_FILE:-/root/.supabase-jwt-secret}"
ANON_FILE="${SUPABASE_LEGACY_ANON_FILE:-/root/.supabase-legacy-anon-jwt}"
SERVICE_FILE="${SUPABASE_LEGACY_SERVICE_FILE:-/root/.supabase-legacy-service-jwt}"
PROJECT_REF="${SUPABASE_PROJECT_REF:-qlqlvhgosxhuibzhfsnh}"

if [[ ! -s "${JWT_FILE}" ]]; then
  echo "[generate-legacy-jwt] ERROR: ${JWT_FILE} missing — run install-supabase-jwt-secret.sh first" >&2
  exit 1
fi

export JWT_FILE ANON_FILE SERVICE_FILE PROJECT_REF
python3 - <<'PY'
import json, os, time, jwt

secret = open(os.environ["JWT_FILE"]).read().strip()
ref = os.environ["PROJECT_REF"]
now = int(time.time())
exp = now + 3600 * 24 * 365 * 10

def sign(role):
    payload = {"iss": "supabase", "ref": ref, "role": role, "iat": now, "exp": exp}
    tok = jwt.encode(payload, secret, algorithm="HS256")
    return tok if isinstance(tok, str) else tok.decode()

anon = sign("anon")
service = sign("service_role")

for path, val in ((os.environ["ANON_FILE"], anon), (os.environ["SERVICE_FILE"], service)):
    open(path, "w").write(val)
    os.chmod(path, 0o600)

print("[generate-legacy-jwt] wrote legacy anon/service JWT files (not printed)")
PY
