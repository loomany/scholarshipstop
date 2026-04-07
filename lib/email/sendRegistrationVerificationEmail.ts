import 'server-only';

import { createEmailVerificationToken } from '@/lib/auth/emailVerificationToken';
import {
  buildConfirmSignupEmailHtml,
  EMAIL_SUBJECT_CONFIRM_SIGNUP
} from '@/lib/email/templates/premiumTemplates';
import { getServerAuthSiteOrigin } from '@/utils/auth-email-redirect.server';

export type SendRegistrationVerificationOptions = {
  /** Shown in “Hi {name}!” — optional first name from profile. */
  displayName?: string | null;
};

/**
 * Sends “verify when convenient” email via Resend HTTP API.
 * Requires RESEND_API_KEY and RESEND_FROM (e.g. ScholarshipTop <no-reply@mail.scholarshiptop.com>).
 */
export async function sendRegistrationVerificationEmail(
  toEmail: string,
  userId: string,
  options?: SendRegistrationVerificationOptions
): Promise<{ ok: boolean; skipped?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey) {
    return { ok: false, skipped: 'RESEND_API_KEY not set' };
  }
  if (!from) {
    return { ok: false, skipped: 'RESEND_FROM not set' };
  }

  const token = createEmailVerificationToken(userId);
  const origin = getServerAuthSiteOrigin().replace(/\/+$/, '');
  const link = `${origin}/auth/verify-email?token=${encodeURIComponent(token)}`;

  const html = buildConfirmSignupEmailHtml({
    name: options?.displayName?.trim() || 'there',
    confirmationUrl: link,
    siteOrigin: origin
  });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [toEmail],
      subject: EMAIL_SUBJECT_CONFIRM_SIGNUP,
      html
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[email:verify] Resend error', res.status, text);
    return { ok: false, skipped: `Resend HTTP ${res.status}` };
  }
  return { ok: true };
}
