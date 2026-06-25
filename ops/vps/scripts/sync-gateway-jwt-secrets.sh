#!/usr/bin/env bash
# Force JWT_SECRET / PGRST_JWT_SECRET / GOTRUE_JWT_SECRET in supabase-api.env
# to match /root/.supabase-jwt-secret (never prints values).
set -euo pipefail

ENV_FILE="${SUPABASE_API_ENV:-/opt/scholarshiptop/env/supabase-api.env}"
JWT_FILE="${SUPABASE_JWT_SECRET_FILE:-/root/.supabase-jwt-secret}"

if [[ ! -s "${JWT_FILE}" ]]; then
  echo "[sync-gateway-jwt] ERROR: missing ${JWT_FILE}" >&2
  exit 1
fi
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "[sync-gateway-jwt] ERROR: missing ${ENV_FILE}" >&2
  exit 1
fi

sudo python3 - <<'PY'
import os
env_path = "/opt/scholarshiptop/env/supabase-api.env"
jwt_file = "/root/.supabase-jwt-secret"
secret = open(jwt_file).read().strip()
lines = open(env_path).read().splitlines()
keys = {"JWT_SECRET", "PGRST_JWT_SECRET", "GOTRUE_JWT_SECRET"}
out = []
seen = set()
for line in lines:
    if "=" not in line:
        out.append(line)
        continue
    k, _ = line.split("=", 1)
    if k in keys:
        out.append(f"{k}={secret}")
        seen.add(k)
    else:
        out.append(line)
for k in keys - seen:
    out.append(f"{k}={secret}")
open(env_path, "w").write("\n".join(out) + "\n")
os.chmod(env_path, 0o600)
print("[sync-gateway-jwt] synced JWT secret lines in", env_path)
PY
