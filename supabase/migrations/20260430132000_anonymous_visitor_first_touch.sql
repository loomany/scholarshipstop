-- First-touch anonymous visitor analytics (dedup by visitor_id). Written only from Next.js via service role.

create table if not exists public.anonymous_visitor_first_touch (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  landing_url text not null,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now(),
  constraint anonymous_visitor_first_touch_visitor_id_key unique (visitor_id)
);

comment on table public.anonymous_visitor_first_touch is
  'One row per anonymous browser cookie (visitor_id). RLS on; app inserts via SUPABASE_SERVICE_ROLE_KEY only.';

create index if not exists anonymous_visitor_first_touch_created_at_idx
  on public.anonymous_visitor_first_touch (created_at desc);

alter table public.anonymous_visitor_first_touch enable row level security;

-- No policies for anon/authenticated: deny all. service_role JWT bypasses RLS for backend inserts.
-- Explicit policy for service_role documents intent if bypass behavior ever changes.
drop policy if exists "service_role all anonymous_visitor_first_touch" on public.anonymous_visitor_first_touch;
create policy "service_role all anonymous_visitor_first_touch"
  on public.anonymous_visitor_first_touch
  for all
  to service_role
  using (true)
  with check (true);

revoke all on public.anonymous_visitor_first_touch from public;
revoke all on public.anonymous_visitor_first_touch from anon, authenticated;

grant select, insert, update, delete on public.anonymous_visitor_first_touch to service_role;
