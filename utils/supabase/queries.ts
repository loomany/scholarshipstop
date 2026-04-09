import { cache } from 'react';
import { hasActiveSubscriptionAccess } from '@/lib/payments/subscriptionEntitlements';
import type { createClient } from '@/utils/supabase/server';

type ServerSupabaseClient = ReturnType<typeof createClient>;

export const getUser = cache(async (supabase: ServerSupabaseClient) => {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
});

export const getSubscription = cache(async (supabase: ServerSupabaseClient, userId: string) => {
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('*, prices(*, products(*))')
    .eq('user_id', userId)
    .in('status', ['trialing', 'on_trial', 'active', 'cancelled', 'canceled', 'paused', 'past_due'])
    .order('created', { ascending: false })
    .maybeSingle();

  return subscription;
});

export const getUserSubscriptionStatus = cache(
  async (supabase: ServerSupabaseClient, userId: string) => {
    const [{ data: profile }, subscription] = await Promise.all([
      supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
        .maybeSingle(),
      getSubscription(supabase, userId)
    ]);

    return hasActiveSubscriptionAccess(profile, subscription);
  }
);

export const getProducts = cache(async (supabase: ServerSupabaseClient) => {
  const { data: products, error } = await supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .eq('prices.active', true)
    .order('metadata->index')
    .order('unit_amount', { referencedTable: 'prices' });

  return products;
});

/** App profile row in public.profiles (same id as auth user). */
export const getUserDetails = cache(
  async (supabase: ServerSupabaseClient, userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return profile;
  }
);
