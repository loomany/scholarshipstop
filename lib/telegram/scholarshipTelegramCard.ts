/**
 * Single-chat scholarship card for Telegram (HTML + optional provider image).
 * Shared by the bot /testgrant preview.
 */

import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { scholarshipPublicPath } from '@/app/scholarships/scholarshipsData';

import {
  buildResourceSnippet,
  escapeTelegramHtml
} from '@/lib/telegram/resourceNotifyCore';

function getBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
}

function getSiteBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    'https://scholarshiptop.com'
  ).replace(/\/+$/, '');
}

function isProbablyHttpUrl(s: string | null | undefined): boolean {
  if (!s?.trim()) return false;
  try {
    const u = new URL(s.trim());
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

async function telegramBotApi<T>(
  method: string,
  payload: Record<string, unknown>
): Promise<T | null> {
  const token = getBotToken();
  if (!token) return null;

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error(`[telegram-grant-card] ${method} failed`, response.status, text);
    return null;
  }

  const json = (await response.json().catch(() => null)) as { result?: T } | null;
  return json?.result ?? null;
}

export async function sendScholarshipTelegramCardToChat(
  chatId: number,
  scholarship: Scholarship
): Promise<boolean> {
  const site = getSiteBaseUrl();
  const path = scholarshipPublicPath(scholarship);
  const url = `${site}${path}`;
  const title = scholarship.title?.trim() || 'Scholarship';
  const snippet = buildResourceSnippet(scholarship.description, title);
  const deadline = scholarship.deadline?.trim() || 'See listing';
  const amount = scholarship.awardAmount?.trim() || scholarship.amount?.trim() || 'Varies';

  const caption = [
    `<b>${escapeTelegramHtml(title)}</b>`,
    '',
    `<b>Deadline</b>: ${escapeTelegramHtml(deadline)}`,
    `<b>Award</b>: ${escapeTelegramHtml(amount)}`,
    '',
    escapeTelegramHtml(snippet)
  ].join('\n');

  const safeCaption = caption.length > 1024 ? `${caption.slice(0, 1020)}…` : caption;

  const replyMarkup = {
    inline_keyboard: [[{ text: 'View on ScholarshipTop →', url }]]
  };

  const photoUrl = isProbablyHttpUrl(scholarship.providerLogo)
    ? scholarship.providerLogo!.trim()
    : null;

  if (photoUrl) {
    const r = await telegramBotApi<unknown>('sendPhoto', {
      chat_id: chatId,
      photo: photoUrl,
      caption: safeCaption,
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    });
    if (r != null) return true;
  }

  const r2 = await telegramBotApi<unknown>('sendMessage', {
    chat_id: chatId,
    text: safeCaption,
    parse_mode: 'HTML',
    reply_markup: replyMarkup,
    disable_web_page_preview: false
  });
  return r2 != null;
}
