-- After publish (INSERT published, or UPDATE -> published), POST to Next.js notify-published (Telegram).
-- Requires: pg_net. Configure URL + bearer via scripts/sync-telegram-resource-webhook.ts (service role).

create extension if not exists pg_net;

comment on extension pg_net is 'Async HTTP for triggers (Telegram resource notify).';

create table if not exists public.telegram_resource_notify_config (
  id int primary key default 1 check (id = 1),
  endpoint_url text not null default 'https://scholarshiptop.com/api/internal/resources/notify-published',
  bearer_token text not null default ''
);

comment on table public.telegram_resource_notify_config is
  'Singleton (id=1). bearer_token must match TELEGRAM_RESOURCE_NOTIFY_SECRET or CONTENT_ARTICLE_MATCH_SECRET on the app.';

alter table public.telegram_resource_notify_config enable row level security;

revoke all on public.telegram_resource_notify_config from public;
revoke all on public.telegram_resource_notify_config from anon, authenticated;
grant select, insert, update, delete on public.telegram_resource_notify_config to service_role;

insert into public.telegram_resource_notify_config (id, endpoint_url, bearer_token)
values (1, 'https://scholarshiptop.com/api/internal/resources/notify-published', '')
on conflict (id) do nothing;

create or replace function public.notify_content_posts_telegram_resource()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
declare
  conf public.telegram_resource_notify_config%rowtype;
  payload jsonb;
  should_notify boolean := false;
begin
  if new.status is distinct from 'published' or new.slug is null or btrim(new.slug) = '' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    should_notify := true;
  elsif tg_op = 'UPDATE' then
    if old.status is distinct from 'published' then
      should_notify := true;
    end if;
  end if;

  if not should_notify then
    return new;
  end if;

  select * into conf from public.telegram_resource_notify_config where id = 1;
  if conf is null or conf.endpoint_url is null or btrim(conf.endpoint_url) = '' or btrim(conf.bearer_token) = '' then
    raise log 'telegram resource notify: configure public.telegram_resource_notify_config (id=1)';
    return new;
  end if;

  payload := jsonb_build_object(
    'type', case when tg_op = 'INSERT' then 'INSERT' else 'UPDATE' end,
    'table', tg_table_name,
    'schema', tg_table_schema,
    'record', to_jsonb(new),
    'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
  );

  perform net.http_post(
    url := conf.endpoint_url,
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || conf.bearer_token
    ),
    timeout_milliseconds := 15000
  );

  return new;
end;
$$;

drop trigger if exists content_posts_telegram_resource_notify on public.content_posts;

create trigger content_posts_telegram_resource_notify
  after insert or update on public.content_posts
  for each row
  execute function public.notify_content_posts_telegram_resource();

comment on function public.notify_content_posts_telegram_resource() is
  'POSTs Supabase webhook-shaped JSON to Next.js /api/internal/resources/notify-published.';
