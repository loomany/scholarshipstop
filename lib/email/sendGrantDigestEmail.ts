import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import {
  formatScholarshipAwardDisplay,
  scholarshipPublicPath
} from '@/app/scholarships/scholarshipsData';
import {
  buildMarketingUnsubscribeListHeaderUrl,
  buildMarketingUnsubscribePageUrl
} from '@/lib/email/buildMarketingUnsubscribeUrl';
import { postResend } from '@/lib/email/postResend';
import { resolveResendFrom } from '@/lib/email/resendEnvelope';
import { isSmtpConfigured } from '@/lib/email/smtpTransport';
import { buildScholarshipTopPremiumEmailHtml } from '@/lib/email/templates/scholarshipTopEmailLayout';
import { escapeHtml } from '@/lib/email/templates/escapeHtml';
import {
  countryLabelFromCode,
  dedupeHostCountryCodesForDisplay
} from '@/lib/scholarships/countryEligibility/countries';

const EMAIL_SITE_ORIGIN_FALLBACK = 'https://scholarshiptop.com';

function resolveDigestSiteOrigin(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!site) return EMAIL_SITE_ORIGIN_FALLBACK;
  const normalized = site.replace(/\/+$/, '');
  return normalized.startsWith('http') ? normalized : `https://${normalized}`;
}

function truncatePlain(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** Category labels aligned with grant notification channels (email digest). */
export const GRANT_DIGEST_DEMO_CHANNEL_LABELS = [
  'Best recommendation',
  'Easy apply',
  'Hot Deadlines',
  'Saved Filters'
] as const;

export type GrantDigestCategory = {
  id: 'best' | 'easy_apply' | 'hot_deadlines' | 'saved_filters' | 'recommended';
  label: string;
  totalCount: number;
  viewAllUrl: string;
  items: Scholarship[];
};

function formatDeadlineLabel(raw: string | null | undefined): string {
  const text = raw?.trim();
  if (!text) return 'No deadline';
  return text;
}

function truncateBadge(text: string, max = 24): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function firstDisplayCountry(codes: string[] | undefined): string | null {
  const code = codes?.find((c) => /^[A-Z]{2}$/i.test(c.trim()));
  return code ? countryLabelFromCode(code) : null;
}

function buildDigestBadgeHtml(label: string, value: string): string {
  return `<span style="display:inline-block;margin:0 6px 6px 0;padding:5px 9px;border-radius:999px;border:1px solid #fed7aa;background:#fff7ed;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.2;font-weight:800;color:#9a3412;white-space:nowrap;">${escapeHtml(label)}: ${escapeHtml(truncateBadge(value))}</span>`;
}

function buildScholarshipBadgesHtml(s: Scholarship, matchPercent: number | null): string {
  const badges: string[] = [];
  const eligible = firstDisplayCountry(s.applicantCountryCodes);
  if (eligible) badges.push(buildDigestBadgeHtml('Eligible', eligible));

  const hostCodes = dedupeHostCountryCodesForDisplay(s.hostCountryCodes ?? []);
  const host = firstDisplayCountry(hostCodes);
  if (host && host !== eligible) badges.push(buildDigestBadgeHtml('Study in', host));
  if (matchPercent != null) badges.push(buildDigestBadgeHtml('Match', `${matchPercent}%`));

  if (badges.length === 0) return '';
  return `<span style="display:block;margin:10px 0 0;">${badges.slice(0, 3).join('')}</span>`;
}

function buildGrantListRowHtml(
  s: Scholarship,
  href: string
): string {
  const title = escapeHtml(s.title?.trim() || 'Scholarship');
  const amountRaw = s.awardAmount ?? s.amount;
  const amount = escapeHtml(
    amountRaw?.trim() ? formatScholarshipAwardDisplay(amountRaw) : 'Amount varies'
  );
  const matchPercentRaw = s.profileMatchPercent;
  const matchPercent =
    typeof matchPercentRaw === 'number' && Number.isFinite(matchPercentRaw)
      ? Math.max(0, Math.min(100, Math.round(matchPercentRaw)))
      : null;
  const badges = buildScholarshipBadgesHtml(s, matchPercent);

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 10px;">
  <tr>
    <td style="padding:0;">
      <a href="${escapeHtml(href)}" style="display:block;border-radius:12px;border:1px solid #374151;background:#111827;padding:12px 14px;text-decoration:none;color:inherit;">
        <span style="display:block;margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.35;font-weight:700;color:#f3f4f6;text-decoration:none;word-break:break-word;overflow-wrap:anywhere;">
          ${title}
        </span>
        <span style="display:block;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.35;font-weight:800;color:#34d399;text-decoration:none;word-break:break-word;overflow-wrap:anywhere;">
          ${amount}
        </span>
        ${badges}
      </a>
    </td>
  </tr>
</table>`;
}

function buildCategorySectionHtml(category: GrantDigestCategory): string {
  if (category.totalCount <= 0 || category.items.length <= 0) return '';

  const visibleItems = category.items.slice(0, 4);
  const hiddenCount = Math.max(0, category.totalCount - visibleItems.length);
  const rows = visibleItems
    .map((item) => buildGrantListRowHtml(item, category.viewAllUrl))
    .join('\n');

  const moreText =
    hiddenCount > 0
      ? `<p style="margin:4px 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.45;color:#9ca3af;">+ ${hiddenCount} more scholarships</p>`
      : '';

  const cta =
    hiddenCount > 0
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 4px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:10px;background:#10b981;">
                    <a href="${escapeHtml(category.viewAllUrl)}" style="display:inline-block;padding:11px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.3;font-weight:700;color:#ffffff!important;text-decoration:none;">
                      View all ${escapeHtml(String(category.totalCount))} scholarships
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`
      : '';

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;">
  <tr>
    <td style="border-radius:14px;border:1px solid #374151;background:#0f172a;padding:14px;">
      <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.35;font-weight:800;color:#34d399;text-transform:uppercase;letter-spacing:0.04em;text-align:center;">
        ${escapeHtml(category.label)} (${escapeHtml(String(category.totalCount))} new)
      </p>
      ${rows}
      ${moreText}
      ${cta}
    </td>
  </tr>
</table>`;
}

export async function sendGrantDigestBatchEmail(params: {
  toEmail: string;
  categories: GrantDigestCategory[];
  firstName?: string | null;
}): Promise<{ ok: boolean; skipped?: string }> {
  const from = resolveResendFrom();

  if (!isSmtpConfigured()) {
    return {
      ok: false,
      skipped: 'SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS)'
    };
  }

  const categories = params.categories.filter((c) => c.totalCount > 0 && c.items.length > 0);
  if (categories.length === 0) {
    return { ok: false, skipped: 'No digest items' };
  }

  /**
   * Cron/tsx jobs run without a Next request scope, so `headers()` is unavailable.
   * Prefer static site origin from env; request-derived origin is used only in web flows.
   */
  const origin = resolveDigestSiteOrigin().replace(/\/+$/, '');
  const to = params.toEmail.trim();
  const unsubPage = buildMarketingUnsubscribePageUrl(origin, to);
  const listUnsubUrl = buildMarketingUnsubscribeListHeaderUrl(origin, to);
  const name = params.firstName?.trim() || 'there';
  const firstCategory = categories[0]!;
  const firstItem = firstCategory.items[0]!;
  const grantPath = scholarshipPublicPath(firstItem);
  const grantUrl = `${origin}${grantPath}`;
  const totalMatches = categories.reduce((sum, c) => sum + c.totalCount, 0);

  const extraHtml = categories
    .map((category) => buildCategorySectionHtml(category))
    .join('\n');

  const titlesPreview = categories
    .flatMap((c) => c.items.slice(0, 2))
    .map((it) => it.title?.trim() || 'Scholarship')
    .join(' · ');
  const preheader =
    titlesPreview.length > 140 ? `${titlesPreview.slice(0, 137)}…` : titlesPreview;

  const subject = `New scholarships for you (${totalMatches} matches)`;
  const headline = 'Your 24-hour scholarship digest';
  const accentLine = `${totalMatches} new matches`;
  const bodySecond =
    'Here are fresh opportunities from your active alert categories. We only show the most relevant scholarships in each section to keep this email compact.';

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
    unsubscribeUrl: unsubPage,
    secondaryLinkNote: ''
  });

  const r = await postResend({
    to,
    subject,
    html,
    category: 'marketing',
    marketingListUnsubscribeUrl: listUnsubUrl,
    from
  });

  if (!r.ok) {
    console.error('[email:grant-digest]', r.skipped);
    return { ok: false, skipped: r.skipped };
  }

  return { ok: true, skipped: r.skipped };
}

export async function sendGrantDigestEmail(params: {
  toEmail: string;
  scholarship: Scholarship;
  channelLabel: string;
  firstName?: string | null;
}): Promise<{ ok: boolean; skipped?: string }> {
  return sendGrantDigestBatchEmail({
    toEmail: params.toEmail,
    categories: [
      {
        id: 'best',
        label: params.channelLabel,
        totalCount: 1,
        viewAllUrl: `${resolveDigestSiteOrigin().replace(/\/+$/, '')}/scholarships`,
        items: [params.scholarship]
      }
    ],
    firstName: params.firstName
  });
}
