-- Align public.profiles with onboarding: text birth_month, numeric gpa, drop legacy columns.

alter table public.profiles
  alter column birth_month type text using (
    case when birth_month is null then null else birth_month::text end
  );

alter table public.profiles
  alter column gpa type numeric using (
    case
      when gpa is null then null
      when trim(gpa::text) = '' then null
      when trim(gpa::text) ~ '^[0-9]+(\.[0-9]+)?$' then trim(gpa::text)::numeric
      else null
    end
  );

alter table public.profiles drop column if exists full_name;
alter table public.profiles drop column if exists citizenship_slug;
