import { notifyTelegramIqTestSignup } from '@/lib/telegram/bot';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

type IqRegistrationPayload = {
  userId?: string;
  email?: string;
  archetype?: string | null;
  iqScore?: number | null;
};

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: IqRegistrationPayload;
  try {
    payload = (await request.json()) as IqRegistrationPayload;
  } catch {
    return new Response('Invalid JSON.', { status: 400 });
  }

  if (!payload.userId || payload.userId !== user.id) {
    return new Response('User mismatch.', { status: 403 });
  }

  const email = payload.email?.trim() || user.email?.trim();
  if (!email) {
    return new Response('Missing email.', { status: 400 });
  }

  try {
    await notifyTelegramIqTestSignup({
      userId: user.id,
      email,
      archetype: payload.archetype ?? null,
      iqScore: typeof payload.iqScore === 'number' ? payload.iqScore : null
    });
  } catch (e) {
    console.error(
      '[api/internal/telegram/iq-registration] notifyTelegramIqTestSignup failed',
      e
    );
  }

  return Response.json({ ok: true });
}
