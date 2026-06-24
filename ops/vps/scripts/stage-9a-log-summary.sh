#!/usr/bin/env bash
set -euo pipefail
LOG="$1"
echo "=== log file ==="
echo "$LOG"
sudo test -f "$LOG"

echo "=== tail (sanitized) ==="
sudo python3 - <<PY
import re, sys
from pathlib import Path
p = Path("$LOG")
text = p.read_text(errors="replace")
# redact likely secrets
text = re.sub(r"(?i)(bot[_-]?token|authorization|bearer)\s*[:=]\s*\S+", r"\1=[REDACTED]", text)
text = re.sub(r"\d{8,}:[A-Za-z0-9_-]{20,}", "[TELEGRAM_TOKEN_REDACTED]", text)
lines = text.splitlines()
for line in lines[-80:]:
    print(line)
print("---")
for pat in ("exit_code", "ERROR", "FAIL", "passed", "summary", "Telegram", "urls", "checked"):
    hits = [l for l in lines if pat.lower() in l.lower()]
    if hits:
        print(f"[{pat}] {hits[-1][:200]}")
PY

echo "=== reports dir ==="
ls -la /opt/scholarshiptop/logs/seo-audit* 2>/dev/null | tail -5 || true
ls -la /opt/scholarshiptop/app/reports 2>/dev/null | tail -5 || echo "no app/reports"
