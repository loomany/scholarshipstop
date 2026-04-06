-- Stable listing order: /resources uses published_at DESC, then updated_at DESC.
-- Ensure published rows get published_at when the writer omits it (async pipelines).

create or replace function public.content_posts_set_published_at_if_missing()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := timezone('utc', now());
  end if;
  return new;
end;
$$;

drop trigger if exists content_posts_set_published_at_if_missing on public.content_posts;
create trigger content_posts_set_published_at_if_missing
  before insert or update on public.content_posts
  for each row
  execute function public.content_posts_set_published_at_if_missing();

comment on function public.content_posts_set_published_at_if_missing() is
  'Sets published_at to UTC now() when status is published and published_at was not provided.';

-- Backfill existing published rows missing published_at (use updated_at, then created_at).
update public.content_posts
set published_at = coalesce(published_at, updated_at, created_at)
where status = 'published'
  and published_at is null;
