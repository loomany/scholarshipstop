alter table public.essays
  add column if not exists hub_category_slug text,
  add column if not exists hub_category_label text,
  add column if not exists hub_distribution_group text,
  add column if not exists hub_distribution_rank integer,
  add column if not exists manual_topic text;

create index if not exists essays_hub_category_idx
  on public.essays(hub_category_slug)
  where is_published = true;

create index if not exists essays_hub_distribution_idx
  on public.essays(hub_distribution_group, hub_distribution_rank)
  where is_published = true;

create table if not exists public.manual_essay_generation_queue (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  slug text,
  hub_category_slug text not null default 'international-students',
  hub_category_label text not null default 'International students',
  hub_distribution_group text not null default 'international-students',
  hub_distribution_rank integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  created_essay_id uuid references public.essays(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint manual_essay_generation_queue_topic_nonempty check (btrim(topic) <> '')
);

create unique index if not exists manual_essay_generation_queue_topic_unique_lower
  on public.manual_essay_generation_queue(lower(btrim(topic)));

create index if not exists manual_essay_generation_queue_status_rank_idx
  on public.manual_essay_generation_queue(status, hub_distribution_rank asc, created_at asc);

create or replace function public.set_manual_essay_generation_queue_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists manual_essay_generation_queue_set_updated_at
  on public.manual_essay_generation_queue;
create trigger manual_essay_generation_queue_set_updated_at
  before insert or update on public.manual_essay_generation_queue
  for each row
  execute function public.set_manual_essay_generation_queue_updated_at();

alter table public.manual_essay_generation_queue enable row level security;

-- Queue is service-role only; no anon/authenticated policies.
