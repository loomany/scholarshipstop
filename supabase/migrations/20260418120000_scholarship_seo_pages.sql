-- Optional persistence for generated SEO copy (runtime still uses JSON files by default).
-- Sync from app via script or admin; not required for catalog listing.

create table if not exists public.scholarship_seo_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  page_type text,
  route_path text,
  filters_json jsonb default '{}'::jsonb,
  generated_title text,
  generated_meta_description text,
  generated_h1 text,
  generated_intro text,
  generated_supporting_text text,
  generated_faq_json jsonb,
  ai_model text,
  ai_prompt_version text,
  source_snapshot_json jsonb,
  scholarships_count integer,
  is_indexable boolean default true,
  generation_status text default 'pending',
  generated_at timestamptz,
  updated_at timestamptz default now()
);

create index if not exists scholarship_seo_pages_indexable_idx
  on public.scholarship_seo_pages (is_indexable)
  where is_indexable = true;

comment on table public.scholarship_seo_pages is
  'Cached AI/deterministic SEO fields for composite scholarship listing URLs; slug = canonical path (e.g. for-women/no-essay).';
