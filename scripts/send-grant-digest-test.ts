import { sendGrantDigestBatchEmail, type GrantDigestCategory } from '@/lib/email/sendGrantDigestEmail';
import { createGrantDigestToken } from '@/lib/notifications/grantDigestToken';
import { fetchActiveScholarshipPreviews } from '@/lib/scholarships/supabase';

async function main() {
  const toEmail = process.argv[2]?.trim();
  if (!toEmail) {
    console.error('Usage: npx tsx scripts/send-grant-digest-test.ts <email>');
    process.exit(1);
  }
  const scholarships = await fetchActiveScholarshipPreviews(20);
  if (scholarships.length === 0) {
    console.error('No scholarships available for test digest.');
    process.exit(1);
  }
  const token = createGrantDigestToken(scholarships.map((s) => s.id));
  const siteOrigin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/+$/, '') || 'https://scholarshiptop.com';
  const viewAllUrl = token
    ? `${siteOrigin}/scholarships/email-digest/${encodeURIComponent(token)}`
    : `${siteOrigin}/scholarships?tab=best-recommendation&scope=catalog&sort=best_recommendation`;
  const withPercent = scholarships.slice(0, 12).map((s, index) => ({
    ...s,
    profileMatchPercent: Math.max(61, 94 - index * 3)
  }));
  const categories: GrantDigestCategory[] = [
    {
      id: 'best',
      label: 'Best recommendations',
      totalCount: 2,
      viewAllUrl,
      items: withPercent.slice(0, 2).map((s) => ({
        ...s,
        applicantCountryCodes: ['IN'],
        hostCountryCodes: ['IN']
      }))
    },
    {
      id: 'recommended',
      label: 'Recommended for you',
      totalCount: 2,
      viewAllUrl,
      items: withPercent.slice(2, 4).map((s, index) => ({
        ...s,
        applicantCountryCodes: ['IN'],
        hostCountryCodes: [index === 0 ? 'US' : 'CA']
      }))
    },
    {
      id: 'saved_filters',
      label: 'Saved filters',
      totalCount: 2,
      viewAllUrl,
      items: withPercent.slice(4, 6)
    },
    {
      id: 'easy_apply',
      label: 'Easy apply',
      totalCount: 2,
      viewAllUrl,
      items: withPercent.slice(6, 8)
    },
    {
      id: 'hot_deadlines',
      label: 'Hot deadlines',
      totalCount: 2,
      viewAllUrl,
      items: withPercent.slice(8, 10)
    }
  ].filter((category) => category.items.length > 0);

  const result = await sendGrantDigestBatchEmail({
    toEmail,
    categories,
    firstName: 'Daur'
  });
  console.log(JSON.stringify({ toEmail, ok: result.ok, skipped: result.skipped ?? null, viewAllUrl }));
  if (!result.ok) process.exit(1);
}

void main();
