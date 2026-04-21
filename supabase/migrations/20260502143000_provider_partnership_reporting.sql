create table if not exists public.provider_partnership_scan_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  input_domain_count integer not null default 0,
  scanned_domain_count integer not null default 0,
  unique_emails_count integer not null default 0,
  partner_domain_count integer not null default 0,
  status text not null default 'ok' check (status in ('ok', 'failed')),
  error_message text null,
  report_json_path text null,
  report_csv_path text null,
  live_log_path text null,
  created_at timestamptz not null default now()
);

create index if not exists provider_partnership_scan_runs_finished_idx
  on public.provider_partnership_scan_runs (finished_at desc);

create table if not exists public.provider_partnership_contacts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid null references public.provider_partnership_scan_runs (id) on delete set null,
  contact_key text not null unique,
  domain text not null,
  email text null,
  partner_url text null,
  evidence_url text null,
  confidence_score integer not null default 0,
  has_partnership_signal boolean not null default false,
  scanned_at timestamptz not null,
  updated_at timestamptz not null default now(),
  check (email is not null or partner_url is not null)
);

create index if not exists provider_partnership_contacts_domain_idx
  on public.provider_partnership_contacts (domain);

create index if not exists provider_partnership_contacts_email_idx
  on public.provider_partnership_contacts (email)
  where email is not null;

create index if not exists provider_partnership_contacts_partner_url_idx
  on public.provider_partnership_contacts (partner_url)
  where partner_url is not null;

create index if not exists provider_partnership_contacts_run_idx
  on public.provider_partnership_contacts (run_id);

alter table public.provider_partnership_scan_runs enable row level security;
alter table public.provider_partnership_contacts enable row level security;

revoke all on public.provider_partnership_scan_runs from anon;
revoke all on public.provider_partnership_scan_runs from authenticated;
revoke all on public.provider_partnership_contacts from anon;
revoke all on public.provider_partnership_contacts from authenticated;
