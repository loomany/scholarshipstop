'use server';

import { pickCanonicalSubscription } from '@/lib/payments/subscriptionAccess';
import {
  inferSubscriptionBillingTier,
  type SubscriptionWithPriceAndProduct
} from '@/lib/payments/subscriptionEntitlements';
import {
  parseBillingPlanKey,
  resolveLemonCheckoutConfig,
  SECURE_CHECKOUT_UNAVAILABLE_MESSAGE,
  validateLemonVariantMode
} from '@/lib/payments/lemonRuntimeConfig';
import type { BillingPlanKey } from '@/lib/payments/lemonVariantIds';
import type { Tables } from '@/types_db';
import { createClient } from '@/utils/supabase/server';

export type { BillingPlanKey };

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
  | {
      ok: false;
      reason: 'invalid_config' | 'variant_rejected' | 'http' | 'bad_response';
      detail?: string;
    };

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
  const resolved = resolveLemonCheckoutConfig(plan);
  if (!resolved.ok) {
    console.warn('[billing] checkout disabled by config guard', {
      plan,
      checkoutMode: mode,
      reason: resolved.reason
    });
    return { ok: false, reason: 'invalid_config', detail: resolved.reason };
  }
  const { apiKey, storeId, variantId } = resolved.config;

  const variantNum = Number.parseInt(variantId, 10);
  if (!Number.isFinite(variantNum)) {
    return { ok: false, reason: 'invalid_config', detail: 'invalid_variant' };
  }

  let variantValidation: Awaited<ReturnType<typeof validateLemonVariantMode>>;
  try {
    variantValidation = await validateLemonVariantMode(resolved.config);
  } catch {
    return {
      ok: false,
      reason: 'variant_rejected',
      detail: 'provider_unreachable'
    };
  }
  if (!variantValidation.ok) {
    console.warn('[billing] checkout variant rejected by live/test guard', {
      plan,
      mode: resolved.config.mode,
      reason: variantValidation.reason
    });
    return {
      ok: false,
      reason: 'variant_rejected',
      detail: variantValidation.reason
    };
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

  console.error(
    '[billing] Lemon checkout response missing url',
    raw.slice(0, 800)
  );
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
  throw new Error(SECURE_CHECKOUT_UNAVAILABLE_MESSAGE);
}

export async function getCheckoutURL(plan: BillingPlanKey): Promise<string> {
  const parsedPlan = parseBillingPlanKey(plan);
  if (!parsedPlan) throw new Error('Choose a valid subscription plan.');
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
    parsedPlan,
    user.email,
    user.id,
    'with_trial'
  );
  if (apiCheckout.ok) {
    return apiCheckout.url;
  }

  console.warn('[billing] secure checkout unavailable', {
    plan: parsedPlan,
    reason: apiCheckout.reason,
    detail: apiCheckout.detail
  });

  throw new Error(SECURE_CHECKOUT_UNAVAILABLE_MESSAGE);
}

export type PreferredPlanCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * **Pay now — no free trial** on this checkout path. Hosted URL fallbacks are intentionally disabled.
 *
 * Used by AI Mentor “Start” (inline card + modal), *not* by the main `/subscription` “Start free trial” buttons
 * (`getCheckoutURL` uses `with_trial`).
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
    const plan: BillingPlanKey =
      tier === 'yearly'
        ? 'yearly'
        : tier === 'quarterly'
          ? 'quarterly'
          : 'monthly';

    const r = await createLemonSkipTrialCheckout(plan, user.email, user.id);
    if (r.ok) return { ok: true, url: r.url };

    if (r.reason === 'invalid_config') {
      return {
        ok: false,
        error: SECURE_CHECKOUT_UNAVAILABLE_MESSAGE
      };
    }

    console.warn(
      '[billing] getCheckoutURLForPreferredPlan: secure checkout unavailable',
      { plan, reason: r.reason, detail: r.detail?.slice?.(0, 200) }
    );
    return {
      ok: false,
      error: SECURE_CHECKOUT_UNAVAILABLE_MESSAGE
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
