-- AI SEO meta-description cache and async generation queue.

create table if not exists public.seo_meta_cache (
  id uuid primary key default gen_random_uuid(),
  canonical_path text not null,
  route_kind text not null,
  prompt_hash text not null,
  meta_description text,
  status text not null default 'pending'
    constraint seo_meta_cache_status_check
      check (status in ('pending', 'ready', 'failed')),
  model text,
  source text not null default 'ai'
    constraint seo_meta_cache_source_check
      check (source in ('ai', 'fallback')),
  error_message text,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seo_meta_cache_canonical_path_unique unique (canonical_path)
);

create index if not exists seo_meta_cache_status_updated_idx
  on public.seo_meta_cache (status, updated_at desc);

create index if not exists seo_meta_cache_route_kind_idx
  on public.seo_meta_cache (route_kind, updated_at desc);

comment on table public.seo_meta_cache is
  'Cached AI-generated meta descriptions by canonical route path.';

alter table public.seo_meta_cache enable row level security;

drop policy if exists seo_meta_cache_select_public on public.seo_meta_cache;
create policy seo_meta_cache_select_public
  on public.seo_meta_cache
  for select
  to anon, authenticated
  using (true);

create table if not exists public.seo_meta_generation_queue (
  id uuid primary key default gen_random_uuid(),
  canonical_path text not null,
  route_kind text not null,
  prompt_hash text not null,
  fallback_description text not null,
  context_json jsonb not null default '{}'::jsonb,
  priority integer not null default 0,
  status text not null default 'pending'
    constraint seo_meta_generation_queue_status_check
      check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  next_retry_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint seo_meta_generation_queue_canonical_path_unique unique (canonical_path)
);

create index if not exists seo_meta_generation_queue_run_idx
  on public.seo_meta_generation_queue (status, next_retry_at, priority desc, created_at asc);

comment on table public.seo_meta_generation_queue is
  'Async queue for AI meta description generation.';

alter table public.seo_meta_generation_queue enable row level security;

create or replace function public.set_seo_meta_cache_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists seo_meta_cache_set_updated_at on public.seo_meta_cache;
create trigger seo_meta_cache_set_updated_at
  before insert or update on public.seo_meta_cache
  for each row
  execute function public.set_seo_meta_cache_updated_at();

create or replace function public.set_seo_meta_generation_queue_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.status = 'failed' then
    if new.attempts < new.max_attempts then
      new.status = 'pending';
      new.next_retry_at = now() + make_interval(mins => least(60, greatest(5, new.attempts * 5)));
    end if;
  end if;
  if new.status = 'completed' and new.completed_at is null then
    new.completed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists seo_meta_generation_queue_set_updated_at on public.seo_meta_generation_queue;
create trigger seo_meta_generation_queue_set_updated_at
  before insert or update on public.seo_meta_generation_queue
  for each row
  execute function public.set_seo_meta_generation_queue_updated_at();
