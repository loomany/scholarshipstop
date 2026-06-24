#!/usr/bin/env bash
# Key names only — never prints values.
set -euo pipefail
ENV_DIR=/opt/scholarshiptop/env
for f in "$ENV_DIR"/*.env; do
  echo "== $(basename "$f") =="
  awk -F= 'NF && $1 !~ /^#/ {print $1}' "$f" | sort
  echo "keycount=$(awk -F= 'NF && $1 !~ /^#/ {c++} END{print c+0}' "$f")"
done
echo "---docker---"
docker ps --format '{{.Names}}'
