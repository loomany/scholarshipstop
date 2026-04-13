-- Essay Hub: programmatic SEO guides + generation queue + scholarship link
-- Idempotent where possible (IF NOT EXISTS).

-- -----------------------------------------------------------------------------
-- essays: long-tail "how to write" guides (HTML body)
-- -----------------------------------------------------------------------------
create table if not exists public.essays (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  content_html text not null default '',
  hero_image_url text,
  sources jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  meta_description text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint essays_slug_nonempty check (btrim(slug) <> '')
);

create unique index if not exists essays_slug_unique_lower
  on public.essays (lower(btrim(slug)));

create index if not exists essays_published_created_idx
  on public.essays (is_published, created_at desc);

comment on table public.essays is 'Programmatic SEO essay guides under /essays/[slug]';

-- -----------------------------------------------------------------------------
-- scholarship_essays: many-to-many (scholarship ↔ essay)
-- -----------------------------------------------------------------------------
create table if not exists public.scholarship_essays (
  scholarship_id uuid not null references public.scholarships (id) on delete cascade,
  essay_id uuid not null references public.essays (id) on delete cascade,
  primary key (scholarship_id, essay_id)
);

create index if not exists scholarship_essays_by_essay_idx
  on public.scholarship_essays (essay_id);

-- -----------------------------------------------------------------------------
-- essay_generation_queue: sequential worker (one pending job per cron tick)
-- -----------------------------------------------------------------------------
create table if not exists public.essay_generation_queue (
  id uuid primary key default gen_random_uuid(),
  scholarship_id uuid not null references public.scholarships (id) on delete cascade,
  status text not null default 'pending',
  error_message text,
  created_essay_id uuid references public.essays (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint essay_generation_queue_status_chk
    check (status in ('pending', 'processing', 'completed', 'failed'))
);

create index if not exists essay_generation_queue_status_created_idx
  on public.essay_generation_queue (status, created_at asc);

-- -----------------------------------------------------------------------------
-- scholarships.requires_essay (essay hub signal; backfilled from essay_required)
-- -----------------------------------------------------------------------------
alter table public.scholarships
  add column if not exists requires_essay boolean not null default false;

update public.scholarships
set requires_essay = coalesce(essay_required, false)
where requires_essay is distinct from coalesce(essay_required, false);

comment on column public.scholarships.requires_essay is 'SEO Essay Hub: treat as essay-heavy listing for queue prioritization';

-- -----------------------------------------------------------------------------
-- updated_at trigger (essays)
-- -----------------------------------------------------------------------------
create or replace function public.set_essays_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists essays_set_updated_at on public.essays;
create trigger essays_set_updated_at
  before insert or update on public.essays
  for each row
  execute function public.set_essays_updated_at();

create or replace function public.set_essay_generation_queue_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists essay_generation_queue_set_updated_at on public.essay_generation_queue;
create trigger essay_generation_queue_set_updated_at
  before insert or update on public.essay_generation_queue
  for each row
  execute function public.set_essay_generation_queue_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: public read for published essays + their junction rows
-- -----------------------------------------------------------------------------
alter table public.essays enable row level security;
alter table public.scholarship_essays enable row level security;
alter table public.essay_generation_queue enable row level security;

drop policy if exists essays_select_published on public.essays;
create policy essays_select_published
  on public.essays
  for select
  using (is_published = true);

drop policy if exists scholarship_essays_select_public on public.scholarship_essays;
create policy scholarship_essays_select_public
  on public.scholarship_essays
  for select
  using (
    exists (
      select 1
      from public.essays e
      where e.id = essay_id
        and e.is_published = true
    )
  );

-- Queue: RLS enabled, no policies → anon/authenticated cannot read/write; service role bypasses RLS.
