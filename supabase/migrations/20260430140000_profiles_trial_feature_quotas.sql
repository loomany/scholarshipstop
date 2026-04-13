-- Per-feature usage caps during the 3-day Lemon trial (2 each: mentor chat turns, AI check, full-draft humanize).
-- Updated only via SECURITY DEFINER RPCs (not exposed as free-form client updates).

alter table public.profiles
  add column if not exists trial_quota_chat_turns_used integer not null default 0
    check (trial_quota_chat_turns_used >= 0 and trial_quota_chat_turns_used <= 2),
  add column if not exists trial_quota_ai_check_used integer not null default 0
    check (trial_quota_ai_check_used >= 0 and trial_quota_ai_check_used <= 2),
  add column if not exists trial_quota_humanize_draft_used integer not null default 0
    check (trial_quota_humanize_draft_used >= 0 and trial_quota_humanize_draft_used <= 2);

comment on column public.profiles.trial_quota_chat_turns_used is
  '3-day trial: POST /api/interviewer user→assistant turns reserved (max 2).';
comment on column public.profiles.trial_quota_ai_check_used is
  '3-day trial: POST /api/essay/check-ai runs (max 2).';
comment on column public.profiles.trial_quota_humanize_draft_used is
  '3-day trial: POST /api/essay/undetectable-humanize with full_draft (max 2).';

create or replace function public.trial_reserve_quota(p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  lim int := 2;
  cur int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'no_auth');
  end if;

  if p_kind not in ('chat', 'ai_check', 'humanize_draft') then
    return jsonb_build_object('ok', false, 'reason', 'bad_kind');
  end if;

  if p_kind = 'chat' then
    update public.profiles
    set trial_quota_chat_turns_used = trial_quota_chat_turns_used + 1
    where id = uid and trial_quota_chat_turns_used < lim
    returning trial_quota_chat_turns_used into cur;
  elsif p_kind = 'ai_check' then
    update public.profiles
    set trial_quota_ai_check_used = trial_quota_ai_check_used + 1
    where id = uid and trial_quota_ai_check_used < lim
    returning trial_quota_ai_check_used into cur;
  else
    update public.profiles
    set trial_quota_humanize_draft_used = trial_quota_humanize_draft_used + 1
    where id = uid and trial_quota_humanize_draft_used < lim
    returning trial_quota_humanize_draft_used into cur;
  end if;

  if cur is null then
    return jsonb_build_object('ok', false, 'reason', 'quota_exceeded');
  end if;

  return jsonb_build_object('ok', true, 'used_after', cur);
end;
$$;

create or replace function public.trial_release_quota(p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return;
  end if;

  if p_kind not in ('chat', 'ai_check', 'humanize_draft') then
    return;
  end if;

  if p_kind = 'chat' then
    update public.profiles
    set trial_quota_chat_turns_used = greatest(0, trial_quota_chat_turns_used - 1)
    where id = uid and trial_quota_chat_turns_used > 0;
  elsif p_kind = 'ai_check' then
    update public.profiles
    set trial_quota_ai_check_used = greatest(0, trial_quota_ai_check_used - 1)
    where id = uid and trial_quota_ai_check_used > 0;
  else
    update public.profiles
    set trial_quota_humanize_draft_used = greatest(0, trial_quota_humanize_draft_used - 1)
    where id = uid and trial_quota_humanize_draft_used > 0;
  end if;
end;
$$;

revoke all on function public.trial_reserve_quota(text) from public;
revoke all on function public.trial_release_quota(text) from public;
grant execute on function public.trial_reserve_quota(text) to authenticated;
grant execute on function public.trial_release_quota(text) to authenticated;
