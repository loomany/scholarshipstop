-- Stage 5E-16: session-scoped advisory lock for scholarship_detail autopilot worker.
-- Apply via `supabase db push` before enabling I18N_WORKER_REQUIRE_LOCK=1 on Railway.
-- Lock auto-releases when the DB session disconnects (process exit/crash).

create or replace function public.i18n_scholarship_autopilot_try_lock(p_run_id text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  lock_key bigint;
begin
  lock_key := hashtext('scholarship_detail_autopilot');
  return pg_try_advisory_lock(lock_key);
end;
$$;

create or replace function public.i18n_scholarship_autopilot_unlock()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  lock_key bigint;
begin
  lock_key := hashtext('scholarship_detail_autopilot');
  return pg_advisory_unlock(lock_key);
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
    from pg_locks
    where locktype = 'advisory'
      and classid = 0
      and objid = hashtext('scholarship_detail_autopilot')
      and granted = true
  );
$$;

revoke all on function public.i18n_scholarship_autopilot_try_lock(text) from public;
revoke all on function public.i18n_scholarship_autopilot_unlock() from public;
revoke all on function public.i18n_scholarship_autopilot_is_locked() from public;

grant execute on function public.i18n_scholarship_autopilot_try_lock(text) to service_role;
grant execute on function public.i18n_scholarship_autopilot_unlock() to service_role;
grant execute on function public.i18n_scholarship_autopilot_is_locked() to service_role;
