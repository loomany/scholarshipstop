import { notifyTelegramSignup } from '@/lib/telegram/bot';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

type RegistrationPayload = {
  userId?: string;
  email?: string;
  firstName?: string | null;
  source?: string | null;
};

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: RegistrationPayload;
  try {
    payload = (await request.json()) as RegistrationPayload;
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
    await notifyTelegramSignup({
      userId: user.id,
      email,
      firstName: payload.firstName ?? null,
      source: payload.source ?? 'onboarding'
    });
  } catch (e) {
    console.error('[api/internal/telegram/registration] notifyTelegramSignup failed', e);
  }

  return Response.json({ ok: true });
}
