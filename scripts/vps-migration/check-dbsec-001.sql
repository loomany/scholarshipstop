\set ON_ERROR_STOP on
\pset pager off

DO $$
DECLARE
  relation_count integer;
  grant_offenders text;
  rls_offenders text;
BEGIN
  SELECT count(*)
  INTO relation_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'p')
    AND n.nspname = 'public'
    AND (
      c.relname = 'schema_migrations'
      OR c.relname LIKE 'schema_migrations_gotrue_backup\_%' ESCAPE '\'
    );

  IF relation_count < 1 THEN
    RAISE EXCEPTION 'DBSEC-001: expected migration relations were not found';
  END IF;

  SELECT string_agg(
    format('%I.%I:%I:%s', table_schema, table_name, grantee, privilege_type),
    ', ' ORDER BY table_name, grantee, privilege_type
  )
  INTO grant_offenders
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND (
      table_name = 'schema_migrations'
      OR table_name LIKE 'schema_migrations_gotrue_backup\_%' ESCAPE '\'
    )
    AND grantee IN ('anon', 'authenticated')
    AND privilege_type IN (
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
    );

  IF grant_offenders IS NOT NULL THEN
    RAISE EXCEPTION 'DBSEC-001: forbidden grants remain: %', grant_offenders;
  END IF;

  SELECT string_agg(format('%I.%I', n.nspname, c.relname), ', ' ORDER BY c.relname)
  INTO rls_offenders
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'p')
    AND n.nspname = 'public'
    AND (
      c.relname = 'schema_migrations'
      OR c.relname LIKE 'schema_migrations_gotrue_backup\_%' ESCAPE '\'
    )
    AND NOT c.relrowsecurity;

  IF rls_offenders IS NOT NULL THEN
    RAISE EXCEPTION 'DBSEC-001: RLS remains disabled: %', rls_offenders;
  END IF;
END
$$;

SELECT 'DBSEC-001 PASS' AS result;
