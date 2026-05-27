alter table public.i18n_scholarship_worker_lock enable row level security;

revoke all on table public.i18n_scholarship_worker_lock from anon;
revoke all on table public.i18n_scholarship_worker_lock from authenticated;

-- No anon/authenticated policies intentionally.
-- service_role bypasses RLS.
-- Existing SECURITY DEFINER RPC/service-role worker path should continue working.
