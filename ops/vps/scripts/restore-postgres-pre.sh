#!/usr/bin/env bash
# Pre-restore: Supabase-compatible roles, extensions schema, and required extensions.
# Run before pg_restore on VPS. Does NOT touch Supabase production.
set -euo pipefail

DB="${POSTGRES_DB:-scholarshiptop_prod}"

echo "[pre-restore] DB=${DB} — roles + extensions schema"

sudo -u postgres psql -v ON_ERROR_STOP=1 -d postgres <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;
SQL

sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB}" <<'SQL'
-- Supabase stores uuid-ossp in schema "extensions" (e.g. extensions.uuid_generate_v4()).
-- Without this schema, pg_restore fails to CREATE TABLE seo_hub_content and similar objects.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
SQL

echo "[pre-restore] Done."
