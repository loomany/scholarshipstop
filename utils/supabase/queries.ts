import { cache } from 'react';
import { hasActiveSubscriptionAccess } from '@/lib/payments/subscriptionEntitlements';
import { pickCanonicalSubscription } from '@/lib/payments/subscriptionAccess';
import { createClient } from '@/utils/supabase/server';

type ServerSupabaseClient = ReturnType<typeof createClient>;

export const getUser = cache(async (supabase: ServerSupabaseClient) => {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
});

/** Cache key is only `userId` so RSC cache is stable (avoids `supabase` ref churn breaking dedupe). */
export const getSubscription = cache(async (userId: string) => {
  const supabase = createClient();
  // Use `select('*')` only: a nested `prices(*)` embed can make PostgREST return no row when
  // `price_id` is null (Lemon checkouts), which breaks /subscription CTAs even though the
  // subscription exists. Fetch a small recent window and choose a canonical row in app code,
  // otherwise an older active/grace-period row can be hidden by a newer lapsed row.
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created', { ascending: false })
    .limit(20);

  return pickCanonicalSubscription(subscriptions ?? []);
});

export const getUserSubscriptionStatus = cache(
  async (supabase: ServerSupabaseClient, userId: string) => {
    const [{ data: profile }, subscription] = await Promise.all([
      supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
        .maybeSingle(),
      getSubscription(userId)
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
