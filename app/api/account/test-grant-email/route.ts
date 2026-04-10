import { NextResponse } from 'next/server';

import { sendGrantDigestEmail } from '@/lib/email/sendGrantDigestEmail';
import { fetchFirstActiveScholarshipPreview } from '@/lib/scholarships/supabase';
import { createClient } from '@/utils/supabase/server';

const TEST_RECIPIENT = 'loomany.self@gmail.com';

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

  const scholarship = await fetchFirstActiveScholarshipPreview();
  if (!scholarship) {
    return NextResponse.json({ error: 'No scholarship available for preview' }, { status: 503 });
  }

  const result = await sendGrantDigestEmail({
    toEmail: TEST_RECIPIENT,
    scholarship,
    channelLabel: 'Best recommendations (test)',
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
