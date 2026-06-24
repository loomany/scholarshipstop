#!/usr/bin/env bash
# Verify supabase-api.env has required keys (lengths only).
set -euo pipefail
ENV="/opt/scholarshiptop/env/supabase-api.env"
python3 - <<'PY'
import re
t = open("/opt/scholarshiptop/env/supabase-api.env").read()
for key in ["GOTRUE_JWT_SECRET", "PGRST_JWT_SECRET", "PGRST_DB_URI", "GOTRUE_DB_DATABASE_URL", "SUPABASE_ANON_KEY"]:
    m = re.search(rf"^{key}=(.*)$", t, re.M)
    val = m.group(1) if m else ""
    print(key, "len", len(val))
PY
