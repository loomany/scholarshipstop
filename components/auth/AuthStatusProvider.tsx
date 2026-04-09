'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

import { hasActiveSubscriptionAccess } from '@/lib/payments/subscriptionEntitlements';
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

  useEffect(() => {
    const supabase = createClient();

    const syncSubscription = async (nextUser: User | null) => {
      setUser(nextUser);
      if (!nextUser) {
        setHasSubscription(false);
        setAuthResolved(true);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', nextUser.id)
        .maybeSingle<Database['public']['Tables']['profiles']['Row']>();
      setHasSubscription(hasActiveSubscriptionAccess(profile ?? null, null));
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
      {children({
        user,
        isAuthenticated: Boolean(user),
        hasSubscription,
        authResolved
      })}
    </>
  );
}
