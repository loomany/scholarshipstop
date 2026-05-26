-- Stage 5E-18: persistent scholarship_detail autopilot worker progress (resume-safe).

create table if not exists public.i18n_scholarship_worker_progress (
  lock_key text primary key,
  active_run_id text,
  requested_start_wave integer,
  current_wave integer,
  last_accepted_wave integer,
  next_wave integer,
  target_requested integer,
  target_completed integer not null default 0,
  wave_size integer,
  last_sitemap_es integer,
  last_sitemap_fr integer,
  status text not null default 'idle'
    check (status in ('idle', 'running', 'failed', 'completed')),
  last_error text,
  heartbeat_at timestamptz,
  updated_at timestamptz not null default now()
);

revoke all on table public.i18n_scholarship_worker_progress from public;
grant select, insert, update, delete on table public.i18n_scholarship_worker_progress to service_role;

create index if not exists i18n_scholarship_worker_progress_status_idx
  on public.i18n_scholarship_worker_progress (status, updated_at desc);
