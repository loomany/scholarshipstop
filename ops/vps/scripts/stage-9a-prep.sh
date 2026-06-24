#!/usr/bin/env bash
set -euo pipefail
sudo mkdir -p /opt/scholarshiptop/scripts
sudo install -m 755 /tmp/run-seo-audit-once.sh /opt/scholarshiptop/scripts/run-seo-audit-once.sh

echo "=== env file ==="
sudo test -f /opt/scholarshiptop/env/seo-audit.env && echo "seo-audit.env: present"

echo "=== key names (no values) ==="
sudo python3 - <<'PY'
from pathlib import Path
p = Path("/opt/scholarshiptop/env/seo-audit.env")
keys = []
for line in p.read_text().splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    keys.append(line.split("=", 1)[0].strip())
print("count:", len(keys))
for k in sorted(keys):
    print(k)
PY

echo "=== ensure JSONLD_AUDIT_BASE_URL (production) ==="
sudo python3 - <<'PY'
from pathlib import Path
p = Path("/opt/scholarshiptop/env/seo-audit.env")
lines = p.read_text().splitlines()
out = []
found = False
for line in lines:
    if line.startswith("JSONLD_AUDIT_BASE_URL="):
        out.append("JSONLD_AUDIT_BASE_URL=https://scholarshiptop.com")
        found = True
    else:
        out.append(line)
if not found:
    out.append("JSONLD_AUDIT_BASE_URL=https://scholarshiptop.com")
p.write_text("\n".join(out) + "\n")
print("JSONLD_AUDIT_BASE_URL set to production host (value not printed)")
PY

echo "=== docker ps ==="
sudo docker ps --format 'table {{.Names}}\t{{.Status}}'

echo "=== audit script ==="
test -f /opt/scholarshiptop/app/scripts/audit-jsonld-sitemap.ts && echo "audit-jsonld-sitemap.ts: present"

echo "=== node ==="
node --version
