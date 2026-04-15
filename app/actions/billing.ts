'use server';

import { pickCanonicalSubscription } from '@/lib/payments/subscriptionAccess';
import {
  inferSubscriptionBillingTier,
  type SubscriptionWithPriceAndProduct
} from '@/lib/payments/subscriptionEntitlements';
import {
  resolveLemonVariantIdForBillingPlan,
  type BillingPlanKey
} from '@/lib/payments/lemonVariantIds';
import type { Tables } from '@/types_db';
import { createClient } from '@/utils/supabase/server';

export type { BillingPlanKey };

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
      ? 'https://pay.scholarshiptop.com/checkout/buy/4e63048d-5d76-4818-925c-048b10047128?logo=0&discount=0'
      : plan === 'quarterly'
        ? 'https://pay.scholarshiptop.com/checkout/buy/3faf88f4-d2d6-437f-808f-f641bcb955a1?logo=0&discount=0'
        : 'https://pay.scholarshiptop.com/checkout/buy/152da89c-f707-4417-9cd8-3be69938a677?logo=0&discount=0';

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

type LemonCheckoutApiResult =
  | { ok: true; url: string }
  | { ok: false; reason: 'missing_env' | 'http' | 'bad_response'; detail?: string };

type LemonCheckoutMode = 'with_trial' | 'skip_trial';

/**
 * Creates checkout via Lemon API so the **variant id** is explicit.
 * Hosted `/checkout/buy/{uuid}` URLs often point at a **multi-variant** product; Lemon may pre-select
 * the wrong plan (e.g. yearly). API checkout locks `relationships.variant` + `enabled_variants`.
 *
 * - `with_trial`: normal trial from variant settings (no `skip_trial`).
 * - `skip_trial`: same as before — custom copy + immediate charge semantics.
 */
async function createLemonCheckoutForPlan(
  plan: BillingPlanKey,
  email: string,
  userId: string,
  mode: LemonCheckoutMode
): Promise<LemonCheckoutApiResult> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim();
  const storeId = process.env.LEMONSQUEEZY_STORE_ID?.trim();
  const variantId = resolveLemonVariantIdForBillingPlan(plan);
  if (!apiKey || !storeId || !variantId) {
    return { ok: false, reason: 'missing_env' };
  }

  const variantNum = Number.parseInt(variantId, 10);
  if (!Number.isFinite(variantNum)) {
    return { ok: false, reason: 'missing_env', detail: 'invalid variant id' };
  }

  const productOptions: {
    enabled_variants: number[];
    name?: string;
    description?: string;
  } = {
    enabled_variants: [variantNum]
  };

  const attributes: {
    checkout_data: { email: string; custom: { user_id: string } };
    product_options: typeof productOptions;
    checkout_options?: { skip_trial: boolean; desc?: boolean };
  } = {
    checkout_data: {
      email,
      custom: {
        user_id: userId
      }
    },
    product_options: productOptions
  };

  if (mode === 'skip_trial') {
    attributes.checkout_options = {
      skip_trial: true,
      desc: true
    };
    productOptions.name = planProductTitle(plan);
    productOptions.description = lemonSkipTrialCheckoutDescriptionHtml(plan);
  }

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
        attributes,
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
      '[billing] Lemon create checkout failed',
      { plan, mode },
      res.status,
      raw.slice(0, 800)
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

async function createLemonSkipTrialCheckout(
  plan: BillingPlanKey,
  email: string,
  userId: string
): Promise<LemonCheckoutApiResult> {
  return createLemonCheckoutForPlan(plan, email, userId, 'skip_trial');
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

  const apiCheckout = await createLemonCheckoutForPlan(
    plan,
    user.email,
    user.id,
    'with_trial'
  );
  if (apiCheckout.ok) {
    return apiCheckout.url;
  }

  console.warn(
    '[billing] getCheckoutURL: Lemon API checkout failed; using hosted checkout URL — multi-variant products may show the wrong default plan',
    { plan, reason: apiCheckout }
  );

  return checkoutUrlFromPlan({
    plan,
    email: user.email,
    userId: user.id
  });
}

export type PreferredPlanCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Lemon checkout for the billing tier inferred from the user’s current subscription (e.g. trial variant),
 * same heuristic as `/subscription` current plan. Falls back to monthly.
 *
 * Returns a plain object (never throws) so production clients show a real message instead of the
 * generic Next.js Server Action error.
 */
export async function getCheckoutURLForPreferredPlan(): Promise<PreferredPlanCheckoutResult> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        ok: false,
        error: error?.message ?? 'You must be signed in to subscribe.'
      };
    }

    if (!user.email) {
      return { ok: false, error: 'Your account is missing an email address.' };
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
    if (r.ok) return { ok: true, url: r.url };

    if (r.reason === 'missing_env') {
      return {
        ok: false,
        error:
          'Checkout is not configured on the server. Add LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, and LEMONSQUEEZY_MONTHLY_VARIANT_ID (and quarterly/yearly IDs) in Vercel → Environment Variables, then redeploy.'
      };
    }

    return {
      ok: false,
      error:
        'Payment link could not be created. Check Vercel logs for [billing] Lemon create checkout — often a wrong API key, store ID, or variant ID (Test vs Live mismatch).'
    };
  } catch (e) {
    console.error('[billing] getCheckoutURLForPreferredPlan', e);
    return {
      ok: false,
      error:
        'Something went wrong while creating the checkout link. Try again or open /subscription from the menu.'
    };
  }
}
