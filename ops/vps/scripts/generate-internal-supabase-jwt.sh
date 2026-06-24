#!/usr/bin/env bash
# Generate internal-only JWT secret + legacy-format anon/service JWTs for Stage 4B smoke.
# Does NOT replace production sb_publishable keys in site.env.
set -euo pipefail

OUT_DIR="${1:-/root}"
JWT_FILE="${OUT_DIR}/.supabase-jwt-secret-internal"
ANON_FILE="${OUT_DIR}/.supabase-legacy-anon-jwt-internal"
SERVICE_FILE="${OUT_DIR}/.supabase-legacy-service-jwt-internal"
export JWT_FILE ANON_FILE SERVICE_FILE
PROJECT_REF="${SUPABASE_PROJECT_REF:-qlqlvhgosxhuibzhfsnh}"
export PROJECT_REF

python3 - <<'PY'
import json, os, secrets, time, jwt

ref = os.environ["PROJECT_REF"]
secret = secrets.token_urlsafe(48)
now = int(time.time())
exp = now + 3600 * 24 * 365 * 10

def sign(role):
    payload = {"iss": "supabase", "ref": ref, "role": role, "iat": now, "exp": exp}
    return jwt.encode(payload, secret, algorithm="HS256")

anon = sign("anon")
service = sign("service_role")

open(os.environ["JWT_FILE"], "w").write(secret)
open(os.environ["ANON_FILE"], "w").write(anon if isinstance(anon, str) else anon.decode())
open(os.environ["SERVICE_FILE"], "w").write(service if isinstance(service, str) else service.decode())
os.chmod(os.environ["JWT_FILE"], 0o600)
os.chmod(os.environ["ANON_FILE"], 0o600)
os.chmod(os.environ["SERVICE_FILE"], 0o600)
print("[generate-internal-jwt] wrote internal JWT files (not production keys)")
PY
