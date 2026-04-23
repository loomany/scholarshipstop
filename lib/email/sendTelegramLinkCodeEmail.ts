import 'server-only';

import { resendReplyToFields, resolveResendFrom } from '@/lib/email/resendEnvelope';
import { buildScholarshipTopPremiumEmailHtml } from '@/lib/email/templates/scholarshipTopEmailLayout';
import { escapeHtml } from '@/lib/email/templates/escapeHtml';
import { getServerAuthSiteOrigin } from '@/utils/auth-email-redirect.server';

const TELEGRAM_LINK_EMAIL_SUBJECT = 'Your ScholarshipTop Telegram login code';

export async function sendTelegramLinkCodeEmail(
  toEmail: string,
  code: string,
  options?: {
    displayName?: string | null;
  }
): Promise<{ ok: boolean; skipped?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = resolveResendFrom();

  if (!apiKey) {
    return { ok: false, skipped: 'RESEND_API_KEY not set' };
  }

  const origin = getServerAuthSiteOrigin().replace(/\/+$/, '');
  const name = options?.displayName?.trim() || 'there';

  const codeBlock = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:12px 0 20px;">
  <tr>
    <td align="center" style="padding:0;">
      <span style="display:inline-block;margin:8px 0 4px;padding:14px 18px;border-radius:14px;background:#111827;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:0.18em;">${escapeHtml(code)}</span>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.6;color:#374151;">If you did not request this, you can safely ignore this email.</p>`;

  const html = buildScholarshipTopPremiumEmailHtml({
    preheader: 'Use this code to connect your Telegram account to ScholarshipTop.',
    headline: 'Connect your Telegram account',
    accentLine: 'Your login code expires in 10 minutes.',
    bodyParagraphsHtml: [
      `Hi ${escapeHtml(name)},`,
      `Use the code below in the ScholarshipTop Telegram bot to finish connecting your account:`
    ],
    extraHtml: codeBlock,
    ctaHref: `${origin}/account`,
    ctaLabel: 'Open ScholarshipTop',
    omitPrimaryCta: true,
    siteOrigin: origin,
    unsubscribeUrl: `${origin}/account`,
    secondaryLinkNote: '',
    postCtaMutedText:
      'Return to the Telegram chat and enter the 6-digit code exactly as shown above.'
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
      subject: TELEGRAM_LINK_EMAIL_SUBJECT,
      html,
      ...resendReplyToFields()
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[email:telegram-link] Resend error', res.status, text);
    return { ok: false, skipped: `Resend HTTP ${res.status}` };
  }

  return { ok: true };
}
