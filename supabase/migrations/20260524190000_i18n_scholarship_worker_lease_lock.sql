-- Stage 5E-17: replace session advisory lock with lease row lock (Supabase RPC pool-safe).

create table if not exists public.i18n_scholarship_worker_lock (
  lock_key text primary key,
  run_id text not null,
  locked_at timestamptz not null default now(),
  expires_at timestamptz not null
);

revoke all on table public.i18n_scholarship_worker_lock from public;
grant select, insert, update, delete on table public.i18n_scholarship_worker_lock to service_role;

create or replace function public.i18n_scholarship_autopilot_try_lock(p_run_id text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ttl_minutes integer := coalesce(nullif(current_setting('app.i18n_worker_lock_ttl_minutes', true), '')::integer, 720);
  acquired boolean := false;
begin
  insert into public.i18n_scholarship_worker_lock (lock_key, run_id, locked_at, expires_at)
  values (
    'scholarship_detail_autopilot',
    coalesce(nullif(trim(p_run_id), ''), 'unknown'),
    now(),
    now() + make_interval(mins => ttl_minutes)
  )
  on conflict (lock_key) do update
    set run_id = excluded.run_id,
        locked_at = now(),
        expires_at = excluded.expires_at
    where public.i18n_scholarship_worker_lock.expires_at < now();

  select l.run_id = coalesce(nullif(trim(p_run_id), ''), 'unknown')
    into acquired
  from public.i18n_scholarship_worker_lock l
  where l.lock_key = 'scholarship_detail_autopilot'
    and l.expires_at >= now();

  return coalesce(acquired, false);
end;
$$;

create or replace function public.i18n_scholarship_autopilot_unlock()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  removed boolean := false;
begin
  delete from public.i18n_scholarship_worker_lock
  where lock_key = 'scholarship_detail_autopilot';
  removed := found;
  return removed;
end;
$$;

create or replace function public.i18n_scholarship_autopilot_unlock_run(p_run_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  removed boolean := false;
begin
  delete from public.i18n_scholarship_worker_lock
  where lock_key = 'scholarship_detail_autopilot'
    and run_id = coalesce(nullif(trim(p_run_id), ''), 'unknown');
  removed := found;
  return removed;
end;
$$;

create or replace function public.i18n_scholarship_autopilot_is_locked()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.i18n_scholarship_worker_lock l
    where l.lock_key = 'scholarship_detail_autopilot'
      and l.expires_at >= now()
  );
$$;

revoke all on function public.i18n_scholarship_autopilot_try_lock(text) from public;
revoke all on function public.i18n_scholarship_autopilot_unlock() from public;
revoke all on function public.i18n_scholarship_autopilot_unlock_run(text) from public;
revoke all on function public.i18n_scholarship_autopilot_is_locked() from public;

grant execute on function public.i18n_scholarship_autopilot_try_lock(text) to service_role;
grant execute on function public.i18n_scholarship_autopilot_unlock() to service_role;
grant execute on function public.i18n_scholarship_autopilot_unlock_run(text) to service_role;
grant execute on function public.i18n_scholarship_autopilot_is_locked() to service_role;
