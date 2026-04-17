-- Programmatic SEO factory: generation queue + hub meta columns + sitemap RPC.

alter table public.seo_hub_content
  add column if not exists h1 text,
  add column if not exists meta_description text;

comment on column public.seo_hub_content.h1 is 'Optional display H1 / title line for hub (may mirror title).';
comment on column public.seo_hub_content.meta_description is 'Meta description for layout when no static SEO JSON bundle exists.';

create table if not exists public.seo_generation_queue (
  id uuid primary key default gen_random_uuid(),
  canonical_path text not null,
  filters jsonb not null default '{}'::jsonb,
  priority integer not null default 0,
  status text not null default 'pending'
    constraint seo_generation_queue_status_check
      check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  grant_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seo_generation_queue_canonical_path_unique unique (canonical_path)
);

create index if not exists seo_generation_queue_status_priority_idx
  on public.seo_generation_queue (status, priority desc, created_at asc);

comment on table public.seo_generation_queue is
  'OpenAI SEO hub generation queue (US state × subject × degree paths).';

create or replace function public.set_seo_generation_queue_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists seo_generation_queue_set_updated_at on public.seo_generation_queue;
create trigger seo_generation_queue_set_updated_at
  before insert or update on public.seo_generation_queue
  for each row
  execute function public.set_seo_generation_queue_updated_at();

alter table public.seo_generation_queue enable row level security;

-- Completed hub paths eligible for sitemap (min grant count); callable by anon for sitemap build only.
create or replace function public.seo_generation_sitemap_paths(p_min_grants integer default 3)
returns table (canonical_path text, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select q.canonical_path, q.updated_at
  from public.seo_generation_queue q
  where q.status = 'completed'
    and coalesce(q.grant_count, 0) > p_min_grants;
$$;

comment on function public.seo_generation_sitemap_paths(integer) is
  'Public-safe list of generated hub paths for XML sitemap (queue orchestration).';

grant execute on function public.seo_generation_sitemap_paths(integer) to anon, authenticated;
