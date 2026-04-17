import 'server-only';

import { collectTelegramAdminAlertChatIdsForCategory } from '@/lib/telegram/adminNotificationRouting';
import { escapeTelegramHtml } from '@/lib/telegram/resourceNotifyCore';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';

const WINDOW_MS = 24 * 60 * 60 * 1000;
/** Telegram hard limit 4096; keep headroom for HTML wrapper. */
const MAX_BODY_CHARS = 3500;

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

async function telegramSendHtml(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    console.warn('[seo-hub-digest] TELEGRAM_BOT_TOKEN missing');
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    console.error('[seo-hub-digest] sendMessage failed', res.status, t);
  }
}

function chunkMessages(lines: string[]): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let size = 0;
  const pushLine = (line: string) => {
    const add = line.length + (current.length ? 1 : 0);
    if (size + add > MAX_BODY_CHARS && current.length > 0) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(line);
    size += add;
  };
  for (const line of lines) {
    pushLine(line);
  }
  if (current.length) chunks.push(current);
  return chunks;
}

export type SeoHubDailyDigestResult = {
  ok: boolean;
  notified: boolean;
  chatCount: number;
  pageCount: number;
  messageParts: number;
  error?: string;
};

/**
 * Once per day: one Telegram message per admin (category `seo`) listing SEO hub URLs
 * created/updated in the last 24 hours (queue completed + hub body upserts).
 */
export async function runSeoHubDailyTelegramDigest(options?: {
  baseUrl?: string;
}): Promise<SeoHubDailyDigestResult> {
  const base = normalizeBaseUrl(
    options?.baseUrl?.trim() ||
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      process.env.SITE_URL?.trim() ||
      'https://scholarshiptop.com'
  );

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return { ok: false, notified: false, chatCount: 0, pageCount: 0, messageParts: 0, error: 'no_admin_client' };
  }

  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { data: queueRows, error: qErr } = await admin
    .from('seo_generation_queue')
    .select('canonical_path, updated_at, grant_count')
    .eq('status', 'completed')
    .gte('updated_at', since)
    .order('updated_at', { ascending: false });

  if (qErr) {
    console.error('[seo-hub-digest] queue select', qErr.message);
    return {
      ok: false,
      notified: false,
      chatCount: 0,
      pageCount: 0,
      messageParts: 0,
      error: qErr.message
    };
  }

  const { data: hubRows, error: hErr } = await admin
    .from('seo_hub_content')
    .select('canonical_path, updated_at')
    .not('content_html', 'is', null)
    .gte('updated_at', since)
    .order('updated_at', { ascending: false });

  if (hErr) {
    console.error('[seo-hub-digest] hub select', hErr.message);
    return {
      ok: false,
      notified: false,
      chatCount: 0,
      pageCount: 0,
      messageParts: 0,
      error: hErr.message
    };
  }

  type Row = { path: string; at: string; grants: number | null };
  const merged = new Map<string, Row>();

  for (const r of queueRows ?? []) {
    const p = r.canonical_path.trim().toLowerCase();
    merged.set(p, {
      path: p,
      at: r.updated_at,
      grants: r.grant_count
    });
  }
  for (const r of hubRows ?? []) {
    const p = r.canonical_path.trim().toLowerCase();
    if (merged.has(p)) continue;
    merged.set(p, { path: p, at: r.updated_at, grants: null });
  }

  const items = Array.from(merged.values()).sort((a, b) =>
    b.at.localeCompare(a.at)
  );

  if (items.length === 0) {
    return {
      ok: true,
      notified: false,
      chatCount: 0,
      pageCount: 0,
      messageParts: 0
    };
  }

  const chatIds = await collectTelegramAdminAlertChatIdsForCategory('seo');
  if (chatIds.length === 0) {
    console.warn('[seo-hub-digest] no Telegram recipients for category seo');
    return {
      ok: true,
      notified: false,
      chatCount: 0,
      pageCount: items.length,
      messageParts: 0,
      error: 'no_recipients'
    };
  }

  const dateLabel = new Date().toISOString().slice(0, 10);
  const header = `<b>SEO hub pages (24h) · ${escapeTelegramHtml(dateLabel)}</b>\n<i>Total: ${items.length}</i>`;

  const lines: string[] = [];
  for (const it of items) {
    const urlPath = it.path
      .split('/')
      .filter(Boolean)
      .map((s) => encodeURIComponent(s))
      .join('/');
    const url = `${base}/scholarships/${urlPath}`;
    const grants =
      it.grants != null ? ` <i>(${it.grants} grants)</i>` : '';
    lines.push(
      `• <a href="${escapeTelegramHtml(url)}">${escapeTelegramHtml(it.path)}</a>${grants}`
    );
  }

  const lineChunks = chunkMessages(lines);
  let parts = 0;

  for (const chatId of chatIds) {
    for (let i = 0; i < lineChunks.length; i++) {
      const partLabel =
        lineChunks.length > 1
          ? `\n<i>Part ${i + 1}/${lineChunks.length}</i>\n`
          : '\n';
      const body =
        i === 0
          ? `${header}\n${partLabel}${lineChunks[i]!.join('\n')}`
          : `<b>SEO hub pages (continued)</b>${partLabel}${lineChunks[i]!.join('\n')}`;
      await telegramSendHtml(chatId, body);
      parts++;
    }
  }

  return {
    ok: true,
    notified: true,
    chatCount: chatIds.length,
    pageCount: items.length,
    messageParts: parts
  };
}
