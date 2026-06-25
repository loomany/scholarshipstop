#!/usr/bin/env bash
# Install Supabase Dashboard JWT secret on VPS (never prints secret).
# Usage:
#   sudo bash install-supabase-jwt-secret.sh /path/to/secret-file
#   echo -n 'SECRET' | sudo bash install-supabase-jwt-secret.sh -
set -euo pipefail

OUT="${SUPABASE_JWT_SECRET_FILE:-/root/.supabase-jwt-secret}"
SRC="${1:-}"

if [[ -z "${SRC}" ]]; then
  echo "Usage: $0 <secret-file|->" >&2
  exit 1
fi

if [[ "${SRC}" == "-" ]]; then
  SECRET="$(cat)"
else
  if [[ ! -f "${SRC}" ]]; then
    echo "ERROR: file not found: ${SRC}" >&2
    exit 1
  fi
  SECRET="$(tr -d '\r\n' < "${SRC}")"
fi

if [[ -z "${SECRET}" ]]; then
  echo "ERROR: empty JWT secret" >&2
  exit 1
fi

umask 077
printf '%s\n' "${SECRET}" > "${OUT}"
chmod 600 "${OUT}"
echo "[install-jwt-secret] Wrote ${OUT} (chmod 600, value not printed)"
