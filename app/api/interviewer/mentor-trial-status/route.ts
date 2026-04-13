import { NextResponse } from 'next/server';

import { pickCanonicalSubscription } from '@/lib/payments/subscriptionAccess';
import type { SubscriptionWithPriceAndProduct } from '@/lib/payments/subscriptionEntitlements';
import {
  shouldApplyTrialFeatureQuotas,
  trialQuotaSnapshotFromProfile
} from '@/lib/payments/trialFeatureQuotas';
import type { Tables } from '@/types_db';
import { createClient } from '@/utils/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

/**
 * True when a trial user has no remaining mentor-dialogue quota (cannot POST init).
 * Matches the gate in POST /api/interviewer (action init).
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [{ data: profile }, { data: subRows }] = await Promise.all([
    (supabase as Sb).from('profiles').select('*').eq('id', user.id).maybeSingle(),
    (supabase as Sb)
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created', { ascending: false })
      .limit(20)
  ]);

  const subscription = pickCanonicalSubscription(
    subRows ?? []
  ) as SubscriptionWithPriceAndProduct | null;

  const applies = shouldApplyTrialFeatureQuotas(
    profile as Tables<'profiles'> | null,
    subscription
  );
  const snapshot = trialQuotaSnapshotFromProfile(
    profile as Tables<'profiles'> | null,
    applies
  );

  const mentor_dialogue_exhausted = Boolean(
    snapshot && snapshot.chatRemaining <= 0
  );

  return NextResponse.json({ mentor_dialogue_exhausted });
}
