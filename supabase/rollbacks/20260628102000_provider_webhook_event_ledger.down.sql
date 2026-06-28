-- Run only before processing live provider events, or after taking a verified DB backup.
begin;

drop function if exists public.complete_provider_webhook_event(text, text, text, text);
drop function if exists public.claim_provider_webhook_event(text, text, text, text);
drop table if exists public.provider_webhook_events;

commit;
