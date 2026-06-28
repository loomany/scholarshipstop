\set ON_ERROR_STOP on
\pset pager off
\pset format csv

\echo 'relations'
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  pg_get_userbyid(c.relowner) AS owner_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p')
  AND n.nspname = 'public'
  AND (
    c.relname = 'schema_migrations'
    OR c.relname LIKE 'schema_migrations_gotrue_backup\_%' ESCAPE '\'
  )
ORDER BY c.relname;

\echo 'grants'
SELECT
  table_schema,
  table_name,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND (
    table_name = 'schema_migrations'
    OR table_name LIKE 'schema_migrations_gotrue_backup\_%' ESCAPE '\'
  )
ORDER BY table_name, grantee, privilege_type;

\echo 'policies'
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    tablename = 'schema_migrations'
    OR tablename LIKE 'schema_migrations_gotrue_backup\_%' ESCAPE '\'
  )
ORDER BY tablename, policyname;

\echo 'dependencies'
SELECT DISTINCT
  pg_describe_object(d.classid, d.objid, d.objsubid) AS dependent_object,
  pg_describe_object(d.refclassid, d.refobjid, d.refobjsubid) AS referenced_object,
  d.deptype
FROM pg_depend d
JOIN pg_class c ON c.oid = d.refobjid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE d.refclassid = 'pg_class'::regclass
  AND n.nspname = 'public'
  AND (
    c.relname = 'schema_migrations'
    OR c.relname LIKE 'schema_migrations_gotrue_backup\_%' ESCAPE '\'
  )
ORDER BY referenced_object, dependent_object;
