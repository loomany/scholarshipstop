-- Per-category admin Telegram alerts (see lib/telegram/adminNotificationRouting.ts).
-- Empty object {} means all categories on (same as before single master toggle).

alter table public.telegram_users
  add column if not exists admin_notification_prefs jsonb not null default '{}'::jsonb;

comment on column public.telegram_users.admin_notification_prefs is
  'Admin-only: keys grants|traffic|auth|billing|seo|resources; false disables that alert stream. Omitted key = enabled.';
