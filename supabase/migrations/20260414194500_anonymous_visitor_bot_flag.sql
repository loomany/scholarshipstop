-- Bot vs human heuristic (User-Agent via isbot on the server).

alter table public.anonymous_visitor_first_touch
  add column if not exists is_likely_bot boolean not null default false;

alter table public.anonymous_visitor_first_touch
  add column if not exists user_agent_snapshot text;

comment on column public.anonymous_visitor_first_touch.is_likely_bot is
  'True when User-Agent matches isbot patterns; false when UA missing or not classified as bot.';

comment on column public.anonymous_visitor_first_touch.user_agent_snapshot is
  'Truncated client User-Agent for audit.';
