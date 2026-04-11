'use server';

import { createClient } from '@/utils/supabase/server';

export type BillingPlanKey = 'monthly' | 'quarterly' | 'yearly';

/**
 * Hosted checkout URLs (custom domain). Prefer env so Live/Test buy UUIDs stay in sync with Lemon
 * without code changes — stale hardcoded `/checkout/buy/...` links keep showing Test mode.
 */
function baseCheckoutUrlFromPlan(plan: BillingPlanKey): string {
  const fromEnv =
    plan === 'monthly'
      ? process.env.LEMONSQUEEZY_CHECKOUT_URL_MONTHLY?.trim()
      : plan === 'quarterly'
        ? process.env.LEMONSQUEEZY_CHECKOUT_URL_QUARTERLY?.trim()
        : process.env.LEMONSQUEEZY_CHECKOUT_URL_YEARLY?.trim();

  if (fromEnv) return fromEnv;

  const url =
    plan === 'monthly'
      ? 'https://pay.scholarshiptop.com/checkout/buy/fa9652cf-35f3-4dc2-af2d-29244a786861?logo=0&discount=0'
      : plan === 'quarterly'
        ? 'https://pay.scholarshiptop.com/checkout/buy/d8c88c38-44c6-4ab5-805a-71ffe1b8e89e?logo=0&discount=0'
        : 'https://pay.scholarshiptop.com/checkout/buy/cddda988-fad6-46e8-a56f-a1f2a3eea3d3?logo=0&discount=0';

  if (!url.trim()) {
    throw new Error(`Checkout URL for the ${plan} plan is not configured.`);
  }

  return url;
}

function checkoutUrlFromPlan({
  plan,
  email,
  userId
}: {
  plan: BillingPlanKey;
  email: string;
  userId: string;
}) {
  const url = new URL(baseCheckoutUrlFromPlan(plan));
  url.searchParams.set('checkout[email]', email);
  url.searchParams.set('checkout[custom][user_id]', userId);
  return url.toString();
}

export async function getCheckoutURL(plan: BillingPlanKey): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error(error?.message ?? 'You must be signed in to subscribe.');
  }

  if (!user.email) {
    throw new Error('Your account is missing an email address.');
  }

  return checkoutUrlFromPlan({
    plan,
    email: user.email,
    userId: user.id
  });
}
