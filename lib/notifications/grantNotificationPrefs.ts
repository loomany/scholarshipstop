import type { Database } from '@/types_db';

export type GrantNotifyChannelId = 'best' | 'saved_filters' | 'easy_apply' | 'hot_deadlines';

export type ProfileEmailNotifyKey = keyof Pick<
  Database['public']['Tables']['profiles']['Row'],
  | 'email_notify_best_matches'
  | 'email_notify_saved_filters'
  | 'email_notify_easy_apply'
  | 'email_notify_hot_deadlines'
>;

export type TelegramNotifyKey = keyof Pick<
  Database['public']['Tables']['telegram_users']['Row'],
  | 'notify_best_matches'
  | 'notify_saved_filters'
  | 'notify_easy_apply'
  | 'notify_hot_deadlines'
>;

export const GRANT_NOTIFY_CHANNELS: {
  id: GrantNotifyChannelId;
  profileColumn: ProfileEmailNotifyKey;
  telegramColumn: TelegramNotifyKey;
  /** Short label for UI and Telegram buttons. */
  shortLabel: string;
  emailPromptOff: string;
  emailPromptOn: string;
}[] = [
  {
    id: 'best',
    profileColumn: 'email_notify_best_matches',
    telegramColumn: 'notify_best_matches',
    shortLabel: 'Best recommendations',
    emailPromptOff: 'Get emails when we add strong new Best recommendations for you?',
    emailPromptOn: 'Email alerts for Best recommendations are on — we will notify you about new picks.'
  },
  {
    id: 'saved_filters',
    profileColumn: 'email_notify_saved_filters',
    telegramColumn: 'notify_saved_filters',
    shortLabel: 'Saved filters',
    emailPromptOff: 'Get emails when new scholarships match your saved filters?',
    emailPromptOn: 'Email alerts for Saved filters are on — we will email you when new matches appear.'
  },
  {
    id: 'easy_apply',
    profileColumn: 'email_notify_easy_apply',
    telegramColumn: 'notify_easy_apply',
    shortLabel: 'Easy apply',
    emailPromptOff: 'Get emails about new Easy apply opportunities?',
    emailPromptOn: 'Email alerts for Easy apply are on — we will send you fresh quick-apply picks.'
  },
  {
    id: 'hot_deadlines',
    profileColumn: 'email_notify_hot_deadlines',
    telegramColumn: 'notify_hot_deadlines',
    shortLabel: 'Hot deadlines',
    emailPromptOff: 'Get emails about approaching Hot deadlines?',
    emailPromptOn: 'Email alerts for Hot deadlines are on — we will highlight time-sensitive grants.'
  }
];

export function getTelegramBotLink(): string {
  const raw =
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL?.trim() ||
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_LINK?.trim();
  if (raw) return raw.replace(/\/+$/, '');
  const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim();
  if (username) {
    const u = username.replace(/^@/, '');
    return `https://t.me/${u}`;
  }
  return 'https://t.me/scholarshiptop_bot';
}
