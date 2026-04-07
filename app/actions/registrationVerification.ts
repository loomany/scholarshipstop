'use server';

import { sendRegistrationVerificationEmail } from '@/lib/email/sendRegistrationVerificationEmail';
import { createClient } from '@/utils/supabase/server';

/** Fire-and-forget optional “confirm email later” message (Resend). */
export async function enqueueRegistrationVerificationEmail(
  email: string,
  userId: string
): Promise<void> {
  const result = await sendRegistrationVerificationEmail(email, userId);
  if (!result.ok && result.skipped) {
    console.warn('[registrationVerification]', result.skipped);
  }
}

/** Same email as onboarding; caller must be signed in (uses session user id + email). */
export async function resendRegistrationVerificationEmail(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const email = user?.email?.trim();
  if (!user?.id || !email) {
    return { ok: false, error: 'Not signed in' };
  }
  const result = await sendRegistrationVerificationEmail(email, user.id);
  if (!result.ok) {
    return { ok: false, error: result.skipped ?? 'Could not send email' };
  }
  return { ok: true };
}
