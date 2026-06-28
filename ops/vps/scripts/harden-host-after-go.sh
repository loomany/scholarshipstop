#!/usr/bin/env bash
set -euo pipefail

if [[ "${CONFIRM_HOST_HARDENING:-}" != 'YES' || "${CONFIRM_KEY_LOGIN:-}" != 'YES' || "${CONFIRM_CONSOLE_ACCESS:-}" != 'YES' ]]; then
  echo '[host-hardening] REFUSED: require CONFIRM_HOST_HARDENING=YES, CONFIRM_KEY_LOGIN=YES and CONFIRM_CONSOLE_ACCESS=YES' >&2
  exit 1
fi
if [[ "$(id -u)" != "0" ]]; then
  echo '[host-hardening] ERROR: run as root' >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"${SCRIPT_DIR}/snapshot-security-config-before-go.sh"

install -d -m 0755 /etc/ssh/sshd_config.d
cat > /etc/ssh/sshd_config.d/90-scholarshiptop-hardening.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
X11Forwarding no
PermitRootLogin prohibit-password
EOF
sshd -t

find /opt/scholarshiptop/app -xdev -type d -perm -0002 -exec chmod o-w {} +

echo '[host-hardening] Prepared SSH/filesystem changes. Open a second key-only session before reloading ssh.'
echo '[host-hardening] Firewall/fail2ban/provider rules require the reviewed network runbook; not changed here.'
