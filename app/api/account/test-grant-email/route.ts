import { NextResponse } from 'next/server';

import {
  GRANT_DIGEST_DEMO_CHANNEL_LABELS,
  sendGrantDigestBatchEmail,
  type GrantDigestCategory
} from '@/lib/email/sendGrantDigestEmail';
import { fetchActiveScholarshipPreviews } from '@/lib/scholarships/supabase';
import { createClient } from '@/utils/supabase/server';

const TEST_RECIPIENT = 'loomany.self@mail.ru';

/**
 * Sends a sample grant digest to the preview inbox (restricted to that account).
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.email.trim().toLowerCase() !== TEST_RECIPIENT) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: profile } = await supabase
    .schema('public')
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .maybeSingle();

  const scholarships = await fetchActiveScholarshipPreviews(24);
  if (scholarships.length === 0) {
    return NextResponse.json({ error: 'No scholarship available for preview' }, { status: 503 });
  }

  const labels = [...GRANT_DIGEST_DEMO_CHANNEL_LABELS];
  const categoryOrder: GrantDigestCategory['id'][] = [
    'best',
    'easy_apply',
    'hot_deadlines',
    'saved_filters'
  ];
  const groups = new Map<GrantDigestCategory['id'], typeof scholarships>();
  for (const id of categoryOrder) groups.set(id, []);
  for (let i = 0; i < scholarships.length; i++) {
    const id = categoryOrder[i % categoryOrder.length]!;
    groups.get(id)!.push(scholarships[i]!);
  }
  const categories: GrantDigestCategory[] = categoryOrder.map((id, i) => {
    const items = groups.get(id)!;
    return {
      id,
      label: `${labels[i]!} (test)`,
      totalCount: items.length,
      viewAllUrl: `https://scholarshiptop.com/scholarships?tab=${
        id === 'best'
          ? 'best-recommendation'
          : id === 'easy_apply'
            ? 'easy-apply'
            : id === 'hot_deadlines'
              ? 'hot-deadlines'
              : 'recommended'
      }`,
      items: items.slice(0, 4)
    };
  }).filter((c) => c.totalCount > 0 && c.items.length > 0);

  const result = await sendGrantDigestBatchEmail({
    toEmail: TEST_RECIPIENT,
    categories,
    firstName: profile?.first_name ?? null
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.skipped ?? 'Send failed' },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true });
}
