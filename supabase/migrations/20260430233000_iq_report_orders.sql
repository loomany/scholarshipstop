create table if not exists public.iq_report_orders (
  id uuid primary key default gen_random_uuid(),
  access_token text not null unique,
  email text not null,
  assessment_result jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'email_sent')),
  lemon_order_id text,
  lemon_checkout_email text,
  raw_payload jsonb,
  paid_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists iq_report_orders_email_idx
  on public.iq_report_orders (email);

create index if not exists iq_report_orders_status_idx
  on public.iq_report_orders (status);

alter table public.iq_report_orders enable row level security;

drop policy if exists "Service role can manage iq report orders" on public.iq_report_orders;
create policy "Service role can manage iq report orders"
  on public.iq_report_orders
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
