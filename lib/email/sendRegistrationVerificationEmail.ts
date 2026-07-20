import 'server-only';

import { logRegistrationPipeline } from '@/lib/auth/registrationPipelineLog';
import { createEmailVerificationToken } from '@/lib/auth/emailVerificationToken';
import { postResend } from '@/lib/email/postResend';
import {
  buildConfirmSignupEmailHtml,
  EMAIL_SUBJECT_CONFIRM_SIGNUP
} from '@/lib/email/templates/premiumTemplates';
import { getServerTransactionalEmailSiteOrigin } from '@/utils/auth-email-redirect.server';

export type SendRegistrationVerificationOptions = {
  /** Shown in “Hi {name}!” — optional first name from profile. */
  displayName?: string | null;
};

/**
 * Sends “verify when convenient” email via SMTP (Brevo).
 * Requires SMTP_HOST / SMTP_USER / SMTP_PASS.
 * From: MAIL_FROM or RESEND_FROM (legacy), default hello@mail.scholarshiptop.com.
 * Optional REPLY_TO_EMAIL sets Reply-To.
 */
export async function sendRegistrationVerificationEmail(
  toEmail: string,
  userId: string,
  options?: SendRegistrationVerificationOptions
): Promise<{ ok: boolean; skipped?: string }> {
  const token = createEmailVerificationToken(userId);
  const origin = getServerTransactionalEmailSiteOrigin().replace(/\/+$/, '');
  const link = `${origin}/auth/verify-email?token=${encodeURIComponent(token)}`;

  const html = buildConfirmSignupEmailHtml({
    name: options?.displayName?.trim() || 'there',
    confirmationUrl: link,
    siteOrigin: origin
  });

  const result = await postResend({
    to: toEmail,
    subject: EMAIL_SUBJECT_CONFIRM_SIGNUP,
    html,
    category: 'transactional'
  });

  if (!result.ok) {
    console.error('[email:verify] send failed', result.skipped);
    return result;
  }

  logRegistrationPipeline('EmailSent', {
    channel: 'smtp',
    userId,
    toEmail
  });
  return { ok: true };
}
