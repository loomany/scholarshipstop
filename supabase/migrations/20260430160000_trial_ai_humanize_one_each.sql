-- Trial: max 1 AI authenticity check and 1 full-draft humanize (aligned with mentor chat at 1).

update public.profiles
set
  trial_quota_ai_check_used = least(trial_quota_ai_check_used, 1),
  trial_quota_humanize_draft_used = least(trial_quota_humanize_draft_used, 1);

alter table public.profiles
  drop constraint if exists profiles_trial_quota_ai_check_used_check;

alter table public.profiles
  drop constraint if exists profiles_trial_quota_humanize_draft_used_check;

alter table public.profiles
  add constraint profiles_trial_quota_ai_check_used_check
  check (trial_quota_ai_check_used >= 0 and trial_quota_ai_check_used <= 1);

alter table public.profiles
  add constraint profiles_trial_quota_humanize_draft_used_check
  check (trial_quota_humanize_draft_used >= 0 and trial_quota_humanize_draft_used <= 1);

comment on column public.profiles.trial_quota_ai_check_used is
  '3-day trial: POST /api/essay/check-ai runs (max 1 total; GPTZero or Undetectable).';
comment on column public.profiles.trial_quota_humanize_draft_used is
  '3-day trial: POST /api/essay/undetectable-humanize with full_draft (max 1).';

create or replace function public.trial_reserve_quota(p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  lim_chat int := 1;
  lim_ai int := 1;
  lim_humanize int := 1;
  lim int;
  cur int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'no_auth');
  end if;

  if p_kind not in ('chat', 'ai_check', 'humanize_draft') then
    return jsonb_build_object('ok', false, 'reason', 'bad_kind');
  end if;

  lim := case p_kind
    when 'chat' then lim_chat
    when 'ai_check' then lim_ai
    else lim_humanize
  end;

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
