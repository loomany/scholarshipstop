-- Drives /essays sort: real FAL/sharp heroes before gradient placeholders (no per-request CDN probing).
alter table public.essays
  add column if not exists hero_is_real boolean not null default false;

comment on column public.essays.hero_is_real is
  'True when hero_image_url was produced from FAL + sharp ingest; false for gradient fallback or legacy unknown.';
