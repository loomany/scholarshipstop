#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" != "0" ]]; then
  echo '[security-snapshot] ERROR: run as root' >&2
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${SECURITY_SNAPSHOT_DIR:-/root/scholarshiptop-security-snapshots}/${STAMP}"
mkdir -p "${OUT}"
chmod 700 "$(dirname "${OUT}")" "${OUT}"

cp -a /opt/scholarshiptop/nginx "${OUT}/nginx" 2>/dev/null || true
cp -a /etc/ssh/sshd_config "${OUT}/sshd_config" 2>/dev/null || true
cp -a /etc/ssh/sshd_config.d "${OUT}/sshd_config.d" 2>/dev/null || true
cp -a /etc/postgresql/17/main/postgresql.conf "${OUT}/postgresql.conf" 2>/dev/null || true
cp -a /etc/postgresql/17/main/pg_hba.conf "${OUT}/pg_hba.conf" 2>/dev/null || true
ufw status verbose > "${OUT}/ufw-status.txt" 2>&1 || true
iptables-save > "${OUT}/iptables.rules" 2>/dev/null || true
nft list ruleset > "${OUT}/nft.rules" 2>/dev/null || true
sshd -T > "${OUT}/sshd-effective.txt" 2>/dev/null || true
ss -lntp > "${OUT}/listeners.txt" 2>/dev/null || true

find "${OUT}" -type f -exec chmod 600 {} +
echo "[security-snapshot] OK path=${OUT}"
