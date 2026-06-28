-- DBSEC-001: migration ledgers must never be reachable through anon/authenticated PostgREST.
begin;

revoke all privileges on table public.schema_migrations
  from anon, authenticated;
revoke all privileges on table public.schema_migrations_gotrue_backup_20260624t233812z
  from anon, authenticated;
revoke all privileges on table public.schema_migrations_gotrue_backup_20260625t063235z
  from anon, authenticated;

alter table public.schema_migrations enable row level security;
alter table public.schema_migrations_gotrue_backup_20260624t233812z enable row level security;
alter table public.schema_migrations_gotrue_backup_20260625t063235z enable row level security;

comment on table public.schema_migrations is
  'GoTrue migration ledger; DBSEC-001 denies PostgREST anon/authenticated access.';
comment on table public.schema_migrations_gotrue_backup_20260624t233812z is
  'GoTrue migration backup; DBSEC-001 denies PostgREST anon/authenticated access.';
comment on table public.schema_migrations_gotrue_backup_20260625t063235z is
  'GoTrue migration backup; DBSEC-001 denies PostgREST anon/authenticated access.';

commit;
