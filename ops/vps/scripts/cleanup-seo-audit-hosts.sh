#!/usr/bin/env bash
# Remove loopback hosts entry added during seo-audit migration tests (if present).
set -euo pipefail
if grep -q '^127\.0\.0\.1[[:space:]]\+scholarshiptop\.com' /etc/hosts 2>/dev/null; then
  sudo sed -i '/^127\.0\.0\.1[[:space:]]\+scholarshiptop\.com/d' /etc/hosts
  echo "removed scholarshiptop.com loopback from /etc/hosts"
else
  echo "no loopback hosts entry to remove"
fi
