'use server';

import { pickCanonicalSubscription } from '@/lib/payments/subscriptionAccess';
import {
  inferSubscriptionBillingTier,
  type SubscriptionWithPriceAndProduct
} from '@/lib/payments/subscriptionEntitlements';
import type { Tables } from '@/types_db';
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

function variantIdFromPlan(plan: BillingPlanKey): string | null {
  const raw =
    plan === 'monthly'
      ? process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID
      : plan === 'quarterly'
        ? process.env.LEMONSQUEEZY_QUARTERLY_VARIANT_ID
        : process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID;
  const v = raw?.trim();
  return v && v.length > 0 ? v : null;
}

function planProductTitle(plan: BillingPlanKey): string {
  switch (plan) {
    case 'monthly':
      return 'Monthly Plan';
    case 'quarterly':
      return 'Quarterly Plan';
    case 'yearly':
      return 'Yearly Plan';
    default:
      return 'Subscription';
  }
}

/** Plain text for logs; HTML variant is what Lemon renders on checkout. */
function lemonSkipTrialCheckoutDescription(plan: BillingPlanKey): string {
  const core =
    'Get full access to our global scholarship database with advanced filters, plus unlimited AI mentor chats and complete essay generation.';
  const closing =
    plan === 'monthly'
      ? 'Your monthly subscription starts today.'
      : plan === 'quarterly'
        ? 'Your quarterly subscription starts today.'
        : 'Your yearly subscription starts today.';
  return `Premium Access. ${core} ${closing}`;
}

function lemonSkipTrialCheckoutDescriptionHtml(plan: BillingPlanKey): string {
  const plain = lemonSkipTrialCheckoutDescription(plan);
  return `<p>${plain.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
}

type LemonSkipTrialResult =
  | { ok: true; url: string }
  | { ok: false; reason: 'missing_env' | 'http' | 'bad_response'; detail?: string };

/**
 * Creates checkout via API: `skip_trial` + full product override so dashboard “3 day trial”
 * marketing is replaced (hosted `/checkout/buy/...` links cannot set `product_options`).
 */
async function createLemonSkipTrialCheckout(
  plan: BillingPlanKey,
  email: string,
  userId: string
): Promise<LemonSkipTrialResult> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim();
  const storeId = process.env.LEMONSQUEEZY_STORE_ID?.trim();
  const variantId = variantIdFromPlan(plan);
  if (!apiKey || !storeId || !variantId) {
    return { ok: false, reason: 'missing_env' };
  }

  const variantNum = Number.parseInt(variantId, 10);
  if (!Number.isFinite(variantNum)) {
    return { ok: false, reason: 'missing_env', detail: 'invalid variant id' };
  }

  const name = planProductTitle(plan);
  const descriptionHtml = lemonSkipTrialCheckoutDescriptionHtml(plan);

  const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_options: {
            skip_trial: true,
            desc: true
          },
          product_options: {
            name,
            description: descriptionHtml,
            enabled_variants: [variantNum]
          },
          checkout_data: {
            email,
            custom: {
              user_id: userId
            }
          }
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: String(storeId)
            }
          },
          variant: {
            data: {
              type: 'variants',
              id: String(variantId)
            }
          }
        }
      }
    })
  });

  const raw = await res.text().catch(() => '');

  if (!res.ok) {
    console.error(
      '[billing] Lemon create checkout (skip_trial) failed',
      plan,
      res.status,
      raw
    );
    return { ok: false, reason: 'http', detail: raw.slice(0, 500) };
  }

  let json: { data?: { attributes?: { url?: string } } };
  try {
    json = JSON.parse(raw) as { data?: { attributes?: { url?: string } } };
  } catch {
    return { ok: false, reason: 'bad_response', detail: 'invalid JSON' };
  }

  const url = json.data?.attributes?.url;
  if (typeof url === 'string' && url.trim()) {
    return { ok: true, url: url.trim() };
  }

  console.error('[billing] Lemon checkout response missing url', raw.slice(0, 800));
  return { ok: false, reason: 'bad_response', detail: 'no url in response' };
}

/**
 * Creates a one-off Lemon checkout with `skip_trial: true` and custom product description.
 */
async function tryCreateLemonCheckoutSkipTrialForPlan(
  plan: BillingPlanKey,
  email: string,
  userId: string
): Promise<string | null> {
  const r = await createLemonSkipTrialCheckout(plan, email, userId);
  return r.ok ? r.url : null;
}

async function tryCreateLemonCheckoutSkipTrial(
  email: string,
  userId: string
): Promise<string | null> {
  return tryCreateLemonCheckoutSkipTrialForPlan('monthly', email, userId);
}

function checkoutUrlSkipTrialFallbackForPlan(
  plan: BillingPlanKey,
  email: string,
  userId: string
): string {
  const fromEnv =
    plan === 'monthly'
      ? process.env.LEMONSQUEEZY_CHECKOUT_URL_MONTHLY_SKIP_TRIAL?.trim()
      : '';
  const base =
    fromEnv && fromEnv.length > 0 ? fromEnv : baseCheckoutUrlFromPlan(plan);
  const url = new URL(base);
  url.searchParams.set('checkout[email]', email);
  url.searchParams.set('checkout[custom][user_id]', userId);
  if (!fromEnv) {
    url.searchParams.set('checkout[skip_trial]', '1');
  }
  return url.toString();
}

function checkoutUrlSkipTrialFallback(email: string, userId: string): string {
  return checkoutUrlSkipTrialFallbackForPlan('monthly', email, userId);
}

/** Monthly paid plan: skip Lemon trial and charge on checkout (API checkout preferred). */
export async function getCheckoutURLSkipTrialMonthly(): Promise<string> {
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

  const apiUrl = await tryCreateLemonCheckoutSkipTrial(user.email, user.id);
  if (apiUrl) return apiUrl;

  return checkoutUrlSkipTrialFallback(user.email, user.id);
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

/**
 * Lemon checkout for the billing tier inferred from the user’s current subscription (e.g. trial variant),
 * same heuristic as `/subscription` current plan. Falls back to monthly.
 */
export async function getCheckoutURLForPreferredPlan(): Promise<string> {
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

  const [{ data: profile }, { data: subRows }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created', { ascending: false })
      .limit(20)
  ]);

  const subscription = pickCanonicalSubscription(
    subRows ?? []
  ) as SubscriptionWithPriceAndProduct | null;
  const tier = inferSubscriptionBillingTier(
    subscription,
    profile as Tables<'profiles'> | null
  );
  const plan: BillingPlanKey = tier ?? 'monthly';

  const r = await createLemonSkipTrialCheckout(plan, user.email, user.id);
  if (r.ok) return r.url;

  if (r.reason === 'missing_env') {
    throw new Error(
      'Checkout is not configured: add LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, and variant IDs (LEMONSQUEEZY_MONTHLY_VARIANT_ID, etc.) to the server environment. API checkout is required to replace trial text and skip the trial.'
    );
  }

  throw new Error(
    'Could not open checkout. Check server logs for [billing] Lemon create checkout. If Lemon returned an error, verify API key and variant IDs match your store (Test vs Live).'
  );
}
