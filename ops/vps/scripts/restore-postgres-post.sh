#!/usr/bin/env bash
# Post-restore: fix objects that pg_restore may skip when Supabase-specific defaults fail.
# Idempotent — safe to re-run after any restore.
set -euo pipefail

DB="${POSTGRES_DB:-scholarshiptop_prod}"
DUMP="${DUMP_PATH:-${1:-}}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SEO_HUB_BASELINE="${SEO_HUB_CONTENT_BASELINE:-919}"
PG_RESTORE="/usr/lib/postgresql/17/bin/pg_restore"

table_exists() {
  sudo -u postgres psql -d "${DB}" -tAc \
    "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='${1}' LIMIT 1;" \
    2>/dev/null | grep -q 1
}

seo_hub_count() {
  sudo -u postgres psql -d "${DB}" -tAc "SELECT count(*) FROM public.seo_hub_content;" 2>/dev/null || echo 0
}

echo "[post-restore] DB=${DB} — seo_hub_content parity check (baseline=${SEO_HUB_BASELINE})"

if ! table_exists "seo_hub_content"; then
  echo "[post-restore] seo_hub_content missing — applying VPS-compatible DDL"
  echo "[post-restore] Reason: Supabase dump uses extensions.uuid_generate_v4(); pre-restore creates"
  echo "[post-restore]   schema extensions + uuid-ossp, but some restores still skip the table."
  sudo -u postgres psql -d "${DB}" -f "${SCRIPT_DIR}/create-seo-hub-content-vps.sql"
fi

count="$(seo_hub_count)"
if [[ "${count}" != "${SEO_HUB_BASELINE}" ]]; then
  if [[ -n "${DUMP}" && -f "${DUMP}" ]]; then
    echo "[post-restore] seo_hub_content count=${count} — restoring data from dump"
    sudo -u postgres "${PG_RESTORE}" \
      --no-owner --no-acl --data-only --disable-triggers \
      --dbname="${DB}" -t seo_hub_content "${DUMP}" 2>&1 | tail -10 || true
    count="$(seo_hub_count)"
  fi
fi

if [[ "${count}" == "${SEO_HUB_BASELINE}" ]]; then
  echo "[post-restore] seo_hub_content OK (${count} rows)"
else
  echo "[post-restore] WARN seo_hub_content count=${count} expected=${SEO_HUB_BASELINE}" >&2
  exit 1
fi

echo "[post-restore] Done."
