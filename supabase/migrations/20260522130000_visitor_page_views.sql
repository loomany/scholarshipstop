-- Append-only trail of page views / session leave for admin visitor card.

create table if not exists public.visitor_page_views (
  id bigint generated always as identity primary key,
  visitor_id uuid not null,
  path text not null,
  kind text not null default 'view'
    constraint visitor_page_views_kind_check check (kind in ('view', 'leave')),
  seen_at timestamptz not null default now()
);

create index if not exists visitor_page_views_visitor_seen_idx
  on public.visitor_page_views (visitor_id, seen_at desc);

alter table public.visitor_page_views enable row level security;

drop policy if exists "service_role all visitor_page_views" on public.visitor_page_views;
create policy "service_role all visitor_page_views"
  on public.visitor_page_views
  for all
  to service_role
  using (true)
  with check (true);

revoke all on public.visitor_page_views from public;
revoke all on public.visitor_page_views from anon, authenticated;
grant select, insert, delete on public.visitor_page_views to service_role;
