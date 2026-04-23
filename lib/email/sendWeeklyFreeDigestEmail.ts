import {
  resolveScholarshipCardAwardDisplay,
  scholarshipPublicPath,
  type Scholarship
} from '@/app/scholarships/scholarshipsData';
import { SCHOLARSHIPS_HUB_ALL_MATCHES_HREF } from '@/app/scholarships/scholarshipListUrl';
import {
  buildMarketingUnsubscribeListHeaderUrl,
  buildMarketingUnsubscribePageUrl
} from '@/lib/email/buildMarketingUnsubscribeUrl';
import { getEmailSiteOrigin } from '@/lib/email/emailSiteOrigin';
import { postResend } from '@/lib/email/postResend';
import { resolveResendFrom } from '@/lib/email/resendEnvelope';
import {
  buildWeeklyFreeDigestEmailHtml,
  type WeeklyFreeDigestFreeRow,
  type WeeklyFreeDigestPremiumRow
} from '@/lib/email/templates/weeklyFreeDigestEmailHtml';

function formatUsdCompact(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(n);
}

function deadlineLine(s: Scholarship): string {
  const d = s.deadline?.trim();
  if (d) return d;
  if (s.deadlineAt) {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'America/New_York'
      }).format(new Date(s.deadlineAt));
    } catch {
      return 'See listing';
    }
  }
  return 'See listing';
}

function freeRowsFromScholarships(
  origin: string,
  items: Scholarship[]
): WeeklyFreeDigestFreeRow[] {
  const base = origin.replace(/\/+$/, '');
  return items.map((s) => {
    const path = scholarshipPublicPath(s);
    const award = resolveScholarshipCardAwardDisplay(s);
    return {
      title: s.title?.trim() || 'Scholarship',
      amountLine: award.isPlaceholder ? 'Amount varies' : award.line,
      deadlineLine: deadlineLine(s),
      href: `${base}${path}`
    };
  });
}

export function buildWeeklyFreeDigestSubject(params: {
  profileMatchNewCount: number;
  topThree: Scholarship[];
}): string {
  const n = Math.min(99, Math.max(0, params.profileMatchNewCount));
  const amounts = params.topThree
    .map((s) =>
      s.awardAmountNumericSort != null && Number.isFinite(s.awardAmountNumericSort)
        ? s.awardAmountNumericSort
        : 0
    )
    .filter((x) => x > 0);
  const cap = amounts.length ? Math.max(...amounts) : 0;
  const up = cap > 0 ? formatUsdCompact(cap) : '$25,000';
  return `${n} new matches for your profile (Up to ${up})`;
}

export async function sendWeeklyFreeDigestEmail(params: {
  toEmail: string;
  firstName: string | null;
  platformNewScholarships7d: number;
  profileMatchNewCount: number;
  topThree: Scholarship[];
  premiumTeaser: WeeklyFreeDigestPremiumRow;
}): Promise<{ ok: boolean; skipped?: string }> {
  const from = resolveResendFrom();
  if (!process.env.RESEND_API_KEY?.trim()) {
    return { ok: false, skipped: 'RESEND_API_KEY not set' };
  }

  const origin = getEmailSiteOrigin().replace(/\/+$/, '');
  const hubHref = `${origin}${SCHOLARSHIPS_HUB_ALL_MATCHES_HREF}`;
  const subscriptionHref = `${origin}/subscription`;
  const to = params.toEmail.trim();
  const unsubscribeHref = buildMarketingUnsubscribePageUrl(origin, to);
  const listUnsubUrl = buildMarketingUnsubscribeListHeaderUrl(origin, to);

  const preheader = `We scanned ${params.platformNewScholarships7d} new grants this week. Here are your top picks.`;
  const name = params.firstName?.trim() || 'there';
  const subject = buildWeeklyFreeDigestSubject({
    profileMatchNewCount: params.profileMatchNewCount,
    topThree: params.topThree
  });

  const html = buildWeeklyFreeDigestEmailHtml({
    siteOrigin: origin,
    preheader,
    firstName: name,
    introNewCount: params.platformNewScholarships7d,
    freeRows: freeRowsFromScholarships(origin, params.topThree),
    premium: params.premiumTeaser,
    hubHref,
    subscriptionHref,
    unsubscribeHref
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
    console.error('[email:weekly-free-digest]', r.skipped);
    return { ok: false, skipped: r.skipped };
  }
  return { ok: true, skipped: r.skipped };
}
