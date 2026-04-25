alter table public.visitor_page_views
  add column if not exists full_url text;

alter table public.visitor_page_views
  add column if not exists event_source text not null default 'navigation'
    constraint visitor_page_views_event_source_check
      check (event_source in ('navigation', 'heartbeat', 'visibility', 'leave'));

create index if not exists visitor_page_views_visitor_source_seen_idx
  on public.visitor_page_views (visitor_id, event_source, seen_at desc);
