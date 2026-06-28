-- Durable idempotency claim for provider webhooks before external side effects.
begin;

create table if not exists public.provider_webhook_events (
  id bigint generated always as identity primary key,
  provider text not null,
  event_key text not null,
  event_name text not null,
  payload_hash text not null,
  status text not null check (status in ('processing', 'processed', 'failed')),
  attempts integer not null default 1,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  unique (provider, event_key)
);

alter table public.provider_webhook_events enable row level security;
revoke all privileges on table public.provider_webhook_events from anon, authenticated;
grant all privileges on table public.provider_webhook_events to service_role;
grant usage, select on sequence public.provider_webhook_events_id_seq to service_role;

create or replace function public.claim_provider_webhook_event(
  p_provider text,
  p_event_key text,
  p_event_name text,
  p_payload_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimed boolean := false;
begin
  insert into public.provider_webhook_events (
    provider, event_key, event_name, payload_hash, status
  ) values (
    p_provider, p_event_key, p_event_name, p_payload_hash, 'processing'
  )
  on conflict (provider, event_key) do nothing;
  if found then return true; end if;

  update public.provider_webhook_events
  set
    status = 'processing',
    payload_hash = p_payload_hash,
    attempts = attempts + 1,
    received_at = now(),
    last_error = null
  where provider = p_provider
    and event_key = p_event_key
    and (
      status = 'failed'
      or (status = 'processing' and received_at < now() - interval '10 minutes')
    )
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;

create or replace function public.complete_provider_webhook_event(
  p_provider text,
  p_event_key text,
  p_status text,
  p_last_error text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_status not in ('processed', 'failed') then
    raise exception 'invalid provider webhook completion status';
  end if;
  update public.provider_webhook_events
  set
    status = p_status,
    processed_at = case when p_status = 'processed' then now() else null end,
    last_error = left(p_last_error, 500)
  where provider = p_provider and event_key = p_event_key;
end;
$$;

revoke all on function public.claim_provider_webhook_event(text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.complete_provider_webhook_event(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.claim_provider_webhook_event(text, text, text, text)
  to service_role;
grant execute on function public.complete_provider_webhook_event(text, text, text, text)
  to service_role;

commit;
