/**
 * Sends a one-line test message via SEO Telegram env vars.
 *
 * Usage (from repo root):
 *   npx dotenv -e .env.local -- npm run seo:notify:test
 *
 * Requires: SEO_TELEGRAM_BOT_TOKEN, SEO_TELEGRAM_ADMIN_CHAT_ID
 * (SEO_TELEGRAM_NOTIFY_ENABLED is not required for this smoke test.)
 */
import process from 'node:process';

const TEST_TEXT = '✅ SEO Telegram notification test';

function tokenPrefix(): string {
  const t = process.env.SEO_TELEGRAM_BOT_TOKEN?.trim();
  if (!t) return '(unset)';
  return `${t.slice(0, 6)}…`;
}

async function main(): Promise<void> {
  const token = process.env.SEO_TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.SEO_TELEGRAM_ADMIN_CHAT_ID?.trim();
  if (!token || !chatId) {
    console.log(
      [
        'SEO Telegram test skipped: set SEO_TELEGRAM_BOT_TOKEN and SEO_TELEGRAM_ADMIN_CHAT_ID.',
        'Optional for guard: SEO_TELEGRAM_NOTIFY_ENABLED=1',
        'Load vars e.g.  npx dotenv -e .env.local -- npm run seo:notify:test',
        'Find chat_id: message @userinfobot or add bot to a group and read updates from getUpdates.'
      ].join('\n')
    );
    process.exit(0);
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 8_000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: ac.signal,
      body: JSON.stringify({
        chat_id: chatId,
        text: TEST_TEXT,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    clearTimeout(timer);
    const body = await res.text().catch(() => '');
    if (!res.ok) {
      console.error('[seo-telegram-test]', res.status, 'token=', tokenPrefix(), body.slice(0, 300));
      process.exit(1);
    }
    console.log('Sent:', TEST_TEXT);
  } catch (e) {
    console.error(
      '[seo-telegram-test] error',
      e instanceof Error ? e.message : String(e),
      'token=',
      tokenPrefix()
    );
    process.exit(1);
  }
}

void main();
