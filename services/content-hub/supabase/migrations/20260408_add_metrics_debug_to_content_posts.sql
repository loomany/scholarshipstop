alter table public.content_posts
  add column if not exists metrics_debug text;
