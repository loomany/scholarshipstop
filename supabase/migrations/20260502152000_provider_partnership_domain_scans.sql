create table if not exists public.provider_partnership_domain_scans (
  domain text primary key,
  last_run_id uuid null references public.provider_partnership_scan_runs (id) on delete set null,
  scanned_at timestamptz not null,
  success boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists provider_partnership_domain_scans_scanned_idx
  on public.provider_partnership_domain_scans (scanned_at desc);

alter table public.provider_partnership_domain_scans enable row level security;
revoke all on public.provider_partnership_domain_scans from anon;
revoke all on public.provider_partnership_domain_scans from authenticated;
