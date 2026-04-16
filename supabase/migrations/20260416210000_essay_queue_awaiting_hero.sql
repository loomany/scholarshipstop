-- Essay Hub: defer publication until FAL hero succeeds (balance / transient errors).
-- Adds draft column for stable hero scene index across retries.

alter table public.essays
  add column if not exists hero_variant_index integer null;

comment on column public.essays.hero_variant_index is
  'Scene variant index used for buildEssayHubHeroImagePrompt; frozen at first generation for consistent retries.';

alter table public.essay_generation_queue drop constraint if exists essay_generation_queue_status_chk;

alter table public.essay_generation_queue
  add constraint essay_generation_queue_status_chk
  check (
    status in (
      'pending',
      'processing',
      'completed',
      'failed',
      'awaiting_hero'
    )
  );

comment on column public.essay_generation_queue.status is
  'awaiting_hero: text generated and draft essay row exists; worker retries FAL only, then sets is_published.';
