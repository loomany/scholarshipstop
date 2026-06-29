-- Extend the provider ledger for subscription and payment webhook metadata.
begin;

drop function if exists public.complete_provider_webhook_event(text, text, text, text);
drop function if exists public.claim_provider_webhook_event(text, text, text, text);

alter table public.provider_webhook_events rename column event_key to event_id;
alter table public.provider_webhook_events rename column event_name to event_type;
alter table public.provider_webhook_events rename column received_at to first_seen_at;
alter table public.provider_webhook_events
  add column provider_order_id text,
  add column provider_subscription_id text,
  add column last_attempt_at timestamptz not null default now();

create or replace function public.claim_provider_webhook_event(
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_payload_hash text,
  p_provider_order_id text default null,
  p_provider_subscription_id text default null
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
    provider,
    event_id,
    event_type,
    provider_order_id,
    provider_subscription_id,
    payload_hash,
    status
  ) values (
    p_provider,
    p_event_id,
    p_event_type,
    p_provider_order_id,
    p_provider_subscription_id,
    p_payload_hash,
    'processing'
  )
  on conflict (provider, event_id) do nothing;
  if found then return true; end if;

  update public.provider_webhook_events
  set
    status = 'processing',
    event_type = p_event_type,
    provider_order_id = coalesce(p_provider_order_id, provider_order_id),
    provider_subscription_id = coalesce(
      p_provider_subscription_id,
      provider_subscription_id
    ),
    payload_hash = p_payload_hash,
    attempts = attempts + 1,
    last_attempt_at = now(),
    processed_at = null,
    last_error = null
  where provider = p_provider
    and event_id = p_event_id
    and (
      status = 'failed'
      or (
        status = 'processing'
        and last_attempt_at < now() - interval '10 minutes'
      )
    )
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;

create or replace function public.complete_provider_webhook_event(
  p_provider text,
  p_event_id text,
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
  where provider = p_provider and event_id = p_event_id;
end;
$$;

revoke all on function public.claim_provider_webhook_event(
  text, text, text, text, text, text
)
  from public, anon, authenticated;
revoke all on function public.complete_provider_webhook_event(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.claim_provider_webhook_event(
  text, text, text, text, text, text
)
  to service_role;
grant execute on function public.complete_provider_webhook_event(text, text, text, text)
  to service_role;

commit;
