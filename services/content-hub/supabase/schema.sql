create extension if not exists "pgcrypto";

-- Generic trigger to keep updated_at in sync on row updates.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.mark_content_topic_processing(p_topic_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.content_topics
  set
    status = 'processing',
    updated_at = now(),
    last_attempt_at = now(),
    attempt_count = coalesce(attempt_count, 0) + 1,
    last_error = null,
    last_stage = null,
    failure_class = null
  where id = p_topic_id;
end;
$$;

create table if not exists public.content_topics (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'done', 'failed')),
  priority integer not null default 100,
  last_error text,
  last_stage text,
  failure_class text,
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.content_topics(id) on delete restrict,
  title text not null,
  slug text not null unique,
  h1 text not null,
  excerpt text not null,
  body_markdown text not null,
  body_html text not null,
  meta_title text not null,
  meta_description text not null,
  primary_keyword text not null,
  secondary_keywords jsonb not null default '[]'::jsonb,
  faq_items jsonb not null default '[]'::jsonb,
  scholarship_links jsonb not null default '[]'::jsonb,
  faq_links jsonb not null default '[]'::jsonb,
  related_article_links jsonb not null default '[]'::jsonb,
  cover_image_url text,
  cover_image_path text,
  cover_image_source_url text,
  cover_image_source_type text,
  cover_image_alt text not null,
  image_width integer,
  image_height integer,
  image_mime_type text,
  image_size_bytes integer,
  schema_json jsonb not null,
  metrics_debug text,
  status text not null default 'draft'
    check (status in ('draft', 'review_needed', 'published')),
  published_at timestamptz,
  word_count integer not null,
  char_count integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful guards for generated metrics.
alter table public.content_posts
  drop constraint if exists content_posts_word_count_positive,
  add constraint content_posts_word_count_positive check (word_count >= 0),
  drop constraint if exists content_posts_char_count_positive,
  add constraint content_posts_char_count_positive check (char_count >= 0);

create index if not exists content_topics_status_priority_idx
  on public.content_topics(status, priority);

create index if not exists content_posts_topic_id_idx
  on public.content_posts(topic_id);

create index if not exists content_posts_status_published_at_idx
  on public.content_posts(status, published_at desc);

create index if not exists content_posts_slug_idx
  on public.content_posts(slug);

create index if not exists content_topics_status_attempt_idx
  on public.content_topics(status, attempt_count, updated_at);

create index if not exists content_posts_cover_image_source_url_idx
  on public.content_posts(cover_image_source_url);

drop trigger if exists set_content_topics_updated_at on public.content_topics;
create trigger set_content_topics_updated_at
before update on public.content_topics
for each row
execute function public.set_updated_at();

drop trigger if exists set_content_posts_updated_at on public.content_posts;
create trigger set_content_posts_updated_at
before update on public.content_posts
for each row
execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('content-images', 'content-images', true)
on conflict (id) do update
set public = excluded.public;

-- Storage policies for content-images bucket:
-- - public read for generated image delivery
-- - service_role full write for worker uploads/maintenance
drop policy if exists "content_images_public_read" on storage.objects;
create policy "content_images_public_read"
on storage.objects
for select
to public
using (bucket_id = 'content-images');

drop policy if exists "content_images_service_insert" on storage.objects;
create policy "content_images_service_insert"
on storage.objects
for insert
to service_role
with check (bucket_id = 'content-images');

drop policy if exists "content_images_service_update" on storage.objects;
create policy "content_images_service_update"
on storage.objects
for update
to service_role
using (bucket_id = 'content-images')
with check (bucket_id = 'content-images');

drop policy if exists "content_images_service_delete" on storage.objects;
create policy "content_images_service_delete"
on storage.objects
for delete
to service_role
using (bucket_id = 'content-images');
