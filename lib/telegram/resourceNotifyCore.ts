/**
 * Telegram resource card (photo + HTML caption + Read more button).
 * No `server-only` — safe for scripts (tsx) and server code.
 */

/** Card body: ~200–300 chars (cap at 280). */
const SNIPPET_MAX = 280;

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

/** Telegram HTML: escape text inside entities. */
export function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function truncateSnippet(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 3)).trimEnd()}...`;
}

export function buildResourceSnippet(
  description: string | null | undefined,
  title: string
): string {
  const raw = (description ?? '').replace(/\s+/g, ' ').trim();
  const base = raw || title;
  return truncateSnippet(base, SNIPPET_MAX);
}

export function resourceArticlePublicUrl(slug: string): string {
  const s = slug.trim();
  return `${getSiteBaseUrl()}/resources/${encodeURIComponent(s)}`;
}

async function telegramBotApi<T>(
  method: string,
  payload: Record<string, unknown>
): Promise<T | null> {
  const token = getBotToken();
  if (!token) {
    console.error('[telegram-resources] TELEGRAM_BOT_TOKEN is not set');
    return null;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error(`[telegram-resources] ${method} failed`, response.status, text);
    return null;
  }

  const json = (await response.json().catch(() => null)) as { result?: T } | null;
  return json?.result ?? null;
}

export type ResourceNotifyPayload = {
  title: string;
  description: string | null | undefined;
  image_url: string | null | undefined;
  slug: string;
};

function buildCaptionHtml(title: string, snippet: string): string {
  return `<b>${escapeTelegramHtml(title)}</b>\n\n${escapeTelegramHtml(snippet)}`;
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

/**
 * Sends the resource card to the given chat IDs (must be non-empty).
 */
export async function sendResourceNotifyToChats(
  input: ResourceNotifyPayload,
  chatIds: number[]
): Promise<boolean> {
  const slug = input.slug?.trim();
  if (!slug) {
    console.error('[telegram-resources] missing slug');
    return false;
  }
  if (chatIds.length === 0) {
    console.error('[telegram-resources] sendResourceNotifyToChats: empty chatIds');
    return false;
  }

  const title = input.title?.trim() || 'New article';
  const snippet = buildResourceSnippet(input.description, title);
  const url = resourceArticlePublicUrl(slug);
  const caption = buildCaptionHtml(title, snippet);
  const safeCaption =
    caption.length > 1024 ? `${caption.slice(0, 1020)}...` : caption;

  const replyMarkup = {
    inline_keyboard: [[{ text: 'Read more →', url }]]
  };

  const photoUrl = isProbablyHttpUrl(input.image_url) ? input.image_url!.trim() : null;

  const delayBetweenMs =
    chatIds.length > 1
      ? Math.max(0, Number(process.env.TELEGRAM_RESOURCES_SEND_DELAY_MS?.trim() || '40'))
      : 0;

  let anyOk = false;
  for (let i = 0; i < chatIds.length; i++) {
    const chat_id = chatIds[i]!;
    if (i > 0 && delayBetweenMs > 0) {
      await new Promise((r) => setTimeout(r, delayBetweenMs));
    }
    if (photoUrl) {
      const r = await telegramBotApi<unknown>('sendPhoto', {
        chat_id,
        photo: photoUrl,
        caption: safeCaption,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      });
      if (r != null) anyOk = true;
      else {
        const r2 = await telegramBotApi<unknown>('sendMessage', {
          chat_id,
          text: safeCaption,
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
          disable_web_page_preview: false
        });
        if (r2 != null) anyOk = true;
      }
    } else {
      const r = await telegramBotApi<unknown>('sendMessage', {
        chat_id,
        text: safeCaption,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
        disable_web_page_preview: false
      });
      if (r != null) anyOk = true;
    }
  }

  return anyOk;
}
