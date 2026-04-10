-- Per-channel grant alert preferences (email + Telegram bot).

alter table public.profiles
  add column if not exists email_notify_best_matches boolean not null default false,
  add column if not exists email_notify_saved_filters boolean not null default false,
  add column if not exists email_notify_easy_apply boolean not null default false,
  add column if not exists email_notify_hot_deadlines boolean not null default false;

alter table public.telegram_users
  add column if not exists notify_best_matches boolean not null default false,
  add column if not exists notify_saved_filters boolean not null default false,
  add column if not exists notify_easy_apply boolean not null default false,
  add column if not exists notify_hot_deadlines boolean not null default false;
