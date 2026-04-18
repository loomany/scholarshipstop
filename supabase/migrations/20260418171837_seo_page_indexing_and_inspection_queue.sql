alter table public.google_indexing_queue
  drop constraint if exists google_indexing_queue_content_kind_check;

alter table public.google_indexing_queue
  add constraint google_indexing_queue_content_kind_check
    check (
      content_kind is null
      or content_kind in ('scholarship', 'resource', 'provider', 'essay', 'page')
    );

create table if not exists public.seo_page_inspection_queue (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  source text,
  status text not null default 'pending'
    constraint seo_page_inspection_queue_status_check
      check (status in ('pending', 'indexed', 'failed')),
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  next_check_at timestamptz not null default now(),
  last_checked_at timestamptz,
  attempt_count integer not null default 0,
  last_verdict text,
  last_coverage_state text,
  last_error text,
  constraint seo_page_inspection_queue_url_key unique (url)
);

create index if not exists seo_page_inspection_queue_status_next_check_idx
  on public.seo_page_inspection_queue (status, next_check_at, added_at)
  where status = 'pending';

comment on table public.seo_page_inspection_queue is
  'Persistent Search Console URL Inspection queue for generated SEO pages such as hubs and versus pages.';

create or replace function public.seo_page_inspection_queue_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists seo_page_inspection_queue_set_updated_at
  on public.seo_page_inspection_queue;

create trigger seo_page_inspection_queue_set_updated_at
  before update on public.seo_page_inspection_queue
  for each row
  execute function public.seo_page_inspection_queue_set_updated_at();

alter table public.seo_page_inspection_queue enable row level security;
