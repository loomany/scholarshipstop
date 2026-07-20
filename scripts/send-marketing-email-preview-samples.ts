/**
 * Sends production-style marketing emails (grant digest, provider outreach)
 * so you can verify footers + List-Unsubscribe headers in a real inbox.
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/send-marketing-email-preview-samples.ts [email]
 *
 * Requires SMTP_HOST / SMTP_USER / SMTP_PASS. Optional SUPABASE_SERVICE_ROLE_KEY: if the address is in
 * `unsubscribed_emails`, that message is skipped.
 */
import type { Scholarship } from '../app/scholarships/scholarshipsData';
import { buildMarketingUnsubscribeListHeaderUrl } from '../lib/email/buildMarketingUnsubscribeUrl';
import { postResend } from '../lib/email/postResend';
import {
  sendGrantDigestBatchEmail,
  type GrantDigestCategory
} from '../lib/email/sendGrantDigestEmail';
import {
  buildProviderPartnershipOutreachEmailHtml,
  buildProviderPartnershipOutreachEmailSubject
} from '../lib/email/templates/providerPartnershipOutreachEmailHtml';

const DEFAULT_TO = 'loomany.self@gmail.com';
const SITE = 'https://scholarshiptop.com';
const PROVIDER_FROM = 'Daur <daur@mail.scholarshiptop.com>';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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
  const to = (process.argv[2]?.trim() || DEFAULT_TO).toLowerCase();
  if (
    !process.env.SMTP_HOST?.trim() ||
    !process.env.SMTP_USER?.trim() ||
    !process.env.SMTP_PASS?.trim()
  ) {
    console.error('SMTP_HOST, SMTP_USER, SMTP_PASS required');
    process.exit(1);
  }

  const origin = SITE.replace(/\/+$/, '');
  const oneGrant: Scholarship = fakeScholarship({
    id: '00000000-0000-4000-8000-000000000099',
    slug: 'sample-grant-digest',
    title: 'Presidential Merit Award',
    awardAmountNumericSort: 15000,
    deadline: 'June 15, 2026',
    profileMatchPercent: 94
  });

  const categories: GrantDigestCategory[] = [
    {
      id: 'best',
      label: 'Best recommendation',
      totalCount: 1,
      viewAllUrl: `${origin}/scholarships`,
      items: [oneGrant]
    }
  ];

  console.log('1/2 Grant digest ->', to);
  const g = await sendGrantDigestBatchEmail({
    toEmail: to,
    categories,
    firstName: 'Alex'
  });
  console.log('   ', g.ok ? 'sent' : 'fail', g.skipped ?? '');
  if (!g.ok) process.exit(1);

  await sleep(1500);

  const orgName = 'River Valley Community Foundation';
  const subject = buildProviderPartnershipOutreachEmailSubject(orgName);
  const html = buildProviderPartnershipOutreachEmailHtml({
    siteOrigin: origin,
    organizationName: orgName,
    providerSlug: 'river-valley-community-foundation',
    recipientEmail: to
  });
  const listUrl = buildMarketingUnsubscribeListHeaderUrl(origin, to);

  console.log('2/2 Provider outreach ->', to);
  const p = await postResend({
    to,
    subject,
    html,
    category: 'marketing',
    marketingListUnsubscribeUrl: listUrl,
    from: process.env.PROVIDER_OUTREACH_FROM?.trim() || PROVIDER_FROM,
    replyTo:
      process.env.PROVIDER_OUTREACH_REPLY_TO?.trim() || 'support@scholarshiptop.com'
  });
  console.log('   ', p.ok ? 'sent' : 'fail', p.skipped ?? '');
  process.exit(p.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
