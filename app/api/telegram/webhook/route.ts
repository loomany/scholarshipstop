import { handleTelegramUpdate, type TelegramUpdate } from '@/lib/telegram/bot';

export const runtime = 'nodejs';

function isSecretTokenValid(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected) return true;

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

  await handleTelegramUpdate(update);
  return Response.json({ ok: true });
}
