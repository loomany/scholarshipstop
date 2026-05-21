-- Minimal local stubs so `next build` sitemap/home can query empty catalogs (Stage 4C.1 only).

create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text,
  state text
);

create table if not exists public.provider_scholarship_stats (
  slug text primary key,
  display_name text,
  scholarship_count integer not null default 0
);

create or replace view public.provider_hub_listing as
select
  s.slug,
  coalesce(nullif(trim(p.display_name), ''), nullif(trim(s.display_name), ''), s.slug) as display_name,
  s.scholarship_count,
  case when p.state is not null and length(trim(p.state)) = 2 then upper(trim(p.state)) else null end as state,
  null::text as ai_description
from public.provider_scholarship_stats s
left join public.providers p on p.slug = s.slug;

grant select on public.provider_hub_listing to anon, authenticated;

create table if not exists public.content_topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null default 'topic'
);

create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.content_topics (id),
  title text not null default '',
  slug text not null unique,
  h1 text not null default '',
  excerpt text not null default '',
  body_markdown text not null default '',
  body_html text not null default '',
  meta_title text not null default '',
  meta_description text not null default '',
  primary_keyword text not null default '',
  schema_json jsonb not null default '{}'::jsonb,
  cover_image_alt text not null default '',
  status text not null default 'draft',
  word_count integer not null default 0,
  char_count integer not null default 0
);
