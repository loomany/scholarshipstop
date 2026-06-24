#!/usr/bin/env bash
# Add VPS internal fetch settings to seo-audit.env (no values printed).
set -euo pipefail
ENV_FILE=/opt/scholarshiptop/env/seo-audit.env
sudo python3 - <<'PY'
from pathlib import Path
p = Path("/opt/scholarshiptop/env/seo-audit.env")
lines = p.read_text().splitlines()
updates = {
    "JSONLD_AUDIT_BASE_URL": "https://scholarshiptop.com",
    "JSONLD_AUDIT_PUBLIC_BASE_URL": "https://scholarshiptop.com",
    "JSONLD_AUDIT_FETCH_BASE_URL": "http://127.0.0.1:3000",
    "JSONLD_AUDIT_FETCH_TIMEOUT_MS": "120000",
}
seen = set()
out = []
for line in lines:
    if "=" not in line or line.strip().startswith("#"):
        out.append(line)
        continue
    key = line.split("=", 1)[0].strip()
    if key in updates:
        out.append(f"{key}={updates[key]}")
        seen.add(key)
    else:
        out.append(line)
for key, val in updates.items():
    if key not in seen:
        out.append(f"{key}={val}")
p.write_text("\n".join(out) + "\n")
print("updated keys:", ", ".join(sorted(updates.keys())))
PY
echo "=== key names (no values) ==="
sudo python3 - <<'PY'
from pathlib import Path
for line in Path("/opt/scholarshiptop/env/seo-audit.env").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        print(line.split("=", 1)[0].strip())
PY
