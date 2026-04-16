/**
 * Sends one visual sample of the weekly free digest (no Supabase / no Next).
 * Usage: npx dotenv-cli -e .env.local -- npx tsx scripts/quick-weekly-digest-email.ts you@example.com
 */
import { buildWeeklyFreeDigestEmailHtml } from '../lib/email/templates/weeklyFreeDigestEmailHtml';
import { buildWeeklyFreeDigestSubject } from '../lib/email/sendWeeklyFreeDigestEmail';
import type { Scholarship } from '../app/scholarships/scholarshipsData';

function fakeScholarship(partial: Partial<Scholarship> & { id: string }): Scholarship {
  return {
    id: partial.id,
    title: partial.title ?? 'Sample scholarship',
    country: 'USA',
    deadline: partial.deadline ?? 'May 1, 2026',
    description: '',
    eligibility: [],
    benefits: '',
    howToApply: [],
    slug: partial.slug,
    awardAmountNumericSort: partial.awardAmountNumericSort,
    aiMatchScore: partial.aiMatchScore,
    rankingScore: partial.rankingScore
  };
}

async function main() {
  const to = process.argv[2]?.trim();
  if (!to) {
    console.error('Usage: npx tsx scripts/quick-weekly-digest-email.ts <email>');
    process.exit(1);
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) {
    console.error('RESEND_API_KEY and RESEND_FROM required');
    process.exit(1);
  }

  const origin = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    'https://scholarshiptop.com'
  ).replace(/\/+$/, '');

  const topThree: Scholarship[] = [
    fakeScholarship({
      id: '00000000-0000-4000-8000-000000000001',
      slug: 'sample-one',
      title: 'International Education Scholarship',
      awardAmountNumericSort: 25000,
      aiMatchScore: 92
    }),
    fakeScholarship({
      id: '00000000-0000-4000-8000-000000000002',
      slug: 'sample-two',
      title: 'Cecil M. Winn Endowed Scholarship',
      awardAmountNumericSort: 12000,
      aiMatchScore: 88
    }),
    fakeScholarship({
      id: '00000000-0000-4000-8000-000000000003',
      slug: 'sample-three',
      title: 'Ryan Smith Guzman Memorial Scholarship',
      awardAmountNumericSort: 8000,
      aiMatchScore: 85
    })
  ];

  const subject = buildWeeklyFreeDigestSubject({
    profileMatchNewCount: 14,
    topThree
  });

  const html = buildWeeklyFreeDigestEmailHtml({
    siteOrigin: origin,
    preheader:
      'We scanned 128 new grants this week. Here are your top picks.',
    firstName: 'Alex',
    introNewCount: 128,
    freeRows: [
      {
        title: topThree[0]!.title!,
        amountLine: '$25,000',
        deadlineLine: topThree[0]!.deadline!,
        href: `${origin}/scholarships/sample-one`
      },
      {
        title: topThree[1]!.title!,
        amountLine: '$12,000',
        deadlineLine: topThree[1]!.deadline!,
        href: `${origin}/scholarships/sample-two`
      },
      {
        title: topThree[2]!.title!,
        amountLine: '$8,000',
        deadlineLine: topThree[2]!.deadline!,
        href: `${origin}/scholarships/sample-three`
      }
    ],
    premium: {
      title: 'Full-Tuition STEM Excellence Award',
      amountLine: 'Amount: $40,000+ | Available for Premium members'
    },
    hubHref: `${origin}/scholarships?tab=matches&scope=catalog`,
    subscriptionHref: `${origin}/subscription`,
    unsubscribeHref: `${origin}/account`
  });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to: [to], subject, html })
  });

  const text = await res.text();
  console.log(res.status, text);
  process.exit(res.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
