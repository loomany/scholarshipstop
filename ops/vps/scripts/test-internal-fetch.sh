#!/usr/bin/env bash
set -euo pipefail
echo "=== direct site :3000 / ==="
curl -sI -m 10 "http://127.0.0.1:3000/" | head -5
echo "=== direct site :3000 sitemap ==="
curl -sI -m 15 "http://127.0.0.1:3000/sitemap.xml" | head -8
echo "=== sample loc from sitemap ==="
curl -s -m 15 "http://127.0.0.1:3000/sitemap.xml" | head -20
