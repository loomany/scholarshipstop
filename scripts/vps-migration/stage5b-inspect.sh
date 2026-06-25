#!/usr/bin/env bash
# Stage 5B - read-only cutover readiness inspection.
# Prints operational facts only. Makes NO changes, prints NO secret values.
set -uo pipefail

PARSER_BASE="${PARSER_BASE:-/opt/scholarshiptop-parsers}"
ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"

section() { echo ""; echo "=== $* ==="; }

section "RAM / swap / disk"
free -h | sed -n '1,3p'
swapon --show 2>/dev/null || echo "  (no swap)"
df -h / "${ROOT}" 2>/dev/null
df -i / 2>/dev/null | sed -n '1,2p'

section "Active parser systemd services (writers to freeze)"
systemctl list-units --type=service --all --no-pager 2>/dev/null \
  | grep -E 'scholarshiptop-parser-' | sed 's/^/  /' || echo "  (none)"

section "Parser env inventory (keys redacted, target host class only)"
if sudo test -d "${PARSER_BASE}/env"; then
  for f in "${PARSER_BASE}"/env/*.env; do
    [[ -e "${f}" ]] || continue
    name="$(basename "${f}")"
    if sudo grep -E '^SUPABASE_URL=' "${f}" 2>/dev/null | grep -q 'supabase.co'; then
      echo "  ${name}: SUPABASE_URL -> hosted supabase.co"
    elif sudo grep -qE '^SUPABASE_URL=' "${f}" 2>/dev/null; then
      echo "  ${name}: SUPABASE_URL -> non-hosted (review)"
    else
      echo "  ${name}: no SUPABASE_URL"
    fi
  done
else
  echo "  (parser env dir not found)"
fi

section "tmux / screen availability"
command -v tmux >/dev/null 2>&1 && echo "  tmux installed" || echo "  tmux MISSING"
command -v screen >/dev/null 2>&1 && echo "  screen installed" || echo "  screen MISSING"
tmux ls 2>/dev/null | sed 's/^/  session: /' || echo "  (no tmux sessions)"

section "Production public supabase API route (basic-auth inventory)"
sudo grep -nE 'location|auth_basic|proxy_pass' \
  "${ROOT}/nginx/includes/scholarshiptop-shadow-supabase-api.conf" 2>/dev/null \
  | sed 's/^/  /' || echo "  (no shadow api conf)"

section "site.env backups present"
sudo ls -la "${ROOT}/backups/" 2>/dev/null | grep -iE 'site.env' | sed 's/^/  /' || echo "  (none)"

section "Production health"
for url in https://scholarshiptop.com/ https://scholarshiptop.com/sitemap.xml; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 "${url}" 2>/dev/null || true)"
  echo "  ${url} -> ${code:0:3}"
done
