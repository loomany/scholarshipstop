-- Classified channel for reporting (Google Ads vs organic vs other).

alter table public.anonymous_visitor_first_touch
  add column if not exists traffic_channel text;

comment on column public.anonymous_visitor_first_touch.traffic_channel is
  'Resolved server-side: google_ads | organic_search | other_paid | referral | direct_unknown';
