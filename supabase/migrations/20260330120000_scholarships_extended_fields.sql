-- Extended catalog fields for Scholarship America–style detail (all nullable, safe add).

alter table public.scholarships
  add column if not exists status_text text;

alter table public.scholarships
  add column if not exists institutions_text text;

alter table public.scholarships
  add column if not exists state_territory_text text;

alter table public.scholarships
  add column if not exists support_email text;

alter table public.scholarships
  add column if not exists support_phone text;

alter table public.scholarships
  add column if not exists eligibility_text text;

alter table public.scholarships
  add column if not exists awards_text text;

alter table public.scholarships
  add column if not exists notification_text text;

alter table public.scholarships
  add column if not exists selection_criteria_text text;

comment on column public.scholarships.status_text is 'e.g. Open / Closed from source site';
comment on column public.scholarships.institutions_text is 'Eligible institution types (free text)';
comment on column public.scholarships.state_territory_text is 'Geographic eligibility (free text)';
comment on column public.scholarships.support_email is 'Program support email';
comment on column public.scholarships.support_phone is 'Program support phone';
comment on column public.scholarships.eligibility_text is 'Full Eligibility section body';
comment on column public.scholarships.awards_text is 'Full Awards section body';
comment on column public.scholarships.notification_text is 'Full Notification section body';
comment on column public.scholarships.selection_criteria_text is 'Full Selection of Recipients section body';
