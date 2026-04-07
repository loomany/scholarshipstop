'use server';

import {
  createCheckout,
  lemonSqueezySetup
} from '@lemonsqueezy/lemonsqueezy.js';

import { createClient } from '@/utils/supabase/server';

export async function getCheckoutURL(variantId: number): Promise<string> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;

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
