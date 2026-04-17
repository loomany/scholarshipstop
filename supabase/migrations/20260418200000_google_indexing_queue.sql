-- Batched Google Indexing API queue (replaces data/google-indexing-queue.json for multi-container deploys).

create table public.google_indexing_queue (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  added_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'processed', 'failed')),
  notification_type text not null default 'URL_UPDATED'
    check (notification_type in ('URL_UPDATED', 'URL_DELETED')),
  content_kind text
    check (content_kind is null or content_kind in ('scholarship', 'resource', 'provider', 'essay')),
  source text,
  attempt_count integer not null default 0,
  last_error text
);

create unique index google_indexing_queue_url_key on public.google_indexing_queue (url);

create index google_indexing_queue_status_added_at_idx
  on public.google_indexing_queue (status, added_at)
  where status = 'pending';

comment on table public.google_indexing_queue is 'Queue for Google Indexing API flush cron; service role only.';

alter table public.google_indexing_queue enable row level security;
