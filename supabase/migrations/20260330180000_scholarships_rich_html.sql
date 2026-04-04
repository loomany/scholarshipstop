-- Rich HTML snapshots of main scholarship content (nullable, safe add).

alter table public.scholarships
  add column if not exists description_html text;

alter table public.scholarships
  add column if not exists eligibility_html text;

alter table public.scholarships
  add column if not exists awards_html text;

alter table public.scholarships
  add column if not exists notification_html text;

alter table public.scholarships
  add column if not exists payment_html text;

alter table public.scholarships
  add column if not exists requirements_html text;

alter table public.scholarships
  add column if not exists selection_criteria_html text;

comment on column public.scholarships.description_html is 'Sanitized-ready HTML: intro / main description';
comment on column public.scholarships.eligibility_html is 'Full Eligibility section HTML fragment';
comment on column public.scholarships.awards_html is 'Full Awards section HTML fragment';
comment on column public.scholarships.notification_html is 'Full Notification section HTML fragment';
comment on column public.scholarships.payment_html is 'Payment of Scholarships section HTML fragment';
comment on column public.scholarships.requirements_html is 'Requirements block HTML fragment';
comment on column public.scholarships.selection_criteria_html is 'Selection of Recipients section HTML fragment';
