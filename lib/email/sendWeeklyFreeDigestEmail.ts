import {
  resolveScholarshipCardAwardDisplay,
  scholarshipPublicPath,
  type Scholarship
} from '@/app/scholarships/scholarshipsData';
import { SCHOLARSHIPS_HUB_ALL_MATCHES_HREF } from '@/app/scholarships/scholarshipListUrl';
import { getEmailSiteOrigin } from '@/lib/email/emailSiteOrigin';
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
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey) return { ok: false, skipped: 'RESEND_API_KEY not set' };
  if (!from) return { ok: false, skipped: 'RESEND_FROM not set' };

  const origin = getEmailSiteOrigin().replace(/\/+$/, '');
  const hubHref = `${origin}${SCHOLARSHIPS_HUB_ALL_MATCHES_HREF}`;
  const subscriptionHref = `${origin}/subscription`;
  const unsubscribeHref = `${origin}/account`;

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
    console.error('[email:weekly-free-digest] Resend error', res.status, text);
    return { ok: false, skipped: `Resend HTTP ${res.status}` };
  }
  return { ok: true };
}
