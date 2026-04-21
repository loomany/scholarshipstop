import 'server-only';

import type { FirstTouchNotifySourceKey } from '@/lib/analytics/resolveTrafficChannel';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import type { Json } from '@/types_db';

export const ADMIN_NOTIFY_TRAFFIC_MENU_CALLBACK = 'tg:an:trsrc';
export const ADMIN_NOTIFY_TRAFFIC_BACK_CALLBACK = 'tg:an:trsrc_back';
/** Callback: `tg:an:tss:<source_key>` (e.g. organic_search). */
export const ADMIN_NOTIFY_TRAFFIC_SRC_PREFIX = 'tg:an:tss:';

/** Order matches first-touch routing (`getFirstTouchNotifySourceKey`). */
export const FIRST_TOUCH_NOTIFY_SOURCE_KEYS: readonly FirstTouchNotifySourceKey[] = [
  'google_ads',
  'facebook_paid',
  'organic_search',
  'other_paid',
  'referral',
  'direct_unknown',
  'tiktok',
  'reddit'
] as const;

export const FIRST_TOUCH_NOTIFY_LABEL_RU: Record<FirstTouchNotifySourceKey, string> = {
  google_ads: 'Google Ads',
  facebook_paid: 'Facebook Ads',
  organic_search: 'Органика (поиск)',
  other_paid: 'Другая реклама',
  referral: 'Переходы с сайтов',
  direct_unknown: 'Прямой / неизвестный',
  tiktok: 'TikTok',
  reddit: 'Reddit'
};

/** Keys stored in `telegram_users.admin_notification_prefs` (JSON). */
export const ADMIN_NOTIFY_KEYS = [
  'grants',
  'traffic',
  'auth',
  'billing',
  'seo',
  'resources'
] as const;

export type AdminNotifyCategory = (typeof ADMIN_NOTIFY_KEYS)[number];

/** Short labels for inline buttons (Telegram limit ~64 bytes per callback). */
export const ADMIN_NOTIFY_LABEL_RU: Record<AdminNotifyCategory, string> = {
  grants: '🆕 Новые гранты',
  traffic: '👤 Трафик и визиты',
  auth: '✨ Регистрация и email',
  billing: '💳 Платежи Lemon',
  seo: '🔍 SEO и индексация',
  resources: '📰 Статьи и ресурсы'
};

export const ADMIN_NOTIFY_CALLBACK_PREFIX = 'tg:an:';

/** When `notifications_enabled` is false, one button turns all categories back on. */
export const ADMIN_NOTIFY_ENABLE_ALL_CALLBACK = 'tg:an:enable_all';

export function parseAdminNotifyCallback(data: string): AdminNotifyCategory | null {
  if (!data.startsWith(ADMIN_NOTIFY_CALLBACK_PREFIX)) return null;
  const key = data.slice(ADMIN_NOTIFY_CALLBACK_PREFIX.length);
  return (ADMIN_NOTIFY_KEYS as readonly string[]).includes(key)
    ? (key as AdminNotifyCategory)
    : null;
}

export function toggleAdminNotifyCategory(
  prefs: Json | null | undefined,
  category: AdminNotifyCategory
): Json {
  const base: Record<string, unknown> =
    prefs && typeof prefs === 'object' && !Array.isArray(prefs)
      ? { ...(prefs as Record<string, unknown>) }
      : {};
  const currentlyOn = isAdminNotifyCategoryEnabled(prefs, category);
  if (currentlyOn) {
    base[category] = false;
  } else {
    delete base[category];
  }
  return base as Json;
}

export function isAdminNotifyCategoryEnabled(
  prefs: Json | null | undefined,
  category: AdminNotifyCategory
): boolean {
  if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) return true;
  const v = (prefs as Record<string, unknown>)[category];
  if (v === false) return false;
  return true;
}

/**
 * When category `traffic` is on but `traffic_sources` is absent — all sources match (legacy).
 * When `traffic_sources` is present — only keys with boolean `true` notify (opt-in list).
 */
export function isTrafficNotifySourceEnabled(
  prefs: Json | null | undefined,
  source: FirstTouchNotifySourceKey
): boolean {
  if (!isAdminNotifyCategoryEnabled(prefs, 'traffic')) return false;
  const raw =
    prefs && typeof prefs === 'object' && !Array.isArray(prefs)
      ? (prefs as Record<string, unknown>).traffic_sources
      : undefined;
  if (raw === undefined || raw === null) return true;
  if (typeof raw !== 'object' || Array.isArray(raw)) return true;
  const ts = raw as Record<string, unknown>;
  if (Object.keys(ts).length === 0) return true;
  return ts[source] === true;
}

function seedAllTrafficSourcesOn(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const k of FIRST_TOUCH_NOTIFY_SOURCE_KEYS) {
    out[k] = true;
  }
  return out;
}

/**
 * Full per-key map for editing: legacy (no `traffic_sources`) → all true; explicit object → missing = false.
 */
export function mergeTrafficSourcesForToggle(
  prefs: Json | null | undefined
): Record<string, boolean> {
  const base =
    prefs && typeof prefs === 'object' && !Array.isArray(prefs)
      ? { ...(prefs as Record<string, unknown>) }
      : {};
  const raw = base.traffic_sources;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const out: Record<string, boolean> = {};
    for (const k of FIRST_TOUCH_NOTIFY_SOURCE_KEYS) {
      out[k] = o[k] === true;
    }
    return out;
  }
  return seedAllTrafficSourcesOn();
}

export function toggleTrafficNotifySource(
  prefs: Json | null | undefined,
  source: FirstTouchNotifySourceKey
): Json {
  const base =
    prefs && typeof prefs === 'object' && !Array.isArray(prefs)
      ? { ...(prefs as Record<string, unknown>) }
      : {};
  const ts = mergeTrafficSourcesForToggle(prefs);
  const on = isTrafficNotifySourceEnabled(prefs, source);
  ts[source] = !on;
  base.traffic_sources = ts;
  return base as Json;
}

export function parseFirstTouchNotifyCallback(data: string): FirstTouchNotifySourceKey | null {
  if (!data.startsWith(ADMIN_NOTIFY_TRAFFIC_SRC_PREFIX)) return null;
  const key = data.slice(ADMIN_NOTIFY_TRAFFIC_SRC_PREFIX.length);
  return (FIRST_TOUCH_NOTIFY_SOURCE_KEYS as readonly string[]).includes(key)
    ? (key as FirstTouchNotifySourceKey)
    : null;
}

type AdminRow = {
  telegram_chat_id: number;
  telegram_user_id: number;
  is_admin: boolean;
  notifications_enabled: boolean;
  admin_notification_prefs: Json | null;
};

function getTelegramAdminIdsFromEnv(): Set<number> {
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

function parseTelegramExtraChatIds(): number[] {
  const extra = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!extra) return [];
  return extra
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n));
}

function shouldDeliverToAdminRow(
  row: AdminRow,
  category: AdminNotifyCategory
): boolean {
  if (!row.is_admin || !row.notifications_enabled) return false;
  return isAdminNotifyCategoryEnabled(row.admin_notification_prefs, category);
}

function shouldDeliverTrafficSourceToRow(
  row: AdminRow,
  source: FirstTouchNotifySourceKey
): boolean {
  if (!row.is_admin || !row.notifications_enabled) return false;
  return isTrafficNotifySourceEnabled(row.admin_notification_prefs, source);
}

/**
 * Same audience as legacy `collectTelegramAdminAlertChatIds`, but per alert category.
 * Env-listed IDs with no `telegram_users` row still receive all categories (cannot set prefs without /start).
 */
export async function collectTelegramAdminAlertChatIdsForCategory(
  category: AdminNotifyCategory
): Promise<number[]> {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) return [];

  const { data: rows, error } = await admin
    .from('telegram_users')
    .select(
      'telegram_chat_id, telegram_user_id, is_admin, notifications_enabled, admin_notification_prefs'
    )
    .eq('is_admin', true);

  if (error) {
    console.error('[telegram] admin notify routing select failed', error.message);
    return [];
  }

  const adminRows = (rows ?? []) as AdminRow[];
  const byTelegramUserId = new Map<number, AdminRow>();
  for (const r of adminRows) {
    byTelegramUserId.set(r.telegram_user_id, r);
  }

  const out = new Set<number>();

  for (const uid of getTelegramAdminIdsFromEnv()) {
    const row = byTelegramUserId.get(uid);
    if (!row) {
      out.add(uid);
    } else if (shouldDeliverToAdminRow(row, category)) {
      out.add(row.telegram_chat_id);
    }
  }

  for (const chatId of parseTelegramExtraChatIds()) {
    const row =
      adminRows.find((r) => r.telegram_chat_id === chatId) ??
      adminRows.find((r) => r.telegram_user_id === chatId);
    if (!row) {
      out.add(chatId);
    } else if (shouldDeliverToAdminRow(row, category)) {
      out.add(row.telegram_chat_id);
    }
  }

  for (const row of adminRows) {
    if (shouldDeliverToAdminRow(row, category)) {
      out.add(row.telegram_chat_id);
    }
  }

  return [...out];
}

/** First-touch visitor pings: same routing as `traffic` category but filtered by source bucket. */
export async function collectTelegramAdminAlertChatIdsForTrafficSource(
  source: FirstTouchNotifySourceKey
): Promise<number[]> {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) return [];

  const { data: rows, error } = await admin
    .from('telegram_users')
    .select(
      'telegram_chat_id, telegram_user_id, is_admin, notifications_enabled, admin_notification_prefs'
    )
    .eq('is_admin', true);

  if (error) {
    console.error('[telegram] admin notify traffic source select failed', error.message);
    return [];
  }

  const adminRows = (rows ?? []) as AdminRow[];
  const byTelegramUserId = new Map<number, AdminRow>();
  for (const r of adminRows) {
    byTelegramUserId.set(r.telegram_user_id, r);
  }

  const out = new Set<number>();

  for (const uid of getTelegramAdminIdsFromEnv()) {
    const row = byTelegramUserId.get(uid);
    if (!row) {
      out.add(uid);
    } else if (shouldDeliverTrafficSourceToRow(row, source)) {
      out.add(row.telegram_chat_id);
    }
  }

  for (const chatId of parseTelegramExtraChatIds()) {
    const row =
      adminRows.find((r) => r.telegram_chat_id === chatId) ??
      adminRows.find((r) => r.telegram_user_id === chatId);
    if (!row) {
      out.add(chatId);
    } else if (shouldDeliverTrafficSourceToRow(row, source)) {
      out.add(row.telegram_chat_id);
    }
  }

  for (const row of adminRows) {
    if (shouldDeliverTrafficSourceToRow(row, source)) {
      out.add(row.telegram_chat_id);
    }
  }

  return [...out];
}

/**
 * DB-linked admins only (used e.g. resource broadcast fallback). Respects category prefs.
 */
export async function getTelegramAdminDbChatIdsForCategory(
  category: AdminNotifyCategory
): Promise<number[]> {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) return [];

  const { data: rows, error } = await admin
    .from('telegram_users')
    .select(
      'telegram_chat_id, telegram_user_id, is_admin, notifications_enabled, admin_notification_prefs'
    )
    .eq('is_admin', true)
    .eq('notifications_enabled', true);

  if (error) {
    console.error('[telegram] admin DB chat ids failed', error.message);
    return [];
  }

  const out: number[] = [];
  for (const r of (rows ?? []) as AdminRow[]) {
    if (shouldDeliverToAdminRow(r, category)) {
      out.push(r.telegram_chat_id);
    }
  }
  return [...new Set(out)];
}
