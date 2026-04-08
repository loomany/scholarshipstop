import { NextResponse } from 'next/server';
import { fetchScholarshipBySlugOrId } from '@/lib/scholarships/supabase';
import { redactPremiumScholarshipFields } from '@/lib/scholarships/scholarshipDetailServer';
import { createClient } from '@/utils/supabase/server';
import { getUserSubscriptionStatus } from '@/utils/supabase/queries';

export async function GET(
  _request: Request,
  { params }: { params: { slugOrId: string } }
) {
  const raw = params?.slugOrId;
  if (!raw) {
    return NextResponse.json({ error: 'Missing scholarship parameter' }, { status: 400 });
  }

  try {
    const row = await fetchScholarshipBySlugOrId(decodeURIComponent(raw));
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const hasSubscription = user?.id
      ? await getUserSubscriptionStatus(supabase, user.id)
      : false;

    return NextResponse.json(
      hasSubscription ? row : redactPremiumScholarshipFields(row),
      {
        headers: {
          'Cache-Control': 'private, no-store'
        }
      }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
