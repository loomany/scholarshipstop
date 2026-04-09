'use server';

import {
  createCheckout,
  lemonSqueezySetup
} from '@lemonsqueezy/lemonsqueezy.js';

import { createClient } from '@/utils/supabase/server';
import { getURL } from '@/utils/helpers';

export type BillingPlanKey = 'monthly' | 'quarterly' | 'yearly';

function variantIdFromPlan(plan: BillingPlanKey): number {
  const raw =
    plan === 'monthly'
      ? process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID ??
        process.env.NEXT_PUBLIC_LS_MONTHLY_VARIANT_ID
      : plan === 'quarterly'
        ? process.env.LEMONSQUEEZY_QUARTERLY_VARIANT_ID ??
          process.env.NEXT_PUBLIC_LS_QUARTERLY_VARIANT_ID
        : process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID ??
          process.env.NEXT_PUBLIC_LS_YEARLY_VARIANT_ID;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Variant id for the ${plan} plan is not configured.`);
  }
  return parsed;
}

export async function getCheckoutURL(plan: BillingPlanKey): Promise<string> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = variantIdFromPlan(plan);
  const successUrl = process.env.LEMONSQUEEZY_SUCCESS_URL?.trim() || getURL('/scholarships');

  if (!apiKey) {
    throw new Error('LEMONSQUEEZY_API_KEY is not configured.');
  }

  if (!storeId) {
    throw new Error('LEMONSQUEEZY_STORE_ID is not configured.');
  }

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

  lemonSqueezySetup({ apiKey });

  const checkout = await createCheckout(storeId, variantId, {
    productOptions: {
      redirectUrl: successUrl,
      enabledVariants: [variantId]
    },
    checkoutOptions: {
      embed: true,
      logo: false,
      discount: false
    },
    checkoutData: {
      email: user.email,
      custom: {
        user_id: user.id
      }
    }
  });

  if (checkout.error) {
    throw checkout.error;
  }

  const checkoutUrl = checkout.data?.data?.attributes?.url;

  if (!checkoutUrl) {
    throw new Error('Failed to create Lemon Squeezy checkout.');
  }

  return checkoutUrl;
}
