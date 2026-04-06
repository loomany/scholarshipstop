-- Optional GPA from onboarding step 4 (text slug or display value)
alter table public.profiles
  add column if not exists gpa text;
