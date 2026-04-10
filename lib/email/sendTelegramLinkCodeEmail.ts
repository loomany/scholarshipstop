import 'server-only';

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
  const from = process.env.RESEND_FROM?.trim();

  if (!apiKey) {
    return { ok: false, skipped: 'RESEND_API_KEY not set' };
  }
  if (!from) {
    return { ok: false, skipped: 'RESEND_FROM not set' };
  }

  const origin = getServerAuthSiteOrigin().replace(/\/+$/, '');
  const name = options?.displayName?.trim() || 'there';

  const html = buildScholarshipTopPremiumEmailHtml({
    preheader: 'Use this code to connect your Telegram account to ScholarshipTop.',
    headline: 'Connect your Telegram account',
    accentLine: 'Your login code expires in 10 minutes.',
    bodyParagraphsHtml: [
      `Hi ${escapeHtml(name)},`,
      `Use the code below in the ScholarshipTop Telegram bot to finish connecting your account:`,
      `<span style="display:inline-block;margin:8px 0 4px;padding:14px 18px;border-radius:14px;background:#111827;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:0.18em;">${escapeHtml(code)}</span>`,
      `If you did not request this, you can safely ignore this email.`
    ],
    ctaHref: `${origin}/account`,
    ctaLabel: 'Open ScholarshipTop',
    siteOrigin: origin,
    unsubscribeUrl: `${origin}/account`,
    secondaryLinkNote:
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
      html
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[email:telegram-link] Resend error', res.status, text);
    return { ok: false, skipped: `Resend HTTP ${res.status}` };
  }

  return { ok: true };
}
