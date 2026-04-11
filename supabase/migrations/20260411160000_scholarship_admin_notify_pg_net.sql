-- On INSERT into scholarships, POST Supabase-shaped JSON to Next.js /api/internal/scholarships/notify-admin-new (Telegram admins).
-- Requires: pg_net (see 20260411150000_content_posts_telegram_net_webhook.sql).
-- Configure URL + bearer: npm run telegram:sync-scholarship-admin-notify
--
-- If you also enable Supabase Dashboard → Database → Webhooks on the same table, you will get duplicate Telegram messages — use one approach only.

create extension if not exists pg_net;

create table if not exists public.scholarship_admin_notify_config (
  id int primary key default 1 check (id = 1),
  endpoint_url text not null default 'https://scholarshiptop.com/api/internal/scholarships/notify-admin-new',
  bearer_token text not null default ''
);

comment on table public.scholarship_admin_notify_config is
  'Singleton (id=1). bearer_token must match SCHOLARSHIP_NEW_ADMIN_NOTIFY_SECRET or TELEGRAM_WEBHOOK_SECRET on the app.';

alter table public.scholarship_admin_notify_config enable row level security;

revoke all on public.scholarship_admin_notify_config from public;
revoke all on public.scholarship_admin_notify_config from anon, authenticated;
grant select, insert, update, delete on public.scholarship_admin_notify_config to service_role;

insert into public.scholarship_admin_notify_config (id, endpoint_url, bearer_token)
values (1, 'https://scholarshiptop.com/api/internal/scholarships/notify-admin-new', '')
on conflict (id) do nothing;

create or replace function public.notify_scholarships_admin_new_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
declare
  conf public.scholarship_admin_notify_config%rowtype;
  payload jsonb;
begin
  select * into conf from public.scholarship_admin_notify_config where id = 1;
  if conf is null or conf.endpoint_url is null or btrim(conf.endpoint_url) = '' or btrim(conf.bearer_token) = '' then
    raise log 'scholarship admin notify: configure public.scholarship_admin_notify_config (id=1)';
    return new;
  end if;

  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', tg_table_name,
    'schema', tg_table_schema,
    'record', to_jsonb(new),
    'old_record', null
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

drop trigger if exists scholarships_admin_notify on public.scholarships;

create trigger scholarships_admin_notify
  after insert on public.scholarships
  for each row
  execute function public.notify_scholarships_admin_new_on_insert();

comment on function public.notify_scholarships_admin_new_on_insert() is
  'POSTs Supabase webhook-shaped JSON to Next.js /api/internal/scholarships/notify-admin-new.';
