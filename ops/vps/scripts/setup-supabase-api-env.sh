#!/usr/bin/env bash
# Stage 4B — Build /opt/scholarshiptop/env/supabase-api.env from VPS secrets (never prints values).
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
OUT="${ROOT}/env/supabase-api.env"
SITE_ENV="${ROOT}/env/site.env"
PG_ENV="${ROOT}/env/postgres.env"
JWT_FILE="${SUPABASE_JWT_SECRET_FILE:-/root/.supabase-jwt-secret}"
INTERNAL_JWT_FILE="/root/.supabase-jwt-secret-internal"
INTERNAL_ANON_FILE="/root/.supabase-legacy-anon-jwt-internal"
INTERNAL_SERVICE_FILE="/root/.supabase-legacy-service-jwt-internal"
JWT_MODE="production"
INIT_SECRET="/root/.scholarshiptop-db-init"
EXAMPLE="${ROOT}/app/ops/env/supabase-api.env.example"

echo "[setup-supabase-api-env] Building ${OUT} (values not printed)"

# --- JWT secret (required) ---
if [[ -f "${JWT_FILE}" ]]; then
  JWT_SECRET="$(tr -d '\r\n' < "${JWT_FILE}")"
  JWT_MODE="production"
elif [[ -f "${INTERNAL_JWT_FILE}" ]]; then
  JWT_SECRET="$(tr -d '\r\n' < "${INTERNAL_JWT_FILE}")"
  JWT_MODE="internal"
elif [[ -n "${JWT_SECRET:-}" ]]; then
  JWT_MODE="production"
else
  echo "[setup-supabase-api-env] ERROR: JWT secret missing." >&2
  echo "  Production: ${JWT_FILE} (Supabase Dashboard → API → JWT Secret)" >&2
  echo "  Internal smoke: run generate-internal-supabase-jwt.sh first" >&2
  exit 1
fi

# Verify JWT secret matches production legacy anon key when in production mode
if [[ "${JWT_MODE}" == "production" && -f "${SITE_ENV}" ]]; then
  ANON_CHECK="$(grep -E '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "${SITE_ENV}" | head -1 | cut -d= -f2- | tr -d '\r"'"'"'' || true)"
  if [[ "${ANON_CHECK}" == sb_publishable_* ]]; then
    echo "[setup-supabase-api-env] NOTE: site.env uses sb_publishable key — use legacy anon JWT for PostgREST smoke" >&2
    LEGACY_ANON_FILE="/root/.supabase-legacy-anon-jwt"
    if [[ -f "${LEGACY_ANON_FILE}" ]]; then
      ANON_CHECK="$(tr -d '\r\n' < "${LEGACY_ANON_FILE}")"
    else
      ANON_CHECK=""
    fi
  fi
  if [[ -n "${ANON_CHECK}" && "${ANON_CHECK}" == eyJ* ]]; then
    export SECRET="${JWT_SECRET}" ANON="${ANON_CHECK}"
    if ! python3 - <<'PY'
import os, sys, jwt
secret = os.environ["SECRET"]
anon = os.environ["ANON"]
try:
    jwt.decode(anon, secret, algorithms=["HS256"], options={"verify_aud": False, "verify_exp": False})
except Exception:
    sys.exit(1)
PY
    then
      echo "[setup-supabase-api-env] ERROR: JWT secret does not verify production anon key" >&2
      exit 1
    fi
    echo "[setup-supabase-api-env] JWT secret verified against legacy anon JWT"
  fi
elif [[ "${JWT_MODE}" == "internal" ]]; then
  echo "[setup-supabase-api-env] Internal JWT mode (not production token compatibility)"
fi

# --- Postgres URLs for Docker → host PG ---
if [[ -f "${PG_ENV}" ]]; then
  # shellcheck disable=SC1090
  source "${PG_ENV}"
fi
if [[ -f "${INIT_SECRET}" ]]; then
  # shellcheck disable=SC1090
  source "${INIT_SECRET}"
fi

POSTGRES_DB="${POSTGRES_DB:-scholarshiptop_prod}"
POSTGRES_USER="${POSTGRES_USER:-scholarshiptop_app}"
POSTGRES_APP_PASSWORD="${POSTGRES_APP_PASSWORD:-}"

if [[ -z "${POSTGRES_APP_PASSWORD}" && -n "${DATABASE_URL:-}" ]]; then
  # Parse password from DATABASE_URL without printing
  POSTGRES_APP_PASSWORD="$(python3 - <<'PY'
import os, urllib.parse
u = urllib.parse.urlparse(os.environ.get("DATABASE_URL",""))
print(u.password or "")
PY
)"
fi

if [[ -z "${POSTGRES_APP_PASSWORD}" ]]; then
  echo "[setup-supabase-api-env] ERROR: cannot resolve Postgres password" >&2
  exit 1
fi

# PostgREST connects as authenticator (Supabase standard) — run setup-postgrest-authenticator.sh first
AUTH_PASS_FILE="/root/.postgrest-authenticator-pass"
if [[ ! -f "${AUTH_PASS_FILE}" ]]; then
  echo "[setup-supabase-api-env] ERROR: run setup-postgrest-authenticator.sh first" >&2
  exit 1
fi
AUTH_PASS="$(tr -d '\r\n' < "${AUTH_PASS_FILE}")"
POSTGREST_DB_URL="postgresql://authenticator:${AUTH_PASS}@${POSTGRES_HOST:-host.docker.internal}:5432/${POSTGRES_DB}"

# Allow local peer auth for postgres user from host — use password from init if postgres has one
# On Ubuntu PG, postgres often uses peer auth locally; for Docker we need password auth.
# Create/read dedicated password file if exists
PG_SUPER_PASS_FILE="/root/.postgres-superuser-pass"
if [[ -f "${PG_SUPER_PASS_FILE}" ]]; then
  PG_SUPER_PASS="$(tr -d '\r\n' < "${PG_SUPER_PASS_FILE}")"
  GOTRUE_DB_URL="postgresql://postgres:${PG_SUPER_PASS}@${POSTGRES_HOST:-host.docker.internal}:5432/${POSTGRES_DB}?options=-c%20search_path%3Dauth"
else
  # Try trust via host — set postgres password for docker access
  echo "[setup-supabase-api-env] Setting postgres password for Docker access (stored ${PG_SUPER_PASS_FILE})"
  PG_SUPER_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d postgres -c "ALTER USER postgres PASSWORD '${PG_SUPER_PASS}';"
  umask 077
  printf '%s\n' "${PG_SUPER_PASS}" > "${PG_SUPER_PASS_FILE}"
  chmod 600 "${PG_SUPER_PASS_FILE}"
  GOTRUE_DB_URL="postgresql://postgres:${PG_SUPER_PASS}@${POSTGRES_HOST:-host.docker.internal}:5432/${POSTGRES_DB}?options=-c%20search_path%3Dauth"
fi

# Ensure pg_hba allows password auth from Docker bridge
PG_HBA="$(find /etc/postgresql -name pg_hba.conf 2>/dev/null | head -1)"
if [[ -n "${PG_HBA}" ]] && ! grep -q '172\.16\.0\.0/12' "${PG_HBA}" 2>/dev/null; then
  echo "[setup-supabase-api-env] Adding Docker bridge to pg_hba (local only)"
  echo "host    all    all    172.16.0.0/12    scram-sha-256" >> "${PG_HBA}"
  systemctl reload postgresql || true
fi

# Allow Docker bridge to reach Postgres (still blocked from public internet by firewall)
PG_CONF="$(find /etc/postgresql -name postgresql.conf 2>/dev/null | head -1)"
if [[ -n "${PG_CONF}" ]] && ! grep -q "^listen_addresses = '\*'" "${PG_CONF}" 2>/dev/null; then
  if grep -q "^listen_addresses" "${PG_CONF}"; then
    sed -i "s/^listen_addresses.*/listen_addresses = '*'/" "${PG_CONF}"
  else
    echo "listen_addresses = '*'" >> "${PG_CONF}"
  fi
  systemctl restart postgresql || true
  echo "[setup-supabase-api-env] Postgres restarted (listen_addresses=*)"
fi

# --- Keys from site.env ---
if [[ "${JWT_MODE}" == "internal" ]]; then
  ANON_KEY="$(tr -d '\r\n' < "${INTERNAL_ANON_FILE}")"
  SERVICE_KEY="$(tr -d '\r\n' < "${INTERNAL_SERVICE_FILE}")"
elif [[ -f "${SITE_ENV}" ]]; then
  ANON_KEY="$(grep -E '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "${SITE_ENV}" | head -1 | cut -d= -f2- | tr -d '\r"'"'"'' || true)"
  SERVICE_KEY="$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' "${SITE_ENV}" | head -1 | cut -d= -f2- | tr -d '\r"'"'"'' || true)"
  if [[ "${ANON_KEY}" == sb_publishable_* && -f /root/.supabase-legacy-anon-jwt ]]; then
    ANON_KEY="$(tr -d '\r\n' < /root/.supabase-legacy-anon-jwt)"
  fi
  if [[ "${SERVICE_KEY}" == sb_secret_* && -f /root/.supabase-legacy-service-jwt ]]; then
    SERVICE_KEY="$(tr -d '\r\n' < /root/.supabase-legacy-service-jwt)"
  fi
fi
GOOGLE_ID=""
GOOGLE_SECRET=""
if [[ -f "${SITE_ENV}" ]]; then
  GOOGLE_ID="$(grep -E '^GOOGLE_CLIENT_ID=' "${SITE_ENV}" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r"'"'"'' || true)"
  GOOGLE_SECRET="$(grep -E '^GOOGLE_CLIENT_SECRET=' "${SITE_ENV}" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r"'"'"'' || true)"
fi
GOOGLE_ENABLED=false
if [[ -n "${GOOGLE_ID}" && -n "${GOOGLE_SECRET}" ]]; then
  GOOGLE_ENABLED=true
fi

if [[ -z "${ANON_KEY}" ]]; then
  echo "[setup-supabase-api-env] WARN: NEXT_PUBLIC_SUPABASE_ANON_KEY not found in site.env" >&2
fi

umask 077
cat > "${OUT}" <<EOF
# Generated by setup-supabase-api-env.sh — DO NOT COMMIT
GOTRUE_DB_DATABASE_URL=${GOTRUE_DB_URL}
GOTRUE_DB_DRIVER=postgres
GOTRUE_DB_AUTOMIGRATE=false
GOTRUE_API_HOST=0.0.0.0
GOTRUE_API_PORT=9999
PORT=9999
API_EXTERNAL_URL=https://scholarshiptop.com/supabase/auth/v1
PGRST_DB_URI=${POSTGREST_DB_URL}
JWT_SECRET=${JWT_SECRET}
GOTRUE_JWT_SECRET=${JWT_SECRET}
PGRST_JWT_SECRET=${JWT_SECRET}
GOTRUE_SITE_URL=https://scholarshiptop.com
GOTRUE_URI_ALLOW_LIST=https://scholarshiptop.com,https://www.scholarshiptop.com,http://127.0.0.1:54321,http://127.0.0.1:3100,http://127.0.0.1:3101
GOTRUE_DISABLE_SIGNUP=false
GOTRUE_JWT_EXP=3600
GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated
GOTRUE_EXTERNAL_EMAIL_ENABLED=true
GOTRUE_MAILER_AUTOCONFIRM=true
GOTRUE_EXTERNAL_GOOGLE_ENABLED=${GOOGLE_ENABLED}
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=${GOOGLE_ID}
GOTRUE_EXTERNAL_GOOGLE_SECRET=${GOOGLE_SECRET}
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://scholarshiptop.com/supabase/auth/v1/callback
POSTGREST_DB_SCHEMAS=public,storage
PGRST_DB_SCHEMAS=public,storage
POSTGREST_DB_ANON_ROLE=anon
PGRST_DB_ANON_ROLE=anon
POSTGREST_DB_EXTRA_SEARCH_PATH=public,extensions
PGRST_DB_EXTRA_SEARCH_PATH=public,extensions
PGRST_OPENAPI_SERVER_PROXY_URI=http://127.0.0.1:54321
SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}
SELFHOST_API_BASE_URL=http://127.0.0.1:54321
DB_PROVIDER=supabase
JWT_MODE=${JWT_MODE}
EOF

chmod 600 "${OUT}"
echo "[setup-supabase-api-env] Wrote ${OUT} (chmod 600) mode=${JWT_MODE}"
echo "[setup-supabase-api-env] Keys present: anon=$([[ -n "${ANON_KEY}" ]] && echo yes || echo no) service=$([[ -n "${SERVICE_KEY}" ]] && echo yes || echo no)"
