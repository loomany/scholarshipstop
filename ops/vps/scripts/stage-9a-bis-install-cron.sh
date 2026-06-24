#!/usr/bin/env bash
# Install seo-audit cron only (Stage 9A-bis).
set -euo pipefail
sudo install -m 644 /tmp/scholarshiptop-seo-audit /etc/cron.d/scholarshiptop-seo-audit
sudo chmod 644 /etc/cron.d/scholarshiptop-seo-audit
echo "installed /etc/cron.d/scholarshiptop-seo-audit"
sudo ls -l /etc/cron.d/scholarshiptop-seo-audit
grep -v '^#' /etc/cron.d/scholarshiptop-seo-audit | grep -v '^$' | sed 's/[[:space:]].*/ <schedule redacted>/' || true
