import 'server-only';

import { createEmailVerificationToken } from '@/lib/auth/emailVerificationToken';
import { getServerAuthSiteOrigin } from '@/utils/auth-email-redirect.server';

/**
 * Sends “verify when convenient” email via Resend HTTP API.
 * Requires RESEND_API_KEY and RESEND_FROM (e.g. ScholarshipTop <no-reply@mail.scholarshiptop.com>).
 */
export async function sendRegistrationVerificationEmail(
  toEmail: string,
  userId: string
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

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [toEmail],
      subject: 'Confirm your ScholarshipTop email (when you’re ready)',
      html: `<p>Thanks for signing up for <b>ScholarshipTop</b>.</p>
<p>You’re already signed in on the site. When you have a moment, please confirm this email address:</p>
<p><a href="${link}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;">Confirm email</a></p>
<p style="font-size:14px;color:#666;">If the button doesn’t work, copy this link:<br/>${link}</p>
<p style="font-size:14px;color:#666;">If you didn’t create an account, you can ignore this message.</p>`
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[email:verify] Resend error', res.status, text);
    return { ok: false, skipped: `Resend HTTP ${res.status}` };
  }
  return { ok: true };
}
