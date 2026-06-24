#!/usr/bin/env bash
# Pull site env from Railway production (service: Сайт) — values NOT printed.
# Requires: railway CLI logged in, project linked.
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
ENV_FILE="${ROOT}/env/site.env"
SERVICE_NAME="${RAILWAY_SITE_SERVICE:-Сайт}"
TMP="$(mktemp)"

mkdir -p "${ROOT}/env" "${ROOT}/logs"
chmod 700 "${ROOT}/env"

echo "[pull-site-env] Fetching key/value pairs from Railway service: ${SERVICE_NAME}" >&2
railway variable list -s "${SERVICE_NAME}" --kv > "${TMP}"

# Drop Railway-injected runtime vars (not needed on VPS).
grep -v '^RAILWAY_' "${TMP}" > "${ENV_FILE}" || true
rm -f "${TMP}"

chmod 600 "${ENV_FILE}"
KEY_COUNT="$(grep -c '^[A-Za-z_][A-Za-z0-9_]*=' "${ENV_FILE}" || true)"
echo "[pull-site-env] Wrote ${ENV_FILE} (${KEY_COUNT} keys, values hidden)" >&2
