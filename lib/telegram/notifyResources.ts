import 'server-only';

import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';

import {
  buildResourceSnippet,
  escapeTelegramHtml,
  resourceArticlePublicUrl,
  sendResourceNotifyToChats,
  type ResourceNotifyPayload
} from '@/lib/telegram/resourceNotifyCore';

export {
  buildResourceSnippet,
  escapeTelegramHtml,
  resourceArticlePublicUrl
} from '@/lib/telegram/resourceNotifyCore';

/** Comma-separated chat IDs (channel/group/user). */
function parseEnvChatIds(raw: string | undefined): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
}

function isEnvTruthy(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** Every private chat that used /start at least once (`last_bot_started_at` set). */
async function getAllStartedBotUserChatIds(): Promise<number[]> {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) return [];

  const maxRaw = process.env.TELEGRAM_RESOURCES_BROADCAST_MAX?.trim();
  const max = maxRaw
    ? Math.min(50_000, Math.max(1, Number(maxRaw)))
    : 10_000;

  const { data: rows, error } = await admin
    .from('telegram_users')
    .select('telegram_chat_id')
    .not('last_bot_started_at', 'is', null)
    .limit(max);

  if (error) {
    console.error('[telegram-resources] broadcast chat id query failed', error.message);
    return [];
  }

  const ids = (rows ?? [])
    .map((r) => r.telegram_chat_id)
    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
  return [...new Set(ids)];
}

async function getFallbackAdminChatIds(): Promise<number[]> {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) return [];

  const { data: rows } = await admin
    .from('telegram_users')
    .select('telegram_chat_id')
    .eq('is_admin', true)
    .eq('notifications_enabled', true);

  const ids = (rows ?? [])
    .map((r) => r.telegram_chat_id)
    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
  return [...new Set(ids)];
}

/**
 * Where automated resource posts go:
 * 1) TELEGRAM_RESOURCES_BROADCAST_ALL — all bot users who used /start (`last_bot_started_at`);
 * 2) TELEGRAM_RESOURCES_CHAT_ID — explicit list;
 * 3) admins with notifications on.
 */
export async function getResourceNotificationTargetChatIds(): Promise<number[]> {
  if (isEnvTruthy(process.env.TELEGRAM_RESOURCES_BROADCAST_ALL)) {
    const ids = await getAllStartedBotUserChatIds();
    if (ids.length > 0) return ids;
  }

  const fromEnv = parseEnvChatIds(process.env.TELEGRAM_RESOURCES_CHAT_ID);
  if (fromEnv.length > 0) return fromEnv;
  return getFallbackAdminChatIds();
}

export type SendTelegramResourceNotificationInput = ResourceNotifyPayload;

export type SendTelegramResourceNotificationOptions = {
  /** If set, only these chats (e.g. admin DM for /testresources). */
  targetChatIds?: number[];
};

/**
 * Sends a resource card: photo (if URL) + HTML caption with bold title and snippet,
 * plus inline "Read more →" linking to /resources/[slug].
 */
export async function sendTelegramResourceNotification(
  input: SendTelegramResourceNotificationInput,
  options?: SendTelegramResourceNotificationOptions
): Promise<boolean> {
  const chatIds =
    options?.targetChatIds && options.targetChatIds.length > 0
      ? options.targetChatIds
      : await getResourceNotificationTargetChatIds();

  if (chatIds.length === 0) {
    console.error(
      '[telegram-resources] no target chats (set TELEGRAM_RESOURCES_BROADCAST_ALL=1, TELEGRAM_RESOURCES_CHAT_ID, or admins in telegram_users)'
    );
    return false;
  }

  return sendResourceNotifyToChats(input, chatIds);
}
