-- Backend-driven article ↔ scholarship matching (no AI URLs).
-- Safe if table already exists in hosted Supabase.

alter table if exists public.content_posts
  add column if not exists related_scholarships jsonb;

alter table if exists public.content_posts
  add column if not exists article_match_diagnostics jsonb;

comment on column public.content_posts.related_scholarships is
  'Matched catalog scholarships: [{ slug, title, score, reason, award_amount_text?, deadline_text? }]';

comment on column public.content_posts.article_match_diagnostics is
  'Optional debug: signals, top scores, inline link count, pipeline version.';
