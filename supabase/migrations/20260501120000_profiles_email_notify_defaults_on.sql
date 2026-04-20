-- New users should have all grant email notifications enabled by default.
alter table public.profiles
  alter column email_notify_best_matches set default true,
  alter column email_notify_saved_filters set default true,
  alter column email_notify_easy_apply set default true,
  alter column email_notify_hot_deadlines set default true;
