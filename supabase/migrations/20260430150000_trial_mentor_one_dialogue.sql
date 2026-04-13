-- Trial mentor: 1 dialogue start (POST /api/interviewer action init), not per message.
-- AI check + full-draft humanize stay at 2 each. Fixes typo in humanize column check if present.

-- Cap existing usage before tightening chat max to 1.
update public.profiles
set trial_quota_chat_turns_used = least(trial_quota_chat_turns_used, 1);

-- Replace chat column check: max 1 dialogue slot.
alter table public.profiles
  drop constraint if exists profiles_trial_quota_chat_turns_used_check;

alter table public.profiles
  add constraint profiles_trial_quota_chat_turns_used_check
  check (trial_quota_chat_turns_used >= 0 and trial_quota_chat_turns_used <= 1);

comment on column public.profiles.trial_quota_chat_turns_used is
  '3-day trial: mentor dialogue starts reserved via trial_reserve_quota(chat), max 1 (POST /api/interviewer init).';

-- Drop any broken or legacy check involving humanize draft column, then enforce correct bound.
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.profiles'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%trial_quota_humanize_draft_used%'
  loop
    execute format('alter table public.profiles drop constraint %I', r.conname);
  end loop;
end;
$$;

alter table public.profiles
  add constraint profiles_trial_quota_humanize_draft_used_check
  check (trial_quota_humanize_draft_used >= 0 and trial_quota_humanize_draft_used <= 2);

create or replace function public.trial_reserve_quota(p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  lim_chat int := 1;
  lim_other int := 2;
  lim int;
  cur int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'no_auth');
  end if;

  if p_kind not in ('chat', 'ai_check', 'humanize_draft') then
    return jsonb_build_object('ok', false, 'reason', 'bad_kind');
  end if;

  lim := case when p_kind = 'chat' then lim_chat else lim_other end;

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

-- trial_release_quota unchanged logic; grants already set on prior migration.
