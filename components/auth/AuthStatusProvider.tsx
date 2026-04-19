'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

import SubscriptionPausedBanner from '@/components/billing/SubscriptionPausedBanner';
import { resolveResumeSubscriptionHref } from '@/lib/payments/billingUrls';
import {
  normalizeSubscriptionStatus,
  pickCanonicalSubscription
} from '@/lib/payments/subscriptionAccess';
import {
  hasActiveSubscriptionAccess,
  type SubscriptionWithPriceAndProduct
} from '@/lib/payments/subscriptionEntitlements';
import { setScholarshipStorageUserScope } from '@/app/scholarships/userScopedStorage';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/types_db';

type AuthStatusProviderProps = {
  children: (state: {
    user: User | null;
    isAuthenticated: boolean;
    hasSubscription: boolean;
    authResolved: boolean;
  }) => React.ReactNode;
};

export default function AuthStatusProvider({
  children
}: AuthStatusProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [subscriptionPaused, setSubscriptionPaused] = useState(false);
  const [pausedResumeUrl, setPausedResumeUrl] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const syncSubscription = async (nextUser: User | null) => {
      setUser(nextUser);
      setScholarshipStorageUserScope(nextUser?.id ?? null);
      if (!nextUser) {
        setHasSubscription(false);
        setSubscriptionPaused(false);
        setPausedResumeUrl(null);
        setAuthResolved(true);
        return;
      }
      const [{ data: profile }, { data: subscriptions }] = await Promise.all([
        supabase
        .from('profiles')
        .select('*')
        .eq('id', nextUser.id)
        .maybeSingle<Database['public']['Tables']['profiles']['Row']>(),
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', nextUser.id)
          .order('created', { ascending: false })
          .limit(20)
      ]);
      const subscription = pickCanonicalSubscription(
        (subscriptions ?? []) as Database['public']['Tables']['subscriptions']['Row'][]
      ) as SubscriptionWithPriceAndProduct | null;
      setHasSubscription(hasActiveSubscriptionAccess(profile ?? null, subscription));
      const paused = normalizeSubscriptionStatus(subscription?.status) === 'paused';
      setSubscriptionPaused(paused);
      setPausedResumeUrl(
        paused ? resolveResumeSubscriptionHref(subscription, '/subscription') : null
      );
      setAuthResolved(true);
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void syncSubscription(session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncSubscription(session?.user ?? null);
    });

    const handleSubscriptionDebugUpdated = () => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        void syncSubscription(session?.user ?? null);
      });
    };

    window.addEventListener(
      'subscription-debug-updated',
      handleSubscriptionDebugUpdated
    );

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener(
        'subscription-debug-updated',
        handleSubscriptionDebugUpdated
      );
    };
  }, []);

  return (
    <>
      {authResolved && user && subscriptionPaused && pausedResumeUrl ? (
        <div className="sticky top-0 z-40 border-b border-amber-200/50 bg-zinc-50/95 px-4 py-3 backdrop-blur-sm dark:border-amber-500/20 dark:bg-zinc-950/90">
          <div className="mx-auto max-w-5xl">
            <SubscriptionPausedBanner resumeUrl={pausedResumeUrl} />
          </div>
        </div>
      ) : null}
      {children({
        user,
        isAuthenticated: Boolean(user),
        hasSubscription,
        authResolved
      })}
    </>
  );
}
