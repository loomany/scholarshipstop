-- Pipeline: pending (default) → submitted (after Indexing API ping) → indexed (URL Inspection PASS).

alter table public.scholarships
  add column if not exists indexing_status text not null default 'pending';

comment on column public.scholarships.indexing_status is
  'Google indexing: pending | submitted | indexed (see notify-admin-new + /api/internal/seo/scan-indexing).';
