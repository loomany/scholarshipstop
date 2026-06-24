#!/usr/bin/env bash
# Ensure Supabase API roles (anon/authenticated/service_role) can use PostgREST on restored VPS PG.
set -euo pipefail

DB="${POSTGRES_DB:-scholarshiptop_prod}"

sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB}" <<'SQL'
-- Schema usage (PostgREST SET ROLE anon needs USAGE on public)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT CREATE ON SCHEMA storage TO service_role;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- service_role bypasses RLS on hosted Supabase
ALTER ROLE service_role BYPASSRLS;

-- Supabase-like table/sequence/function grants (often missing after pg_restore)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Scholarships lockdown (20260625124500): anon reads safe listing only
REVOKE SELECT ON TABLE public.scholarships FROM anon, authenticated;
GRANT SELECT ON public.scholarships_safe_listing TO anon, authenticated;
GRANT SELECT ON public.scholarships_listing_view TO anon, authenticated;

-- Default privileges for future objects (Supabase-like)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
SQL

echo "[grant-postgrest-api-roles] OK on ${DB}"
