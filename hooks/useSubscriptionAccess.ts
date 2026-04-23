'use client';

import { useEffect, useState } from 'react';

import { pickCanonicalSubscription } from '@/lib/payments/subscriptionAccess';
import {
  hasActiveSubscriptionAccess,
  hasEssayMentorAccess
} from '@/lib/payments/subscriptionEntitlements';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/types_db';
import type { SubscriptionWithPriceAndProduct } from '@/lib/payments/subscriptionEntitlements';

/**
 * Resolves subscription access for the signed-in user. When `userId` is null (guest),
 * `subscriptionReady` is true and `hasSubscription` is false.
 */
export function useSubscriptionAccess(userId: string | null): {
  hasSubscription: boolean;
  hasEssayMentorTierAccess: boolean;
  subscriptionReady: boolean;
} {
  const [hasSubscription, setHasSubscription] = useState(false);
  const [hasEssayMentorTierAccess, setHasEssayMentorTierAccess] = useState(false);
  const [subscriptionReady, setSubscriptionReady] = useState(userId === null);

  useEffect(() => {
    if (!userId) {
      setHasSubscription(false);
      setHasEssayMentorTierAccess(false);
      setSubscriptionReady(true);
      return;
    }

    setSubscriptionReady(false);
    let cancelled = false;
    const supabase = createClient();

    const sync = async () => {
      const [{ data: profile }, { data: subscriptions }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle<Database['public']['Tables']['profiles']['Row']>(),
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .order('created', { ascending: false })
          .limit(20)
      ]);
      if (cancelled) return;
      const subscription = pickCanonicalSubscription(
        (subscriptions ?? []) as Database['public']['Tables']['subscriptions']['Row'][]
      ) as SubscriptionWithPriceAndProduct | null;
      const resolvedProfile = profile ?? null;
      setHasSubscription(hasActiveSubscriptionAccess(resolvedProfile, subscription));
      setHasEssayMentorTierAccess(
        hasEssayMentorAccess(resolvedProfile, subscription)
      );
      setSubscriptionReady(true);
    };

    void sync();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { hasSubscription, hasEssayMentorTierAccess, subscriptionReady };
}
