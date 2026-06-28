-- Emergency rollback for DBSEC-001. Applying this reopens the audited public privileges.
begin;

alter table public.schema_migrations disable row level security;
alter table public.schema_migrations_gotrue_backup_20260624t233812z disable row level security;
alter table public.schema_migrations_gotrue_backup_20260625t063235z disable row level security;

grant select, insert, update, delete on table public.schema_migrations
  to anon, authenticated;
grant all privileges on table public.schema_migrations_gotrue_backup_20260624t233812z
  to anon, authenticated;
grant all privileges on table public.schema_migrations_gotrue_backup_20260625t063235z
  to anon, authenticated;

commit;
