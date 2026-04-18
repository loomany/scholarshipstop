import 'server-only';

import { createHash, randomInt } from 'crypto';

import { sendTelegramLinkCodeEmail } from '@/lib/email/sendTelegramLinkCodeEmail';
import { sendTelegramResourceNotification } from '@/lib/telegram/notifyResources';
import {
  fetchFirstActiveScholarshipPreview,
  fetchScholarshipsByIdsForListing
} from '@/lib/scholarships/supabase';
import {
  addUserSavedScholarship,
  isLikelyScholarshipUuid,
  removeUserSavedScholarship,
  userHasSavedScholarship,
  TELEGRAM_GRANT_SAVE_CALLBACK_PREFIX,
  TELEGRAM_GRANT_SAVED_ACK_PREFIX
} from '@/lib/account/userSavedScholarships';
import { grantNotifyTelegramCardCategoryLabel } from '@/lib/notifications/grantNotificationPrefs';
import {
  editScholarshipGrantCardReplyMarkup,
  sendScholarshipTelegramCardToChat
} from '@/lib/telegram/scholarshipTelegramCard';
import { SCHOLARSHIPS_HUB_SAVED_TAB_HREF } from '@/app/scholarships/scholarshipListUrl';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { scholarshipPublicPath } from '@/app/scholarships/scholarshipsData';
import {
  getFirstTouchNotifySourceKey,
  labelForVisitorRow,
  type TrafficChannel,
  formatFirstTouchVisitorAlertLabel,
  formatTrafficChannelLabel
} from '@/lib/analytics/resolveTrafficChannel';
import { logRegistrationPipeline } from '@/lib/auth/registrationPipelineLog';
import { escapeTelegramHtml } from '@/lib/telegram/resourceNotifyCore';
import {
  ADMIN_NOTIFY_CALLBACK_PREFIX,
  ADMIN_NOTIFY_ENABLE_ALL_CALLBACK,
  ADMIN_NOTIFY_LABEL_RU,
  ADMIN_NOTIFY_TRAFFIC_BACK_CALLBACK,
  ADMIN_NOTIFY_TRAFFIC_MENU_CALLBACK,
  ADMIN_NOTIFY_TRAFFIC_SRC_PREFIX,
  FIRST_TOUCH_NOTIFY_LABEL_RU,
  FIRST_TOUCH_NOTIFY_SOURCE_KEYS,
  collectTelegramAdminAlertChatIdsForCategory,
  collectTelegramAdminAlertChatIdsForTrafficSource,
  isAdminNotifyCategoryEnabled,
  isTrafficNotifySourceEnabled,
  parseAdminNotifyCallback,
  parseFirstTouchNotifyCallback,
  toggleAdminNotifyCategory,
  toggleTrafficNotifySource,
  ADMIN_NOTIFY_KEYS,
  type AdminNotifyCategory
} from '@/lib/telegram/adminNotificationRouting';
import { fetchSearchAppearancePageCount } from '@/lib/seo/googleSearchConsole';
import { getSeoDripFeedSnapshot } from '@/lib/seo/seoDripFeed';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import type { Database, Json } from '@/types_db';

type TelegramUserRow = Database['public']['Tables']['telegram_users']['Row'];
type TelegramEventType = Database['public']['Tables']['telegram_event_logs']['Row']['event_type'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

type TelegramInlineButton = {
  text: string;
  callback_data: string;
};

type TelegramReplyMarkup = {
  inline_keyboard: TelegramInlineButton[][];
};

type TelegramKeyboardButton = {
  text: string;
};

type TelegramReplyKeyboardMarkup = {
  keyboard: TelegramKeyboardButton[][];
  resize_keyboard?: boolean;
  is_persistent?: boolean;
  one_time_keyboard?: boolean;
};

type TelegramFrom = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramChat = {
  id: number;
  type: string;
};

type TelegramMessage = {
  message_id: number;
  text?: string;
  chat: TelegramChat;
  from?: TelegramFrom;
};

type TelegramCallbackQuery = {
  id: string;
  data?: string;
  from: TelegramFrom;
  message?: TelegramMessage;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type AuthUserRow = {
  id: string;
  email: string | null;
  raw_user_meta_data?: Record<string, unknown> | null;
};

const CALLBACKS = {
  admin: 'tg:admin',
  connect: 'tg:connect',
  findScholarships: 'tg:find',
  mainMenu: 'tg:menu',
  myProfile: 'tg:profile',
  toggleAlerts: 'tg:toggle-alerts',
  notifyBest: 'tg:n:bm',
  notifySf: 'tg:n:sf',
  notifyEa: 'tg:n:ea',
  notifyHd: 'tg:n:hd'
} as const;

type GrantNotifyField =
  | 'notify_best_matches'
  | 'notify_saved_filters'
  | 'notify_easy_apply'
  | 'notify_hot_deadlines';

const BUTTON_LABELS = {
  admin: '🛠 Admin Panel',
  /** Admin: per-category server alerts (inline panel). Replaces legacy ON/OFF row. */
  adminAlertsMenu: '🔔 Admin alerts',
  backToMenu: '⬅️ Main Menu',
  connectAccount: '🔗 Link Account',
  /** Grant notification toggles (same as account email prefs); search: /scholarships on site. */
  findScholarships: '🔔 Alerts Setup',
  myProfile: '👤 My Account',
  reconnectAccount: '🔄 Sync Account',
  /** Same data as hub My scholarships → Saved (`/scholarships?tab=saved`). Main menu only — not duplicated on My Account keyboard. */
  savedScholarships: '💾 Saved scholarships'
} as const;

/** Previous reply-keyboard label; still accept taps until clients refresh the keyboard. */
const LEGACY_SAVED_SCHOLARSHIPS_BUTTON = '💾 Saved';

/** Removed from admin keyboard; still accept taps until clients refresh. Use `/seoreport` for the same report. */
const LEGACY_SEO_QUEUE_REPORT_BUTTON = '📊 SEO очередь';

/** Legacy reply-keyboard row; opens the new admin alerts panel instead of toggling one bit. */
const LEGACY_ADMIN_ALERTS_ON = '🔔 Notifications: ON';
const LEGACY_ADMIN_ALERTS_OFF = '🔔 Notifications: OFF';

/** Short reply when returning to the reply-keyboard hub (not Markdown). */
const MAIN_MENU_REPLY = 'Main menu — pick your next step.';

function getTelegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
}

function getTelegramAdminIds() {
  const raw = process.env.TELEGRAM_ADMIN_IDS?.trim() || '200082134';
  const set = new Set(
    raw
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item))
  );
  const single = process.env.TELEGRAM_ADMIN_ID?.trim();
  if (single) {
    const n = Number(single);
    if (Number.isFinite(n)) set.add(n);
  }
  return set;
}

/** First token, without @botname; lowercased so /TestResources matches /testresources. */
function normalizeBotCommand(text: string): string {
  const first = text.trim().split(/\s+/)[0] ?? '';
  return (first.split('@')[0] ?? '').toLowerCase();
}

function getTelegramCodeSecret() {
  return (
    process.env.TELEGRAM_LINK_CODE_SECRET?.trim() ||
    process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    'telegram-link-code'
  );
}

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    'https://scholarshiptop.com'
  ).replace(/\/+$/, '');
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
}

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
}

function createTelegramCodeHash(code: string) {
  return createHash('sha256')
    .update(`${getTelegramCodeSecret()}:${code}`)
    .digest('hex');
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function button(text: string, callback_data: string): TelegramInlineButton {
  return { text, callback_data };
}

function keyboardButton(text: string): TelegramKeyboardButton {
  return { text };
}

function buildMainKeyboard(): TelegramReplyKeyboardMarkup {
  return {
    keyboard: [
      [
        keyboardButton(BUTTON_LABELS.findScholarships),
        keyboardButton(BUTTON_LABELS.myProfile)
      ],
      [keyboardButton(BUTTON_LABELS.savedScholarships)]
    ],
    resize_keyboard: true,
    is_persistent: true
  };
}

function buildProfileKeyboard(user: TelegramUserRow): TelegramReplyKeyboardMarkup {
  const primaryConnectButton = keyboardButton(
    user.app_user_id ? BUTTON_LABELS.reconnectAccount : BUTTON_LABELS.connectAccount
  );

  if (user.is_admin) {
    return {
      keyboard: [
        [primaryConnectButton, keyboardButton(BUTTON_LABELS.admin)],
        [keyboardButton(BUTTON_LABELS.adminAlertsMenu)],
        [keyboardButton(BUTTON_LABELS.backToMenu)]
      ],
      resize_keyboard: true,
      is_persistent: true
    };
  }

  return {
    keyboard: [
      [primaryConnectButton],
      [keyboardButton(BUTTON_LABELS.backToMenu)]
    ],
    resize_keyboard: true,
    is_persistent: true
  };
}

function formatPlanLabel(plan: string | null | undefined, isSubscribed: boolean) {
  switch (plan) {
    case 'trial':
      return 'Trial';
    case 'monthly_pro':
      return 'Monthly Pro';
    case 'quarterly_pro':
      return 'Quarterly Pro';
    case 'yearly_pro':
      return 'Yearly Pro';
    default:
      return isSubscribed ? 'Paid' : 'Free';
  }
}

function formatAdminPlanLabel(plan: string | null | undefined, isSubscribed: boolean) {
  switch (plan) {
    case 'trial':
      return 'Пробный период';
    case 'monthly_pro':
      return 'Премиум на месяц';
    case 'quarterly_pro':
      return 'Премиум на квартал';
    case 'yearly_pro':
      return 'Премиум на год';
    case 'free':
      return 'Бесплатный';
    default:
      return isSubscribed ? 'Платный' : 'Бесплатный';
  }
}

function formatAdminStatusLabel(status: string | null | undefined) {
  switch ((status ?? '').trim().toLowerCase()) {
    case 'active':
      return 'Активна';
    case 'cancelled':
    case 'canceled':
      return 'Отменена';
    case 'expired':
      return 'Истекла';
    case 'trialing':
    case 'on_trial':
      return 'Пробный период';
    case 'paused':
      return 'Приостановлена';
    case 'past_due':
      return 'Просрочена';
    case 'unpaid':
      return 'Не оплачена';
    case 'refunded':
      return 'Возврат';
    default:
      return formatValue(status, 'Не указан');
  }
}

function formatAdminSourceLabel(source: string | null | undefined) {
  switch ((source ?? '').trim().toLowerCase()) {
    case 'app':
      return 'сайт';
    default:
      return formatValue(source, 'не указан');
  }
}

/** Lemon `meta.event_name` / stored `event_name` → short Russian label for admin Telegram. */
function formatLemonWebhookEventRu(eventName: string | null | undefined): string {
  if (!eventName?.trim()) return 'не указано';
  const e = eventName.trim().toLowerCase().replace(/\./g, '_');
  const map: Record<string, string> = {
    subscription_created: 'подписка создана',
    subscription_updated: 'подписка обновлена',
    subscription_cancelled: 'подписка отменена',
    subscription_resumed: 'подписка возобновлена',
    subscription_expired: 'подписка истекла',
    subscription_paused: 'подписка на паузе',
    subscription_unpaused: 'пауза снята',
    subscription_plan_changed: 'смена тарифа',
    subscription_payment_success: 'успешный платёж',
    subscription_payment_failed: 'ошибка платежа',
    subscription_payment_recovered: 'платёж восстановлен',
    subscription_payment_refunded: 'возврат по подписке',
    order_created: 'заказ создан',
    order_refunded: 'возврат заказа'
  };
  return map[e] ?? eventName;
}

function formatValue(value: string | number | null | undefined, fallback = 'Not set') {
  if (value == null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function formatProfileMessage(authUser: AuthUserRow | null, profile: ProfileRow | null) {
  const firstName = profile?.first_name?.trim() || '';
  const lastName = profile?.last_name?.trim() || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Not set';

  return [
    'Your ScholarshipTop profile',
    '',
    `Name: ${fullName}`,
    `Email: ${formatValue(authUser?.email)}`,
    `Email verified: ${profile?.email_verified ? 'Yes' : 'No'}`,
    `Plan: ${formatPlanLabel(profile?.subscription_plan, Boolean(profile?.is_subscribed))}`,
    `School level: ${formatValue(profile?.school_level_label || profile?.school_level)}`,
    `Field of study: ${formatValue(
      profile?.field_of_study_label || profile?.field_of_study
    )}`,
    `Citizenship: ${formatValue(
      profile?.citizenship_status_label || profile?.citizenship_status
    )}`,
    `State: ${formatValue(profile?.state_region)}`,
    `GPA: ${formatValue(profile?.gpa)}`
  ].join('\n');
}

async function callTelegramApi<T>(method: string, payload: Record<string, unknown>) {
  const token = getTelegramBotToken();
  if (!token) {
    return null as T | null;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error(`[telegram] ${method} failed`, response.status, text);
      return null as T | null;
    }

    const json = (await response.json().catch(() => null)) as { result?: T } | null;
    return json?.result ?? null;
  } catch (e) {
    console.error(`[telegram] ${method} request error`, e);
    return null as T | null;
  }
}

async function sendTelegramMessage(
  chatId: number,
  text: string,
  replyMarkup?: TelegramReplyMarkup | TelegramReplyKeyboardMarkup,
  options?: { parse_mode?: 'HTML' | 'Markdown' }
) {
  await callTelegramApi('sendMessage', {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
    disable_web_page_preview: true,
    ...(options?.parse_mode ? { parse_mode: options.parse_mode } : {})
  });
}

async function answerTelegramCallbackQuery(callbackQueryId: string, text?: string) {
  await callTelegramApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text
  });
}

function grantNotifyChannelStatus(on: boolean): 'ON' | 'OFF' {
  return on ? 'ON' : 'OFF';
}

function formatGrantNotifyPanelText(user: TelegramUserRow): string {
  return [
    '🔔 *Notification Center*',
    'Stay ahead of the competition! Personalize your stream to get the most relevant grant opportunities.',
    '',
    '*Active Channels:*',
    `🎯 Top Matches: ${grantNotifyChannelStatus(user.notify_best_matches)}`,
    `💾 Saved Filters: ${grantNotifyChannelStatus(user.notify_saved_filters)}`,
    `⚡ Quick Apply: ${grantNotifyChannelStatus(user.notify_easy_apply)}`,
    `🔥 Hot Deadlines: ${grantNotifyChannelStatus(user.notify_hot_deadlines)}`,
    '',
    '_Tap the buttons below to toggle channels._'
  ].join('\n');
}

function buildGrantNotifyInlineKeyboard(user: TelegramUserRow): TelegramReplyMarkup {
  const cell = (label: string, on: boolean, data: string): TelegramInlineButton =>
    button(`${label}: ${grantNotifyChannelStatus(on)}`, data);

  return {
    inline_keyboard: [
      [
        cell('🎯 Top Matches', user.notify_best_matches, CALLBACKS.notifyBest),
        cell('💾 Saved Filters', user.notify_saved_filters, CALLBACKS.notifySf)
      ],
      [
        cell('⚡ Quick Apply', user.notify_easy_apply, CALLBACKS.notifyEa),
        cell('🔥 Hot Deadlines', user.notify_hot_deadlines, CALLBACKS.notifyHd)
      ]
    ]
  };
}

async function sendGrantSettingsPanel(user: TelegramUserRow) {
  await callTelegramApi('sendMessage', {
    chat_id: user.telegram_chat_id,
    text: formatGrantNotifyPanelText(user),
    parse_mode: 'Markdown',
    reply_markup: buildGrantNotifyInlineKeyboard(user),
    disable_web_page_preview: true
  });
}

async function handleGrantNotifyToggle(
  user: TelegramUserRow,
  callback: TelegramCallbackQuery,
  field: GrantNotifyField
) {
  if (!user.app_user_id) {
    await sendTelegramMessage(
      user.telegram_chat_id,
      'Connect your ScholarshipTop account first to manage grant alerts.',
      buildProfileKeyboard(user)
    );
    return;
  }

  if (!callback.message?.message_id) return;

  const next = !user[field];
  const updated = await updateTelegramUserState(user.id, { [field]: next });
  const fresh = updated ?? { ...user, [field]: next };

  await callTelegramApi('editMessageText', {
    chat_id: user.telegram_chat_id,
    message_id: callback.message.message_id,
    text: formatGrantNotifyPanelText(fresh),
    parse_mode: 'Markdown',
    reply_markup: buildGrantNotifyInlineKeyboard(fresh),
    disable_web_page_preview: true
  });
}

function getAdminClient() {
  return createServiceRoleSupabaseClient();
}

function adminNotifyAnyCategoryEnabled(prefs: Json | null | undefined): boolean {
  return ADMIN_NOTIFY_KEYS.some((k) => isAdminNotifyCategoryEnabled(prefs, k));
}

async function getTelegramUserByTelegramId(telegramUserId: number) {
  const admin = getAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from('telegram_users')
    .select('*')
    .eq('telegram_user_id', telegramUserId)
    .maybeSingle();

  return data;
}

async function getAuthUserByEmail(email: string): Promise<AuthUserRow | null> {
  const url = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();
  if (!url || !serviceRoleKey) return null;

  const response = await fetch(
    `${url}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      },
      cache: 'no-store'
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('[telegram] auth admin email lookup failed', response.status, text);
    return null;
  }

  const payload = (await response.json().catch(() => null)) as
    | { users?: AuthUserRow[] }
    | null;
  const users = payload?.users ?? [];

  return (
    users.find((candidate) => candidate.email?.trim().toLowerCase() === email) ?? null
  );
}

async function getAuthUserById(userId: string): Promise<AuthUserRow | null> {
  const admin = getAdminClient();
  if (!admin) return null;

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) {
    console.error('[telegram] auth admin lookup by id failed', error.message);
    return null;
  }

  const user = data?.user;
  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    raw_user_meta_data:
      user.user_metadata && typeof user.user_metadata === 'object' && !Array.isArray(user.user_metadata)
        ? (user.user_metadata as Record<string, unknown>)
        : null
  };
}

async function upsertTelegramUser(params: {
  from: TelegramFrom;
  chatId: number;
  isStart?: boolean;
}): Promise<TelegramUserRow | null> {
  const admin = getAdminClient();
  if (!admin) return null;

  const existing = await getTelegramUserByTelegramId(params.from.id);
  const isAdmin = getTelegramAdminIds().has(params.from.id);
  const now = new Date().toISOString();

  const payload: Database['public']['Tables']['telegram_users']['Insert'] = {
    telegram_user_id: params.from.id,
    telegram_chat_id: params.chatId,
    telegram_username: params.from.username ?? null,
    telegram_first_name: params.from.first_name ?? null,
    telegram_last_name: params.from.last_name ?? null,
    app_user_id: existing?.app_user_id ?? null,
    is_admin: isAdmin,
    notifications_enabled: isAdmin ? true : existing?.notifications_enabled ?? false,
    admin_notification_prefs: existing?.admin_notification_prefs ?? {},
    notify_best_matches: existing?.notify_best_matches ?? false,
    notify_saved_filters: existing?.notify_saved_filters ?? false,
    notify_easy_apply: existing?.notify_easy_apply ?? false,
    notify_hot_deadlines: existing?.notify_hot_deadlines ?? false,
    last_state: existing?.last_state ?? 'idle',
    pending_email: existing?.pending_email ?? null,
    last_bot_started_at: params.isStart ? now : existing?.last_bot_started_at ?? null,
    last_interaction_at: now,
    updated_at: now
  };

  const { data, error } = await admin
    .from('telegram_users')
    .upsert(payload, { onConflict: 'telegram_user_id' })
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('[telegram] telegram_users upsert failed', error.message);
    return null;
  }

  return data;
}

async function updateTelegramUserState(
  userId: string,
  patch: Database['public']['Tables']['telegram_users']['Update']
) {
  const admin = getAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from('telegram_users')
    .update({
      ...patch,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('[telegram] telegram_users update failed', error.message);
    return null;
  }

  return data;
}

async function logTelegramEvent(
  eventType: TelegramEventType,
  payload: Record<string, Json>,
  options?: {
    dedupeByUserId?: string | null;
    /** Prefer for rows where dedupe must stay null but FK to auth user should be set (e.g. payments). */
    relatedUserId?: string | null;
    telegramChatId?: number | null;
  }
) {
  try {
    const admin = getAdminClient();
    if (!admin) return false;

    const relatedUserIdForInsert =
      options?.relatedUserId ?? options?.dedupeByUserId ?? null;

    if (options?.dedupeByUserId) {
      const { data: existing, error: dedupeErr } = await admin
        .from('telegram_event_logs')
        .select('id')
        .eq('event_type', eventType)
        .eq('related_user_id', options.dedupeByUserId)
        .limit(1)
        .maybeSingle();

      if (dedupeErr) {
        console.warn('[telegram] telegram_event_logs dedupe lookup failed', dedupeErr.message);
      }

      if (existing) {
        return false;
      }
    }

    const { error } = await admin.from('telegram_event_logs').insert({
      event_type: eventType,
      related_user_id: relatedUserIdForInsert,
      telegram_chat_id: options?.telegramChatId ?? null,
      payload
    });

    if (error) {
      console.error('[telegram] telegram_event_logs insert failed', error.message);
      return false;
    }

    return true;
  } catch (e) {
    console.error('[telegram] logTelegramEvent unexpected error', e);
    return false;
  }
}

async function sendTelegramAdminBroadcast(text: string, category: AdminNotifyCategory) {
  try {
    const chatIds = await collectTelegramAdminAlertChatIdsForCategory(category);
    if (chatIds.length === 0) {
      console.warn(
        '[telegram] sendTelegramAdminBroadcast: no recipient chat IDs (TELEGRAM_ADMIN_IDS / TELEGRAM_CHAT_ID / telegram_users admins)'
      );
      return;
    }
    for (const chatId of chatIds) {
      try {
        await sendTelegramMessage(chatId, text);
      } catch (e) {
        console.error('[telegram] sendTelegramAdminBroadcast chat failed', chatId, e);
      }
    }
  } catch (e) {
    console.error('[telegram] sendTelegramAdminBroadcast failed', e);
  }
}

/** Same recipients as {@link sendTelegramAdminBroadcast}, HTML body. */
async function sendTelegramAdminBroadcastHtml(text: string, category: AdminNotifyCategory) {
  try {
    const chatIds = await collectTelegramAdminAlertChatIdsForCategory(category);
    if (chatIds.length === 0) {
      console.warn(
        '[telegram] sendTelegramAdminBroadcastHtml: no recipient chat IDs (TELEGRAM_ADMIN_IDS / TELEGRAM_CHAT_ID / telegram_users admins)'
      );
      return;
    }
    for (const chatId of chatIds) {
      try {
        await sendTelegramMessage(chatId, text, undefined, { parse_mode: 'HTML' });
      } catch (e) {
        console.error('[telegram] sendTelegramAdminBroadcastHtml chat failed', chatId, e);
      }
    }
  } catch (e) {
    console.error('[telegram] sendTelegramAdminBroadcastHtml failed', e);
  }
}

/**
 * Human-readable landing line for admin Telegram: short path, clickable link without hash/tokens.
 * Defense-in-depth if a legacy or malformed URL still contains secrets.
 */
function formatVisitorFirstTouchLandingTelegramHtml(landingUrl: string): string {
  try {
    const u = new URL(landingUrl);
    u.hash = '';
    u.searchParams.delete('code');
    u.searchParams.delete('token_hash');
    const safeUrl = u.toString();
    const pathQuery = `${u.pathname}${u.search}` || '/';
    const displayPath =
      pathQuery.length > 160 ? `${pathQuery.slice(0, 157)}…` : pathQuery;

    const isSignin = u.pathname === '/signin' || u.pathname.startsWith('/signin/');
    const isAuthCallback =
      u.pathname === '/auth/callback' || u.pathname.startsWith('/auth/callback');

    let hint = '';
    if (isSignin) {
      hint =
        '\n<i>Страница входа: часто это открытие magic link из письма. Токены в чат не передаём.</i>';
    } else if (isAuthCallback) {
      hint =
        '\n<i>OAuth / подтверждение email — служебный redirect; параметры входа из ссылки убраны.</i>';
    }

    return (
      `<b>Landing:</b> <a href="${escapeTelegramHtml(safeUrl)}">${escapeTelegramHtml(displayPath)}</a>` +
      hint
    );
  } catch {
    return `<b>Landing:</b> ${escapeTelegramHtml(landingUrl)}`;
  }
}

/**
 * First-touch anonymous visit (after DB insert). Same audience as signup admin pings (env + DB admins).
 */
export async function notifyTelegramAdminsVisitorFirstTouch(payload: {
  trafficChannel: TrafficChannel;
  /** Normalized landing URL (no gclid/fbclid tail). */
  landingUrl: string;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  clickId?: string | null;
  clickIdParam?: 'gclid' | 'fbclid' | null;
}) {
  try {
    if (!getTelegramBotToken()) {
      console.warn(
        '[telegram] notifyTelegramAdminsVisitorFirstTouch: missing TELEGRAM_BOT_TOKEN'
      );
      return;
    }

    const channelDisplay = formatFirstTouchVisitorAlertLabel({
      traffic_channel: payload.trafficChannel,
      landing_url: payload.landingUrl,
      referrer: payload.referrer,
      utm_source: payload.utm_source,
      utm_medium: payload.utm_medium,
      utm_campaign: payload.utm_campaign
    });

    const lines: string[] = ['<b>New Visitor on ScholarshipTop!</b>'];
    const showGoogleAdsTag = payload.clickIdParam === 'gclid';
    const showPaidTag = payload.clickIdParam === 'fbclid';
    if (showGoogleAdsTag) {
      lines.push('', '💰 <b>Источник:</b> Google Ads');
    } else if (showPaidTag) {
      lines.push('', '🚀 <b>Источник:</b> Реклама');
    }
    lines.push(
      '',
      `<b>Channel:</b> ${escapeTelegramHtml(channelDisplay)}`,
      '',
      formatVisitorFirstTouchLandingTelegramHtml(payload.landingUrl)
    );

    const text = lines.join('\n');

    const sourceKey = getFirstTouchNotifySourceKey({
      traffic_channel: payload.trafficChannel,
      landing_url: payload.landingUrl,
      referrer: payload.referrer,
      utm_source: payload.utm_source,
      utm_medium: payload.utm_medium,
      utm_campaign: payload.utm_campaign
    });
    const chatIds = await collectTelegramAdminAlertChatIdsForTrafficSource(sourceKey);
    if (chatIds.length === 0) {
      console.warn(
        '[telegram] notifyTelegramAdminsVisitorFirstTouch: no recipient chat IDs for source',
        sourceKey
      );
      return;
    }
    for (const chatId of chatIds) {
      try {
        await sendTelegramMessage(chatId, text, undefined, { parse_mode: 'HTML' });
      } catch (e) {
        console.error('[telegram] notifyTelegramAdminsVisitorFirstTouch chat failed', chatId, e);
      }
    }
  } catch (e) {
    console.error('[telegram] notifyTelegramAdminsVisitorFirstTouch failed', e);
  }
}

/**
 * Plain-text admin alerts. Respects per-category prefs in `telegram_users.admin_notification_prefs`
 * (env-only admins without a row still receive all categories).
 */
export async function notifyEnvTelegramAdminsPlainText(
  text: string,
  category: AdminNotifyCategory = 'grants'
) {
  if (!getTelegramBotToken()) {
    console.warn('[telegram] notifyEnvTelegramAdminsPlainText: missing TELEGRAM_BOT_TOKEN');
    return;
  }
  const chatIds = await collectTelegramAdminAlertChatIdsForCategory(category);
  if (chatIds.length === 0) {
    console.warn(
      '[telegram] notifyEnvTelegramAdminsPlainText: no recipient chat IDs for category',
      category
    );
    return;
  }
  for (const chatId of chatIds) {
    try {
      await sendTelegramMessage(chatId, text);
    } catch (e) {
      console.error('[telegram] notifyEnvTelegramAdminsPlainText chat failed', chatId, e);
    }
  }
}

/** Successful URL Inspection (indexed) — category `seo` (admin toggles). */
export async function notifyAdminsScholarshipIndexed(payload: {
  title: string;
  url: string;
}) {
  const text = `🚀 Google проиндексировал страницу!\n\n${payload.title}\n${payload.url}`;
  await notifyEnvTelegramAdminsPlainText(text, 'seo');
}

/** Admin-only alert when a new row appears in `scholarships` (link uses slug when present). */
export async function notifyEnvTelegramAdminsNewScholarship(row: {
  id: string;
  slug?: string | null;
  title?: string | null;
}) {
  const title = row.title?.trim() || 'New scholarship';
  const path = scholarshipPublicPath({
    id: row.id,
    slug: row.slug ?? undefined
  });
  const url = `${getSiteUrl()}${path}`;
  const text = ['🆕 New grant', '', title, '', url].join('\n');
  await notifyEnvTelegramAdminsPlainText(text);
}

export async function notifyTelegramSignup(payload: {
  userId: string;
  email: string;
  firstName?: string | null;
  source?: string | null;
}) {
  try {
    const inserted = await logTelegramEvent(
      'signup',
      {
        email: payload.email,
        first_name: payload.firstName ?? null,
        source: payload.source ?? 'app'
      },
      { dedupeByUserId: payload.userId }
    );

    if (!inserted) {
      logRegistrationPipeline('TelegramNotificationSent', {
        event: 'signup',
        skipped: 'dedupe_or_log_failed',
        userId: payload.userId
      });
      return;
    }

    const emailSafe = escapeTelegramHtml(payload.email);
    const sourceSafe = escapeTelegramHtml(
      formatAdminSourceLabel(payload.source ?? 'app')
    );
    await sendTelegramAdminBroadcastHtml(
      [
        '<b>✨ Новая регистрация в ScholarshipTop</b>',
        '',
        `<b>Email:</b> ${emailSafe}`,
        `<b>Источник:</b> ${sourceSafe}`
      ].join('\n'),
      'auth'
    );
    logRegistrationPipeline('TelegramNotificationSent', {
      event: 'signup',
      userId: payload.userId,
      source: payload.source ?? 'app'
    });
  } catch (e) {
    console.error('[telegram] notifyTelegramSignup failed', e);
  }
}

export async function notifyTelegramEmailVerified(payload: {
  userId: string;
  email: string;
}) {
  try {
    const inserted = await logTelegramEvent(
      'email_verified',
      {
        email: payload.email
      },
      { dedupeByUserId: payload.userId }
    );

    if (!inserted) {
      logRegistrationPipeline('TelegramNotificationSent', {
        event: 'email_verified',
        skipped: 'dedupe_or_log_failed',
        userId: payload.userId
      });
      return;
    }

    const emailSafe = escapeTelegramHtml(payload.email);
    await sendTelegramAdminBroadcastHtml(
      [
        '<b>Пользователь подтвердил email</b> (флаг в <code>profiles</code> или GoTrue)',
        '',
        `<b>Email:</b> ${emailSafe}`
      ].join('\n'),
      'auth'
    );
    logRegistrationPipeline('TelegramNotificationSent', {
      event: 'email_verified',
      userId: payload.userId
    });
  } catch (e) {
    console.error('[telegram] notifyTelegramEmailVerified failed', e);
  }
}

/** Lemon often fires e.g. `subscription_cancelled` + `subscription_updated` within seconds — one admin ping is enough. */
const PAYMENT_ADMIN_TELEGRAM_DEDUP_MS = 120_000;

async function hasRecentPaymentAdminTelegram(userId: string): Promise<boolean> {
  const admin = getAdminClient();
  if (!admin) return false;
  const since = new Date(Date.now() - PAYMENT_ADMIN_TELEGRAM_DEDUP_MS).toISOString();
  const { data, error } = await admin
    .from('telegram_event_logs')
    .select('id')
    .eq('event_type', 'payment')
    .eq('related_user_id', userId)
    .gte('created_at', since)
    .limit(1);
  if (error) {
    console.warn('[telegram] payment dedup lookup failed', error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

export async function notifyTelegramPayment(payload: {
  userId: string;
  email?: string | null;
  plan: string;
  status: string;
  eventName?: string | null;
  /** Dedupe key for invoice-only billing hooks (e.g. subscription_payment_failed). */
  invoiceId?: string | null;
  source?: string | null;
}) {
  const skipAdminTelegram = await hasRecentPaymentAdminTelegram(payload.userId);

  await logTelegramEvent(
    'payment',
    {
      email: payload.email ?? null,
      plan: payload.plan,
      status: payload.status,
      event_name: payload.eventName ?? null,
      ...(payload.invoiceId ? { invoice_id: payload.invoiceId } : {}),
      ...(payload.source ? { source: payload.source } : {})
    },
    { dedupeByUserId: null, relatedUserId: payload.userId }
  );

  if (skipAdminTelegram) {
    return;
  }

  const text = [
    'Получено платежное событие',
    `Событие Lemon: ${formatLemonWebhookEventRu(payload.eventName)}`,
    `Тариф: ${formatAdminPlanLabel(payload.plan, payload.plan !== 'free')}`,
    `Статус в БД: ${formatAdminStatusLabel(payload.status)}`,
    `Пользователь: ${payload.email ?? payload.userId}`
  ].join('\n');

  await notifyEnvTelegramAdminsPlainText(text, 'billing');
}

async function sendWelcomeMessage(user: TelegramUserRow) {
  const site = getSiteUrl().replace(/&/g, '&amp;');
  const brand = `<a href="${site}">ScholarshipTop</a>`;
  const text = user.app_user_id
    ? [
        `Welcome back to ${brand}.`,
        'Your Telegram account is connected and ready to use.',
        '',
        'Use the menu below to open your profile or jump back into scholarship search.',
        '',
        'Use Alerts Setup or My Account to choose which grant notifications you receive.'
      ].join('\n')
    : [
        `Welcome to ${brand}.`,
        'I can help you explore scholarships, view your profile, and keep your account connected.',
        '',
        'Start by connecting your account with a secure email code.',
        '',
        'Open My Account below, link your ScholarshipTop account, then turn on notifications in Alerts Setup.'
      ].join('\n');

  await sendTelegramMessage(user.telegram_chat_id, text, buildMainKeyboard(), {
    parse_mode: 'HTML'
  });
}

/** Inline toggles (Best / Saved / Easy / Hot). If account not linked, taps show “connect first” (see handleGrantNotifyToggle). */
async function openScholarshipAlertsPanel(user: TelegramUserRow) {
  await sendGrantSettingsPanel(user);
}

async function sendProfileSummary(user: TelegramUserRow) {
  if (!user.app_user_id) {
    await sendTelegramMessage(
      user.telegram_chat_id,
      `Your Telegram account is not connected yet. Tap ${BUTTON_LABELS.connectAccount} first.`,
      buildProfileKeyboard(user)
    );
    return;
  }

  const admin = getAdminClient();
  if (!admin) return;

  const [authUser, profileResult] = await Promise.all([
    getAuthUserById(user.app_user_id),
    admin.from('profiles').select('*').eq('id', user.app_user_id).maybeSingle()
  ]);

  await sendTelegramMessage(
    user.telegram_chat_id,
    formatProfileMessage(authUser, profileResult.data),
    buildProfileKeyboard(user)
  );
}

const SAVED_LIST_MAX = 15;

/** YYYY-MM-DD from `deadline_date` / `deadline_text`, else em dash. */
function savedListIsoDate(s: Scholarship): string {
  if (s.deadlineAt) return s.deadlineAt.slice(0, 10);
  const t = s.deadline?.trim();
  if (t && /^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  return '—';
}

/** Extra deadline text when it is more than a bare ISO date (ISO is shown in the previous column). */
function savedListDeadlinePart(isoDate: string, deadlineText: string | undefined): string {
  const raw = deadlineText?.trim() || '';
  if (!raw) return '—';
  if (raw === isoDate || raw.replace(/\s/g, '') === isoDate) return '—';
  return raw;
}

async function sendSavedScholarshipsList(user: TelegramUserRow) {
  if (!user.app_user_id) {
    await sendTelegramMessage(
      user.telegram_chat_id,
      `Connect your ScholarshipTop account first (${BUTTON_LABELS.myProfile} → ${BUTTON_LABELS.connectAccount}), then saved grants will show here.`,
      buildMainKeyboard()
    );
    return;
  }

  const admin = getAdminClient();
  if (!admin) {
    await sendTelegramMessage(
      user.telegram_chat_id,
      'Service unavailable. Try again later.',
      buildMainKeyboard()
    );
    return;
  }

  const { data: saves, error: savesErr } = await admin
    .from('user_saved_scholarships')
    .select('scholarship_id')
    .eq('user_id', user.app_user_id)
    .order('created_at', { ascending: false })
    .limit(SAVED_LIST_MAX);

  if (savesErr) {
    console.error('[telegram] user_saved_scholarships select', savesErr.message);
    await sendTelegramMessage(
      user.telegram_chat_id,
      'Could not load saved grants. If this persists, the saved list table may not be set up yet.',
      buildMainKeyboard()
    );
    return;
  }

  const ids = (saves ?? []).map((r) => r.scholarship_id).filter(Boolean) as string[];
  if (ids.length === 0) {
    const site = getSiteUrl();
    await sendTelegramMessage(
      user.telegram_chat_id,
      [
        '<b>Saved scholarships</b>',
        '',
        'No saved grants yet.',
        'Tap <b>Save</b> on a grant card in this chat, or save hearts on the website.',
        '',
        `<a href="${site}${SCHOLARSHIPS_HUB_SAVED_TAB_HREF}">Open saved list on the site</a>`
      ].join('\n'),
      buildMainKeyboard(),
      { parse_mode: 'HTML' }
    );
    return;
  }

  let list: Scholarship[];
  try {
    list = await fetchScholarshipsByIdsForListing(admin as never, ids);
  } catch (e) {
    console.error('[telegram] fetchScholarshipsByIdsForListing', e);
    await sendTelegramMessage(
      user.telegram_chat_id,
      'Could not load grant details. Try again later.',
      buildMainKeyboard()
    );
    return;
  }

  const site = getSiteUrl().replace(/\/+$/, '');
  const lines: string[] = ['<b>Saved scholarships</b>', ''];
  let n = 0;
  for (const s of list) {
    n += 1;
    const path = scholarshipPublicPath(s);
    const href = `${site}${path}`;
    const title = escapeTelegramHtml(s.title?.trim() || 'Scholarship');
    const iso = savedListIsoDate(s);
    const dlPart = savedListDeadlinePart(iso, s.deadline);
    const amt = (s.amount || s.awardAmount)?.trim() || '—';
    lines.push(
      `${n}. <a href="${href}">${title}</a> - ${escapeTelegramHtml(iso)} - ${escapeTelegramHtml(
        dlPart
      )} - ${escapeTelegramHtml(amt)}`
    );
  }
  if (ids.length > list.length) {
    lines.push('', '<i>Some entries could not be loaded.</i>');
  }
  lines.push(
    '',
    `<a href="${site}${SCHOLARSHIPS_HUB_SAVED_TAB_HREF}">Full list on ScholarshipTop</a>`
  );

  const text = lines.join('\n');
  await sendTelegramMessage(user.telegram_chat_id, text, buildMainKeyboard(), {
    parse_mode: 'HTML'
  });
}

async function sendAdminPanel(user: TelegramUserRow) {
  if (!user.is_admin) {
    await sendTelegramMessage(
      user.telegram_chat_id,
      'Admin access is not enabled for this Telegram account.',
      buildProfileKeyboard(user)
    );
    return;
  }

  const admin = getAdminClient();
  if (!admin) return;

  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const countQuery = (eventType: TelegramEventType) =>
    admin
      .from('telegram_event_logs')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', eventType)
      .gte('created_at', sinceIso);

  const [
    signupCount,
    verifiedCount,
    paymentCount,
    profilesCreated24h,
    profilesCreated24hVerified,
    humanVisitorsResult,
    botVisitorsCount
  ] = await Promise.all([
    countQuery('signup'),
    countQuery('email_verified'),
    countQuery('payment'),
    admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sinceIso),
    admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sinceIso)
      .eq('email_verified', true),
    admin
      .from('anonymous_visitor_first_touch')
      .select('*')
      .eq('is_likely_bot', false)
      .gte('created_at', sinceIso),
    admin
      .from('anonymous_visitor_first_touch')
      .select('*', { count: 'exact', head: true })
      .eq('is_likely_bot', true)
      .gte('created_at', sinceIso)
  ]);

  const trafficLines: string[] = [];
  if (humanVisitorsResult.error) {
    const e = humanVisitorsResult.error;
    console.error(
      '[telegram] admin panel anonymous_visitor_first_touch (humans)',
      e.message,
      e.code,
      e.details
    );
    const hint = [e.code, e.message].filter(Boolean).join(': ').slice(0, 180);
    trafficLines.push(
      hint
        ? `• Не удалось загрузить источники — ${hint}`
        : '• Не удалось загрузить источники (см. логи сервера)'
    );
  } else {
    const rows = humanVisitorsResult.data ?? [];
    if (rows.length === 0) {
      trafficLines.push('• Нет первых визитов людей за период');
    } else {
      const counts = new Map<string, number>();
      for (const row of rows) {
        const label = labelForVisitorRow(row);
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      const sorted = [...counts.entries()].sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0], 'en');
      });
      for (const [label, n] of sorted) {
        trafficLines.push(`• ${label} — ${n}`);
      }
    }
  }

  if (botVisitorsCount.error) {
    console.error(
      '[telegram] admin panel anonymous_visitor_first_touch (bots count)',
      botVisitorsCount.error.message,
      botVisitorsCount.error.code,
      botVisitorsCount.error.details
    );
  }

  const botLine =
    botVisitorsCount.error != null
      ? (() => {
          const e = botVisitorsCount.error;
          const hint = [e.code, e.message].filter(Boolean).join(': ').slice(0, 160);
          return hint
            ? `Оценка ботов (24ч): ошибка — ${hint}`
            : 'Оценка ботов (24ч): не удалось загрузить';
        })()
      : `Оценка ботов по UA (24ч): ${botVisitorsCount.count ?? 0}`;

  const profilesLine =
    profilesCreated24h.error != null || profilesCreated24hVerified.error != null
      ? 'Профили за 24ч (БД): не удалось загрузить (см. логи сервера)'
      : `Профили за 24ч (БД, created_at): ${profilesCreated24h.count ?? 0} — из них email_verified=true: ${profilesCreated24hVerified.count ?? 0}`;

  await sendTelegramMessage(
    user.telegram_chat_id,
    [
      'Админ-панель ScholarshipTop',
      '',
      `Админ-алерты: ${user.notifications_enabled ? 'настройка — кнопка «🔔 Admin alerts»' : 'выкл. (открой «🔔 Admin alerts»)'}`,
      `Регистрации за 24ч (лог Telegram, signup): ${signupCount.count ?? 0}`,
      `Подтверждения email за 24ч (лог Telegram): ${verifiedCount.count ?? 0}`,
      profilesLine,
      `Платежи за 24ч: ${paymentCount.count ?? 0}`,
      '',
      'Трафик за 24ч — люди (первые визиты по каналу)',
      ...trafficLines,
      '',
      botLine
    ].join('\n'),
    buildProfileKeyboard(user)
  );
}

async function sendSeoQueueReport(user: TelegramUserRow) {
  const envAdmin = getTelegramAdminIds().has(Number(user.telegram_user_id));
  if (!user.is_admin && !envAdmin) {
    await sendTelegramMessage(
      user.telegram_chat_id,
      'Только для админов.',
      buildProfileKeyboard(user)
    );
    return;
  }

  const site = getSiteUrl();
  const startRaw = process.env.SEO_DRIP_START_DATE?.trim() || '(не задано)';
  const pphRaw = process.env.SEO_PAGES_PER_HOUR?.trim() ?? '(не задано)';
  const snap = getSeoDripFeedSnapshot();

  const lines: string[] = [
    '📊 SEO drip — снимок с сервера',
    `(копируй блок целиком для анализа; Google Search Console сюда не входит)`,
    '',
    `Сайт: ${site}`,
    `SEO_DRIP_START_DATE: ${startRaw}`,
    `SEO_PAGES_PER_HOUR: ${pphRaw}`,
    `Drip включён: ${snap.active ? 'да' : 'нет (нет одной из env или 0)'}`
  ];

  if (!snap.active) {
    lines.push(
      '',
      'Пока drip выключен — все пути из очереди не режутся этим механизмом (см. код seoDripFeed).'
    );
    await sendTelegramMessage(user.telegram_chat_id, lines.join('\n'), buildProfileKeyboard(user));
    return;
  }

  const { orderedQueue, limit } = snap;
  const n = orderedQueue.length;
  const unlocked = Math.min(limit, n);
  const remaining = Math.max(0, n - unlocked);

  lines.push(
    `Всего URL в data/seo-pending-queue.json: ${n}`,
    `Текущий лимит (слоты×страниц/час): ${limit}`,
    `Уже «открыто» первых в списке: ${unlocked}`,
    `Ещё ждут очереди: ${remaining}`,
    '',
    'Уже открытые (до 10 путей):'
  );
  for (const p of orderedQueue.slice(0, Math.min(10, unlocked))) {
    lines.push(`• ${site}/scholarships/${p}`);
  }
  if (unlocked === 0) {
    lines.push('— пока 0 (проверь дату старта и лимит)');
  }

  lines.push('', 'Следующие в очереди (до 15):');
  for (const p of orderedQueue.slice(unlocked, unlocked + 15)) {
    lines.push(`• ${site}/scholarships/${p}`);
  }
  if (remaining === 0) {
    lines.push('— очередь полностью открыта');
  }

  const text = lines.join('\n');
  if (text.length > 4000) {
    await sendTelegramMessage(
      user.telegram_chat_id,
      text.slice(0, 3990) + '\n…(обрезано)',
      buildProfileKeyboard(user)
    );
    return;
  }

  await sendTelegramMessage(user.telegram_chat_id, text, buildProfileKeyboard(user));
}

/** Shown when the user taps “Sync Account” but Telegram is already linked (app_user_id set). */
async function sendAlreadyLinkedSyncAck(user: TelegramUserRow) {
  const nextUser = await updateTelegramUserState(user.id, {
    last_state: 'idle',
    pending_email: null
  });
  const kbUser = nextUser ?? user;

  await sendTelegramMessage(
    user.telegram_chat_id,
    [
      "You're all set — this Telegram chat is already linked to your ScholarshipTop account.",
      '',
      'Notifications and account features use this connection, so there is no need to enter your email again.',
      '',
      'Open My Account to review your profile, or Alerts Setup to choose which grant alerts you receive.'
    ].join('\n'),
    buildProfileKeyboard(kbUser)
  );
}

async function startConnectFlow(user: TelegramUserRow) {
  const nextUser = await updateTelegramUserState(user.id, {
    last_state: 'awaiting_email',
    pending_email: null
  });

  await sendTelegramMessage(
    user.telegram_chat_id,
    [
      'Send the email address you use on ScholarshipTop.',
      'I will email you a one-time code and then connect your Telegram account securely.',
      '',
      'Important: type your email in this chat as the next message (plain text). The code is sent only after I receive your email — not when you tap Connect.'
    ].join('\n'),
    buildProfileKeyboard(nextUser ?? user)
  );
}

async function handleEmailInput(user: TelegramUserRow, rawText: string) {
  const email = rawText.trim().toLowerCase();

  if (!isValidEmail(email)) {
    await sendTelegramMessage(
      user.telegram_chat_id,
      'That does not look like a valid email address. Please send a valid email.',
      buildProfileKeyboard(user)
    );
    return;
  }

  const admin = getAdminClient();
  if (!admin) return;

  const authUser = await getAuthUserByEmail(email);
  if (!authUser?.id || !authUser.email) {
    await sendTelegramMessage(
      user.telegram_chat_id,
      'I could not find a ScholarshipTop account for that email. Try another one or sign up on the site first.',
      buildProfileKeyboard(user)
    );
    return;
  }

  const code = String(randomInt(100000, 1000000));
  const emailResult = await sendTelegramLinkCodeEmail(authUser.email, code, {
    displayName:
      typeof authUser.raw_user_meta_data?.first_name === 'string'
        ? authUser.raw_user_meta_data.first_name
        : null
  });

  if (!emailResult.ok) {
    await sendTelegramMessage(
      user.telegram_chat_id,
      'I could not send the email code right now. Please try again in a minute.',
      buildProfileKeyboard(user)
    );
    return;
  }

  await admin
    .from('telegram_link_codes')
    .update({
      used_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('telegram_user_uuid', user.id)
    .is('used_at', null);

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await admin.from('telegram_link_codes').insert({
    telegram_user_uuid: user.id,
    app_user_id: authUser.id,
    email: authUser.email,
    code_hash: createTelegramCodeHash(code),
    expires_at: expiresAt
  });

  const nextUser = await updateTelegramUserState(user.id, {
    last_state: 'awaiting_code',
    pending_email: authUser.email
  });

  await sendTelegramMessage(
    user.telegram_chat_id,
    [
      `I sent a 6-digit code to ${authUser.email}.`,
      'Reply with that code here. It expires in 10 minutes.'
    ].join('\n'),
    buildProfileKeyboard(nextUser ?? user)
  );
}

async function handleCodeInput(user: TelegramUserRow, rawText: string) {
  const code = rawText.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) {
    await sendTelegramMessage(
      user.telegram_chat_id,
      'Please send the 6-digit code from your email.',
      buildProfileKeyboard(user)
    );
    return;
  }

  const admin = getAdminClient();
  if (!admin) return;

  const { data: codeRow } = await admin
    .from('telegram_link_codes')
    .select('*')
    .eq('telegram_user_uuid', user.id)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!codeRow) {
    const nextUser = await updateTelegramUserState(user.id, {
      last_state: 'awaiting_email',
      pending_email: null
    });
    await sendTelegramMessage(
      user.telegram_chat_id,
      'Your code is missing or expired. Send your email again to request a new one.',
      buildProfileKeyboard(nextUser ?? user)
    );
    return;
  }

  if (new Date(codeRow.expires_at).getTime() < Date.now()) {
    await admin
      .from('telegram_link_codes')
      .update({
        used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', codeRow.id);

    const nextUser = await updateTelegramUserState(user.id, {
      last_state: 'awaiting_email',
      pending_email: null
    });

    await sendTelegramMessage(
      user.telegram_chat_id,
      'That code has expired. Send your email again and I will issue a new code.',
      buildProfileKeyboard(nextUser ?? user)
    );
    return;
  }

  const expectedHash = createTelegramCodeHash(code);
  if (expectedHash !== codeRow.code_hash) {
    const attempts = (codeRow.attempts ?? 0) + 1;
    await admin
      .from('telegram_link_codes')
      .update({
        attempts,
        updated_at: new Date().toISOString()
      })
      .eq('id', codeRow.id);

    if (attempts >= 5) {
      await admin
        .from('telegram_link_codes')
        .update({
          used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', codeRow.id);

      const resetUser = await updateTelegramUserState(user.id, {
        last_state: 'awaiting_email',
        pending_email: null
      });

      await sendTelegramMessage(
        user.telegram_chat_id,
        'Too many incorrect attempts. Send your email again to request a fresh code.',
        buildProfileKeyboard(resetUser ?? user)
      );
      return;
    }

    await sendTelegramMessage(
      user.telegram_chat_id,
      `That code is incorrect. Attempts left: ${Math.max(0, 5 - attempts)}.`,
      buildProfileKeyboard(user)
    );
    return;
  }

  if (codeRow.app_user_id) {
    await admin
      .from('telegram_users')
      .update({
        app_user_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('app_user_id', codeRow.app_user_id)
      .neq('id', user.id);
  }

  await admin
    .from('telegram_link_codes')
    .update({
      used_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', codeRow.id);

  const linkedUser = await updateTelegramUserState(user.id, {
    app_user_id: codeRow.app_user_id ?? null,
    last_state: 'idle',
    pending_email: null
  });

  if (!linkedUser) return;

  await sendTelegramMessage(
    linkedUser.telegram_chat_id,
    'Your ScholarshipTop account is now connected to Telegram.',
    buildProfileKeyboard(linkedUser)
  );
  await sendProfileSummary(linkedUser);
}

function formatAdminNotifyPanelHtml(user: TelegramUserRow): string {
  const master = user.notifications_enabled;
  const lines = [
    '<b>Админ-уведомления</b>',
    master
      ? 'Серверные пинги (не путать с грантами в Alerts Setup).'
      : '<i>Все типы выключены.</i> Нажми «Включить все» или включи отдельные пункты.',
    ''
  ];
  for (const k of ADMIN_NOTIFY_KEYS) {
    const on =
      master && isAdminNotifyCategoryEnabled(user.admin_notification_prefs, k);
    lines.push(`${on ? '✅' : '❌'} ${ADMIN_NOTIFY_LABEL_RU[k]}`);
  }
  return lines.join('\n');
}

function buildAdminNotifyInlineKeyboard(user: TelegramUserRow): TelegramReplyMarkup {
  const rows: TelegramInlineButton[][] = [];
  if (!user.notifications_enabled) {
    rows.push([
      button('✅ Включить все категории', ADMIN_NOTIFY_ENABLE_ALL_CALLBACK)
    ]);
  }
  for (const k of ADMIN_NOTIFY_KEYS) {
    const on =
      user.notifications_enabled &&
      isAdminNotifyCategoryEnabled(user.admin_notification_prefs, k);
    if (k === 'traffic') {
      const row: TelegramInlineButton[] = [
        button(
          `${on ? '✅' : '❌'} ${ADMIN_NOTIFY_LABEL_RU[k]}`,
          `${ADMIN_NOTIFY_CALLBACK_PREFIX}${k}`
        )
      ];
      if (on) {
        row.push(button('⚙️ Источники', ADMIN_NOTIFY_TRAFFIC_MENU_CALLBACK));
      }
      rows.push(row);
    } else {
      rows.push([
        button(
          `${on ? '✅' : '❌'} ${ADMIN_NOTIFY_LABEL_RU[k]}`,
          `${ADMIN_NOTIFY_CALLBACK_PREFIX}${k}`
        )
      ]);
    }
  }
  return { inline_keyboard: rows };
}

function formatTrafficSourcesPanelHtml(user: TelegramUserRow): string {
  const lines = [
    '<b>Первый визит — источники</b>',
    'Включи только нужные каналы. Пока список не трогали — пуши приходят со всех источников.',
    ''
  ];
  for (const k of FIRST_TOUCH_NOTIFY_SOURCE_KEYS) {
    const on = isTrafficNotifySourceEnabled(user.admin_notification_prefs, k);
    lines.push(`${on ? '✅' : '❌'} ${FIRST_TOUCH_NOTIFY_LABEL_RU[k]}`);
  }
  return lines.join('\n');
}

function buildTrafficSourcesInlineKeyboard(user: TelegramUserRow): TelegramReplyMarkup {
  const rows: TelegramInlineButton[][] = [];
  for (const k of FIRST_TOUCH_NOTIFY_SOURCE_KEYS) {
    const on = isTrafficNotifySourceEnabled(user.admin_notification_prefs, k);
    rows.push([
      button(
        `${on ? '✅' : '❌'} ${FIRST_TOUCH_NOTIFY_LABEL_RU[k]}`,
        `${ADMIN_NOTIFY_TRAFFIC_SRC_PREFIX}${k}`
      )
    ]);
  }
  rows.push([button('← Назад', ADMIN_NOTIFY_TRAFFIC_BACK_CALLBACK)]);
  return { inline_keyboard: rows };
}

async function sendAdminNotificationSettingsPanel(user: TelegramUserRow) {
  if (!user.is_admin) {
    await sendTelegramMessage(
      user.telegram_chat_id,
      'Admin access is not enabled for this Telegram account.',
      buildProfileKeyboard(user)
    );
    return;
  }

  await sendTelegramMessage(
    user.telegram_chat_id,
    formatAdminNotifyPanelHtml(user),
    buildAdminNotifyInlineKeyboard(user),
    { parse_mode: 'HTML' }
  );
}

async function handleAdminNotifyCallback(
  user: TelegramUserRow,
  callback: TelegramCallbackQuery,
  data: string
) {
  if (!user.is_admin) {
    if (callback.id) {
      await answerTelegramCallbackQuery(callback.id, 'Not an admin.');
    }
    return;
  }

  if (!callback.message?.message_id) {
    if (callback.id) {
      await answerTelegramCallbackQuery(callback.id);
    }
    return;
  }

  if (data === ADMIN_NOTIFY_TRAFFIC_MENU_CALLBACK) {
    await callTelegramApi('editMessageText', {
      chat_id: user.telegram_chat_id,
      message_id: callback.message.message_id,
      text: formatTrafficSourcesPanelHtml(user),
      parse_mode: 'HTML',
      reply_markup: buildTrafficSourcesInlineKeyboard(user),
      disable_web_page_preview: true
    });
    if (callback.id) {
      await answerTelegramCallbackQuery(callback.id);
    }
    return;
  }

  if (data === ADMIN_NOTIFY_TRAFFIC_BACK_CALLBACK) {
    await callTelegramApi('editMessageText', {
      chat_id: user.telegram_chat_id,
      message_id: callback.message.message_id,
      text: formatAdminNotifyPanelHtml(user),
      parse_mode: 'HTML',
      reply_markup: buildAdminNotifyInlineKeyboard(user),
      disable_web_page_preview: true
    });
    if (callback.id) {
      await answerTelegramCallbackQuery(callback.id);
    }
    return;
  }

  const trafficSrc = parseFirstTouchNotifyCallback(data);
  if (trafficSrc) {
    const newPrefs = toggleTrafficNotifySource(user.admin_notification_prefs, trafficSrc);
    const nextUser = await updateTelegramUserState(user.id, {
      admin_notification_prefs: newPrefs
    });
    const fresh = nextUser ?? user;
    await callTelegramApi('editMessageText', {
      chat_id: user.telegram_chat_id,
      message_id: callback.message.message_id,
      text: formatTrafficSourcesPanelHtml(fresh),
      parse_mode: 'HTML',
      reply_markup: buildTrafficSourcesInlineKeyboard(fresh),
      disable_web_page_preview: true
    });
    if (callback.id) {
      await answerTelegramCallbackQuery(callback.id);
    }
    return;
  }

  let nextUser: TelegramUserRow | null = null;

  if (data === ADMIN_NOTIFY_ENABLE_ALL_CALLBACK) {
    nextUser = await updateTelegramUserState(user.id, {
      notifications_enabled: true,
      admin_notification_prefs: {}
    });
  } else {
    const cat = parseAdminNotifyCallback(data);
    if (!cat) {
      if (callback.id) {
        await answerTelegramCallbackQuery(callback.id);
      }
      return;
    }
    const newPrefs = toggleAdminNotifyCategory(user.admin_notification_prefs, cat);
    const anyOn = adminNotifyAnyCategoryEnabled(newPrefs);
    nextUser = await updateTelegramUserState(user.id, {
      admin_notification_prefs: newPrefs,
      notifications_enabled: anyOn
    });
  }

  const fresh = nextUser ?? user;
  await callTelegramApi('editMessageText', {
    chat_id: user.telegram_chat_id,
    message_id: callback.message.message_id,
    text: formatAdminNotifyPanelHtml(fresh),
    parse_mode: 'HTML',
    reply_markup: buildAdminNotifyInlineKeyboard(fresh),
    disable_web_page_preview: true
  });

  if (callback.id) {
    await answerTelegramCallbackQuery(callback.id);
  }
}

/** Admin-only: preview the latest published /resources article card in this chat. */
async function sendTestResourceCard(user: TelegramUserRow) {
  const admin = getAdminClient();
  if (!admin) {
    await sendTelegramMessage(
      user.telegram_chat_id,
      'Database is not configured.',
      buildMainKeyboard()
    );
    return;
  }

  const { data: post, error } = await admin
    .from('content_posts')
    .select('title, slug, meta_description, cover_image_url, status')
    .eq('status', 'published')
    .not('slug', 'is', null)
    .neq('slug', '')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[telegram] /testresources query failed', error.message);
    await sendTelegramMessage(
      user.telegram_chat_id,
      'Could not load resources from the database.',
      buildProfileKeyboard(user)
    );
    return;
  }

  if (!post?.slug) {
    await sendTelegramMessage(
      user.telegram_chat_id,
      'No published resource with a slug was found.',
      buildProfileKeyboard(user)
    );
    return;
  }

  const ok = await sendTelegramResourceNotification(
    {
      title: post.title ?? 'Article',
      description: post.meta_description,
      image_url: post.cover_image_url,
      slug: post.slug
    },
    { targetChatIds: [user.telegram_chat_id] }
  );

  if (!ok) {
    await sendTelegramMessage(
      user.telegram_chat_id,
      'Failed to send the preview. Check TELEGRAM_BOT_TOKEN and that the bot can message this chat.',
      buildProfileKeyboard(user)
    );
  }
}

/** Listing URL aligned with site routing (slug when present). */
async function getGrantListingFullUrl(
  admin: NonNullable<ReturnType<typeof createServiceRoleSupabaseClient>>,
  scholarshipId: string
): Promise<string> {
  const site = getSiteUrl();
  const { data } = await admin
    .from('scholarships')
    .select('id, slug')
    .eq('id', scholarshipId)
    .maybeSingle();
  const row = data as { id: string; slug: string | null } | null;
  if (row?.id) {
    return `${site}${scholarshipPublicPath({ id: row.id, slug: row.slug ?? undefined })}`;
  }
  return `${site}/scholarships/${scholarshipId}`;
}

/** Admin-only: sample scholarship card in DM (matches production grant formatting). */
async function sendTestGrantPreview(user: TelegramUserRow) {
  const scholarship = await fetchFirstActiveScholarshipPreview();
  if (!scholarship) {
    await sendTelegramMessage(
      user.telegram_chat_id,
      'No active scholarship was found for a preview.',
      buildProfileKeyboard(user)
    );
    return;
  }

  let savedInitially = false;
  const admin = getAdminClient();
  if (admin && user.app_user_id) {
    savedInitially = await userHasSavedScholarship(admin, user.app_user_id, scholarship.id);
  }

  const ok = await sendScholarshipTelegramCardToChat(user.telegram_chat_id, scholarship, {
    categoryLabel: grantNotifyTelegramCardCategoryLabel('best'),
    savedInitially
  });
  if (!ok) {
    await sendTelegramMessage(
      user.telegram_chat_id,
      'Failed to send the grant preview. Check TELEGRAM_BOT_TOKEN.',
      buildProfileKeyboard(user)
    );
  }
}

async function handleTelegramGrantSaveCallback(
  user: TelegramUserRow,
  callback: TelegramCallbackQuery,
  rawData: string
) {
  if (!callback.message?.message_id) return;

  const scholarshipId = rawData.slice(TELEGRAM_GRANT_SAVE_CALLBACK_PREFIX.length).trim();
  if (!isLikelyScholarshipUuid(scholarshipId)) {
    if (callback.id) {
      await answerTelegramCallbackQuery(callback.id, 'Invalid grant link.');
    }
    return;
  }

  if (!user.app_user_id) {
    if (callback.id) {
      await answerTelegramCallbackQuery(
        callback.id,
        'Link your ScholarshipTop account first (My Account → Connect).'
      );
    }
    return;
  }

  const admin = getAdminClient();
  if (!admin) {
    if (callback.id) {
      await answerTelegramCallbackQuery(callback.id, 'Service unavailable.');
    }
    return;
  }

  const ok = await addUserSavedScholarship(admin, user.app_user_id, scholarshipId);
  if (!ok) {
    if (callback.id) {
      await answerTelegramCallbackQuery(callback.id, 'Could not save. Try again later.');
    }
    return;
  }

  const listingFullUrl = await getGrantListingFullUrl(admin, scholarshipId);
  await editScholarshipGrantCardReplyMarkup(
    user.telegram_chat_id,
    callback.message.message_id,
    listingFullUrl,
    scholarshipId,
    true
  );

  if (callback.id) {
    await answerTelegramCallbackQuery(callback.id, 'Saved to your account');
  }
}

async function handleTelegramGrantUnsaveCallback(
  user: TelegramUserRow,
  callback: TelegramCallbackQuery,
  rawData: string
) {
  if (!callback.message?.message_id) return;

  const scholarshipId = rawData.slice(TELEGRAM_GRANT_SAVED_ACK_PREFIX.length).trim();
  if (!isLikelyScholarshipUuid(scholarshipId)) {
    if (callback.id) {
      await answerTelegramCallbackQuery(callback.id, 'Invalid grant link.');
    }
    return;
  }

  if (!user.app_user_id) {
    if (callback.id) {
      await answerTelegramCallbackQuery(
        callback.id,
        'Link your ScholarshipTop account first (My Account → Connect).'
      );
    }
    return;
  }

  const admin = getAdminClient();
  if (!admin) {
    if (callback.id) {
      await answerTelegramCallbackQuery(callback.id, 'Service unavailable.');
    }
    return;
  }

  const ok = await removeUserSavedScholarship(admin, user.app_user_id, scholarshipId);
  if (!ok) {
    if (callback.id) {
      await answerTelegramCallbackQuery(callback.id, 'Could not update. Try again later.');
    }
    return;
  }

  const listingFullUrl = await getGrantListingFullUrl(admin, scholarshipId);
  await editScholarshipGrantCardReplyMarkup(
    user.telegram_chat_id,
    callback.message.message_id,
    listingFullUrl,
    scholarshipId,
    false
  );

  if (callback.id) {
    await answerTelegramCallbackQuery(callback.id, 'Removed from saved');
  }
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const message = update.message;
  const callback = update.callback_query;

  if (message?.chat?.type !== 'private' && callback?.message?.chat?.type !== 'private') {
    if (callback?.id) {
      await answerTelegramCallbackQuery(callback.id, 'Please use me in a private chat.');
    }
    return;
  }

  if (message?.from && message.chat) {
    const rawText = message.text?.trim() || '';
    const user = await upsertTelegramUser({
      from: message.from,
      chatId: message.chat.id,
      isStart: rawText.toLowerCase().startsWith('/start')
    });
    if (!user) return;

    const text = rawText;
    if (text.toLowerCase().startsWith('/start')) {
      await logTelegramEvent(
        'bot_start',
        {
          telegram_user_id: user.telegram_user_id,
          is_admin: user.is_admin
        },
        { telegramChatId: user.telegram_chat_id }
      );
      await sendWelcomeMessage(user);
      return;
    }

    const lower = text.toLowerCase();
    if (lower === '/menu' || lower === '/help') {
      await sendTelegramMessage(user.telegram_chat_id, MAIN_MENU_REPLY, buildMainKeyboard());
      return;
    }

    if (normalizeBotCommand(text) === '/testresources') {
      if (!getTelegramAdminIds().has(message.from.id)) {
        await sendTelegramMessage(
          user.telegram_chat_id,
          'This command is only available to admins.',
          buildMainKeyboard()
        );
        return;
      }
      await sendTestResourceCard(user);
      return;
    }

    if (normalizeBotCommand(text) === '/testgrant') {
      if (!getTelegramAdminIds().has(message.from.id)) {
        await sendTelegramMessage(
          user.telegram_chat_id,
          'This command is only available to admins.',
          buildMainKeyboard()
        );
        return;
      }
      await sendTestGrantPreview(user);
      return;
    }

    if (normalizeBotCommand(text) === '/seoreport') {
      if (!getTelegramAdminIds().has(message.from.id)) {
        await sendTelegramMessage(
          user.telegram_chat_id,
          'This command is only available to admins.',
          buildMainKeyboard()
        );
        return;
      }
      await sendSeoQueueReport(user);
      return;
    }

    if (normalizeBotCommand(text) === '/seo') {
      if (!getTelegramAdminIds().has(message.from.id)) {
        await sendTelegramMessage(
          user.telegram_chat_id,
          'This command is only available to admins.',
          buildMainKeyboard()
        );
        return;
      }
      const result = await fetchSearchAppearancePageCount({ days: 30 });
      if (!result.ok) {
        await sendTelegramMessage(
          user.telegram_chat_id,
          `📊 Статистика SEO: не удалось загрузить данные. ${result.error}`,
          buildMainKeyboard()
        );
        return;
      }
      await sendTelegramMessage(
        user.telegram_chat_id,
        `📊 Статистика SEO: Всего страниц в поиске за последние 30 дней: ${result.count}`,
        buildMainKeyboard()
      );
      return;
    }

    if (text === BUTTON_LABELS.backToMenu) {
      await sendTelegramMessage(user.telegram_chat_id, MAIN_MENU_REPLY, buildMainKeyboard());
      return;
    }

    if (text === BUTTON_LABELS.findScholarships) {
      await openScholarshipAlertsPanel(user);
      return;
    }

    if (text === BUTTON_LABELS.myProfile) {
      await sendProfileSummary(user);
      return;
    }

    if (text === BUTTON_LABELS.savedScholarships || text === LEGACY_SAVED_SCHOLARSHIPS_BUTTON) {
      await sendSavedScholarshipsList(user);
      return;
    }

    if (text === BUTTON_LABELS.connectAccount) {
      await startConnectFlow(user);
      return;
    }

    if (text === BUTTON_LABELS.reconnectAccount) {
      if (user.app_user_id) {
        await sendAlreadyLinkedSyncAck(user);
      } else {
        await startConnectFlow(user);
      }
      return;
    }

    if (text === BUTTON_LABELS.admin) {
      await sendAdminPanel(user);
      return;
    }

    if (text === LEGACY_SEO_QUEUE_REPORT_BUTTON) {
      await sendSeoQueueReport(user);
      return;
    }

    if (
      text === BUTTON_LABELS.adminAlertsMenu ||
      text === LEGACY_ADMIN_ALERTS_ON ||
      text === LEGACY_ADMIN_ALERTS_OFF
    ) {
      await sendAdminNotificationSettingsPanel(user);
      return;
    }

    if (user.last_state === 'awaiting_email') {
      await handleEmailInput(user, text);
      return;
    }

    if (user.last_state === 'awaiting_code') {
      await handleCodeInput(user, text);
      return;
    }

    await sendTelegramMessage(
      user.telegram_chat_id,
      'Use the buttons below to continue.',
      buildMainKeyboard()
    );
    return;
  }

  if (callback?.from && callback.message?.chat) {
    const user = await upsertTelegramUser({
      from: callback.from,
      chatId: callback.message.chat.id
    });
    if (!user) return;

    const callbackData = callback.data ?? '';

    if (callbackData.startsWith(ADMIN_NOTIFY_CALLBACK_PREFIX)) {
      await handleAdminNotifyCallback(user, callback, callbackData);
      return;
    }

    if (callbackData.startsWith(TELEGRAM_GRANT_SAVE_CALLBACK_PREFIX)) {
      await handleTelegramGrantSaveCallback(user, callback, callbackData);
      return;
    }

    if (callbackData.startsWith(TELEGRAM_GRANT_SAVED_ACK_PREFIX)) {
      await handleTelegramGrantUnsaveCallback(user, callback, callbackData);
      return;
    }

    if (callback.id) {
      await answerTelegramCallbackQuery(callback.id);
    }

    switch (callback.data) {
      case CALLBACKS.findScholarships:
        await openScholarshipAlertsPanel(user);
        return;
      case CALLBACKS.myProfile:
        await sendProfileSummary(user);
        return;
      case CALLBACKS.connect:
        if (user.app_user_id) {
          await sendAlreadyLinkedSyncAck(user);
        } else {
          await startConnectFlow(user);
        }
        return;
      case CALLBACKS.admin:
        await sendAdminPanel(user);
        return;
      case CALLBACKS.toggleAlerts:
        await sendAdminNotificationSettingsPanel(user);
        return;
      case CALLBACKS.notifyBest:
        await handleGrantNotifyToggle(user, callback, 'notify_best_matches');
        return;
      case CALLBACKS.notifySf:
        await handleGrantNotifyToggle(user, callback, 'notify_saved_filters');
        return;
      case CALLBACKS.notifyEa:
        await handleGrantNotifyToggle(user, callback, 'notify_easy_apply');
        return;
      case CALLBACKS.notifyHd:
        await handleGrantNotifyToggle(user, callback, 'notify_hot_deadlines');
        return;
      case CALLBACKS.mainMenu:
      default:
        await sendTelegramMessage(user.telegram_chat_id, MAIN_MENU_REPLY, buildMainKeyboard());
    }
  }
}
