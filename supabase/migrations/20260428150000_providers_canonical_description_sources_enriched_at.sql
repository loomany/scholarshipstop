-- Canonical enrichment storage (dual-write with ai_* caches on write paths).

alter table public.providers
  add column if not exists description text;

alter table public.providers
  add column if not exists sources jsonb not null default '[]'::jsonb;

alter table public.providers
  add column if not exists enriched_at timestamptz;

comment on column public.providers.description is
  'Canonical public About copy; dual-written with ai_description during enrichment.';

comment on column public.providers.sources is
  'Canonical source URL list (jsonb array of strings); dual-written with ai_sources during enrichment.';

comment on column public.providers.enriched_at is
  'Timestamp of last successful enrichment write setting canonical fields and ai_* caches.';
