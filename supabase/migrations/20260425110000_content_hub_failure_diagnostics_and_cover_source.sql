alter table public.content_topics
  add column if not exists last_error text,
  add column if not exists last_stage text,
  add column if not exists failure_class text,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_attempt_at timestamptz;

alter table public.content_posts
  add column if not exists cover_image_source_url text,
  add column if not exists cover_image_source_type text;

create index if not exists content_topics_status_attempt_idx
  on public.content_topics(status, attempt_count, updated_at);

create index if not exists content_posts_cover_image_source_url_idx
  on public.content_posts(cover_image_source_url);

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
