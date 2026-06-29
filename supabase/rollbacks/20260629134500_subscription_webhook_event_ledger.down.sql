-- Pre-live rollback only. Preserve the ledger and use a forward fix after live events.
begin;

drop function if exists public.complete_provider_webhook_event(text, text, text, text);
drop function if exists public.claim_provider_webhook_event(
  text, text, text, text, text, text
);

alter table public.provider_webhook_events
  drop column provider_order_id,
  drop column provider_subscription_id,
  drop column last_attempt_at;
alter table public.provider_webhook_events rename column first_seen_at to received_at;
alter table public.provider_webhook_events rename column event_type to event_name;
alter table public.provider_webhook_events rename column event_id to event_key;

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
