import { handleTelegramUpdate, type TelegramUpdate } from '@/lib/telegram/bot';

export const runtime = 'nodejs';

let loggedMissingWebhookSecret = false;

function isSecretTokenValid(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected) {
    if (process.env.NODE_ENV === 'production' && !loggedMissingWebhookSecret) {
      loggedMissingWebhookSecret = true;
      console.error(
        '[telegram] Webhook: TELEGRAM_WEBHOOK_SECRET is unset; requests are not authenticated. Set the secret and register setWebhook with the same secret_token (see docs/telegram-bot.md).'
      );
    }
    return true;
  }

  const actual = request.headers.get('x-telegram-bot-api-secret-token')?.trim();
  return actual === expected;
}

export async function POST(request: Request) {
  if (!isSecretTokenValid(request)) {
    return new Response('Invalid Telegram webhook secret.', { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return new Response('Invalid Telegram payload.', { status: 400 });
  }

  try {
    await handleTelegramUpdate(update);
  } catch (e) {
    /**
     * Always acknowledge with 200 so Telegram does not retry the same update indefinitely
     * on transient bugs (avoids duplicate side effects). Errors are fixed server-side.
     */
    console.error('[telegram] webhook handleTelegramUpdate', e);
  }
  return Response.json({ ok: true });
}
