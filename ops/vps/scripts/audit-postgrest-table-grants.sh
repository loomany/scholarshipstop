#!/usr/bin/env bash
# Inspect anon/authenticated grants on public tables (no secrets).
set -euo pipefail
DB="${POSTGRES_DB:-scholarshiptop_prod}"
sudo -u postgres psql -d "${DB}" <<'SQL'
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee IN ('anon', 'authenticated', 'service_role')
  AND table_schema = 'public'
  AND table_name IN ('scholarships', 'profiles', 'scholarships_safe_listing', 'scholarships_listing_view')
ORDER BY table_name, grantee, privilege_type;
SQL
