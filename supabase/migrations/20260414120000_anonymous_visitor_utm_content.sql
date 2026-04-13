-- Store utm_content (e.g. Meta creative id) alongside first-touch UTM params.

alter table public.anonymous_visitor_first_touch
  add column if not exists utm_content text;

comment on column public.anonymous_visitor_first_touch.utm_content is
  'Optional UTM content (e.g. Meta ad creative identifier).';
