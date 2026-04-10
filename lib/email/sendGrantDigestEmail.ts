import 'server-only';

import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { formatScholarshipAwardDisplay, scholarshipPublicPath } from '@/app/scholarships/scholarshipsData';
import { buildScholarshipTopPremiumEmailHtml } from '@/lib/email/templates/scholarshipTopEmailLayout';
import { escapeHtml } from '@/lib/email/templates/escapeHtml';
import { getServerAuthSiteOrigin } from '@/utils/auth-email-redirect.server';

function truncatePlain(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** Category labels aligned with grant notification channels (email digest). */
export const GRANT_DIGEST_DEMO_CHANNEL_LABELS = [
  'Best recommendations',
  'Saved filters',
  'Easy apply',
  'Hot deadlines'
] as const;

function buildGrantCardExtraHtml(
  s: Scholarship,
  origin: string,
  categoryLabel: string
): string {
  const path = scholarshipPublicPath(s);
  const href = `${origin.replace(/\/+$/, '')}${path}`;
  const category = escapeHtml(categoryLabel.trim() || 'Match');
  const title = escapeHtml(s.title?.trim() || 'Scholarship');
  const deadline = escapeHtml(s.deadline?.trim() || 'See listing');
  const amountRaw = s.awardAmount ?? s.amount;
  const amount = escapeHtml(
    amountRaw?.trim() ? formatScholarshipAwardDisplay(amountRaw) : 'Amount varies'
  );
  const snippet = escapeHtml(truncatePlain(s.description || s.benefits || '', 220));
  const provider = s.provider?.trim()
    ? escapeHtml(s.provider.trim())
    : escapeHtml(s.country?.trim() || 'Scholarship');

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
  <tr>
    <td style="border-radius:16px;border:1px solid #e5e7eb;background:#f9fafb;padding:0;overflow:hidden;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="width:4px;background:#10b981;"></td>
          <td style="padding:18px 20px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;line-height:1.3;color:#059669;">${category}</p>
            <p style="margin:0 0 10px;font-size:18px;font-weight:800;line-height:1.25;color:#111827;letter-spacing:-0.02em;">${title}</p>
            <p style="margin:0 0 6px;font-size:13px;color:#374151;"><span style="color:#6b7280;">Provider</span> · ${provider}</p>
            <p style="margin:0 0 6px;font-size:13px;color:#374151;"><span style="color:#6b7280;">Deadline</span> · ${deadline}</p>
            <p style="margin:0 0 12px;font-size:13px;color:#374151;"><span style="color:#6b7280;">Award</span> · ${amount}</p>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#4b5563;">${snippet}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td align="center" style="padding:0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                    <tr>
                      <td align="center" style="border-radius:12px;background:#10b981;">
                        <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff!important;text-decoration:none;">View scholarship</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

export async function sendGrantDigestBatchEmail(params: {
  toEmail: string;
  items: { scholarship: Scholarship; channelLabel: string }[];
  firstName?: string | null;
}): Promise<{ ok: boolean; skipped?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();

  if (!apiKey) {
    return { ok: false, skipped: 'RESEND_API_KEY not set' };
  }
  if (!from) {
    return { ok: false, skipped: 'RESEND_FROM not set' };
  }

  const items = params.items;
  if (items.length === 0) {
    return { ok: false, skipped: 'No digest items' };
  }

  const origin = getServerAuthSiteOrigin().replace(/\/+$/, '');
  const name = params.firstName?.trim() || 'there';
  const first = items[0]!;
  const grantPath = scholarshipPublicPath(first.scholarship);
  const grantUrl = `${origin}${grantPath}`;
  const n = items.length;

  const extraHtml = items
    .map((it) => buildGrantCardExtraHtml(it.scholarship, origin, it.channelLabel))
    .join('\n');

  const titlesPreview = items
    .map((it) => it.scholarship.title?.trim() || 'Scholarship')
    .join(' · ');
  const preheader =
    titlesPreview.length > 140 ? `${titlesPreview.slice(0, 137)}…` : titlesPreview;

  const subject =
    n === 1
      ? `New scholarship — ${first.channelLabel}`
      : `New scholarships for you (${n} matches)`;

  const headline = n === 1 ? 'A new grant worth a look' : 'New grants worth a look';
  const accentLine = n === 1 ? first.channelLabel : `${n} new matches`;

  const bodySecond =
    n === 1
      ? `We added a scholarship that lines up with <strong>${escapeHtml(first.channelLabel)}</strong>. Use the button in the card below to open the listing.`
      : `We found <strong>${n}</strong> opportunities that match your alert channels. Each card is labeled with its category at the top — open any listing below.`;

  const html = buildScholarshipTopPremiumEmailHtml({
    preheader,
    headline,
    accentLine,
    bodyParagraphsHtml: [`Hi ${escapeHtml(name)},`, bodySecond],
    extraHtml,
    ctaHref: grantUrl,
    ctaLabel: 'Open full listing',
    omitPrimaryCta: true,
    siteOrigin: origin,
    unsubscribeUrl: `${origin}/account`,
    secondaryLinkNote: ''
  });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [params.toEmail],
      subject,
      html
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[email:grant-digest] Resend error', res.status, text);
    return { ok: false, skipped: `Resend HTTP ${res.status}` };
  }

  return { ok: true };
}

export async function sendGrantDigestEmail(params: {
  toEmail: string;
  scholarship: Scholarship;
  channelLabel: string;
  firstName?: string | null;
}): Promise<{ ok: boolean; skipped?: string }> {
  return sendGrantDigestBatchEmail({
    toEmail: params.toEmail,
    items: [{ scholarship: params.scholarship, channelLabel: params.channelLabel }],
    firstName: params.firstName
  });
}
