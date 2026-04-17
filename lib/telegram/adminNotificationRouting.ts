import 'server-only';

import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import type { Json } from '@/types_db';

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
  grants: '🆕 Гранты (новые в БД)',
  traffic: '👤 Первый визит',
  auth: '✨ Регистрация / email',
  billing: '💳 Платежи Lemon',
  seo: '🔍 SEO / индексация',
  resources: '📰 Статьи / ресурсы'
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
