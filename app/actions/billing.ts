'use server';

import { createClient } from '@/utils/supabase/server';

export type BillingPlanKey = 'monthly' | 'quarterly' | 'yearly';

function checkoutUrlFromPlan(plan: BillingPlanKey): string {
  const url =
    plan === 'monthly'
      ? 'https://pay.scholarshiptop.com/checkout/buy/4e63048d-5d76-4818-925c-048b10047128?logo=0&discount=0'
      : plan === 'quarterly'
        ? 'https://pay.scholarshiptop.com/checkout/buy/3faf88f4-d2d6-437f-808f-f641bcb955a1?logo=0&discount=0'
        : 'https://pay.scholarshiptop.com/checkout/buy/152da89c-f707-4417-9cd8-3be69938a677?logo=0&discount=0';

  if (!url.trim()) {
    throw new Error(`Checkout URL for the ${plan} plan is not configured.`);
  }

  return url;
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

  return checkoutUrlFromPlan(plan);
}
