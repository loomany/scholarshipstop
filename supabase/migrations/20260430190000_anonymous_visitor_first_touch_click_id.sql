-- Technical click identifiers (gclid, fbclid) stored separately from normalized landing_url.

alter table public.anonymous_visitor_first_touch
  add column if not exists click_id text;

comment on column public.anonymous_visitor_first_touch.click_id is
  'Ad platform click id from landing URL (e.g. gclid, fbclid); landing_url is stored without it for grouping.';
