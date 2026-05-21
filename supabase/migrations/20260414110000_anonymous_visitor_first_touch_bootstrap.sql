-- Bootstrap: table created in 20260430132000 on hosted; earlier migrations alter it first.

create table if not exists public.anonymous_visitor_first_touch (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  landing_url text not null default '',
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now(),
  constraint anonymous_visitor_first_touch_visitor_id_key unique (visitor_id)
);

alter table public.anonymous_visitor_first_touch enable row level security;
