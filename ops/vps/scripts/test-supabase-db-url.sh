#!/usr/bin/env bash
set -euo pipefail
URL="$(sudo cat /root/.supabase-db-url)"
/usr/lib/postgresql/17/bin/psql "$URL" -tAc "SELECT count(*) FROM public.seo_hub_content;"
