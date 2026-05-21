-- Local/CI bootstrap: content hub tables exist on hosted DB but were never added to migration history.
-- Safe on hosted: CREATE TABLE IF NOT EXISTS only.

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
  topic_id uuid not null references public.content_topics (id) on delete restrict,
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
  cover_image_alt text not null default '',
  image_width integer,
  image_height integer,
  image_mime_type text,
  image_size_bytes integer,
  schema_json jsonb not null default '{}'::jsonb,
  metrics_debug text,
  status text not null default 'draft'
    check (status in ('draft', 'review_needed', 'published')),
  published_at timestamptz,
  word_count integer not null default 0,
  char_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_posts_slug_idx on public.content_posts (slug);
create index if not exists content_posts_status_published_at_idx
  on public.content_posts (status, published_at desc);

alter table public.content_posts enable row level security;

drop policy if exists content_posts_select_published on public.content_posts;
create policy content_posts_select_published
  on public.content_posts
  for select
  to anon, authenticated
  using (status = 'published');
