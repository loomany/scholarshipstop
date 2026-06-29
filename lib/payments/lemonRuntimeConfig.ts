import type { BillingPlanKey } from '@/lib/payments/lemonVariantIds';

export type LemonMode = 'live' | 'test';
type LemonEnv = Record<string, string | undefined>;

export type LemonCheckoutConfig = {
  mode: LemonMode;
  apiKey: string;
  storeId: string;
  variantId: string;
  webhookSecret: string;
};

export type LemonIqCheckoutConfig = LemonCheckoutConfig & {
  expectedTotal: number;
  currency: string;
};

export type LemonSubscriptionWebhookConfig = {
  mode: LemonMode;
  storeId: string;
  variantIds: Record<BillingPlanKey, string>;
  expectedTotals: Record<BillingPlanKey, number>;
  currency: string;
};

export type LemonConfigResult =
  | { ok: true; config: LemonCheckoutConfig }
  | {
      ok: false;
      reason:
        | 'disabled'
        | 'test_mode_in_production'
        | 'missing_api_config'
        | 'missing_variants'
        | 'invalid_variant'
        | 'duplicate_variants'
        | 'live_test_collision'
        | 'missing_webhook_secret';
    };

type LemonConfigFailureReason = Extract<
  LemonConfigResult,
  { ok: false }
>['reason'];

const PLANS: BillingPlanKey[] = ['monthly', 'quarterly', 'yearly'];

function envName(plan: BillingPlanKey, mode: LemonMode): string {
  return `LEMON_VARIANT_${plan.toUpperCase()}_${mode.toUpperCase()}`;
}

function valuesForMode(
  env: LemonEnv,
  mode: LemonMode
): Record<BillingPlanKey, string> {
  return {
    monthly: env[envName('monthly', mode)]?.trim() ?? '',
    quarterly: env[envName('quarterly', mode)]?.trim() ?? '',
    yearly: env[envName('yearly', mode)]?.trim() ?? ''
  };
}

function readMode(env: LemonEnv): LemonMode | null {
  const mode = env.LEMON_MODE?.trim().toLowerCase();
  return mode === 'live' || mode === 'test' ? mode : null;
}

export function parseBillingPlanKey(value: unknown): BillingPlanKey | null {
  return value === 'monthly' || value === 'quarterly' || value === 'yearly'
    ? value
    : null;
}

export function resolveLemonCheckoutConfig(
  plan: BillingPlanKey,
  env: LemonEnv = process.env,
  nodeEnv = process.env.NODE_ENV
): LemonConfigResult {
  const mode = readMode(env);
  if (!mode) return { ok: false, reason: 'disabled' };
  if (nodeEnv === 'production' && mode !== 'live') {
    return { ok: false, reason: 'test_mode_in_production' };
  }

  const apiKey = env.LEMONSQUEEZY_API_KEY?.trim() ?? '';
  const storeId = env.LEMONSQUEEZY_STORE_ID?.trim() ?? '';
  if (!apiKey || !storeId) return { ok: false, reason: 'missing_api_config' };

  const selected = valuesForMode(env, mode);
  if (PLANS.some((key) => !selected[key])) {
    return { ok: false, reason: 'missing_variants' };
  }
  if (PLANS.some((key) => !/^\d+$/.test(selected[key]))) {
    return { ok: false, reason: 'invalid_variant' };
  }
  if (new Set(Object.values(selected)).size !== PLANS.length) {
    return { ok: false, reason: 'duplicate_variants' };
  }

  const live = valuesForMode(env, 'live');
  const test = valuesForMode(env, 'test');
  if (PLANS.some((key) => live[key] && test[key] && live[key] === test[key])) {
    return { ok: false, reason: 'live_test_collision' };
  }

  const webhookSecret =
    mode === 'live'
      ? (env.LEMON_WEBHOOK_SECRET_LIVE?.trim() ?? '')
      : (env.LEMON_WEBHOOK_SECRET_TEST?.trim() ?? '');
  if (!webhookSecret) return { ok: false, reason: 'missing_webhook_secret' };

  return {
    ok: true,
    config: {
      mode,
      apiKey,
      storeId,
      variantId: selected[plan],
      webhookSecret
    }
  };
}

export function resolveLemonWebhookConfig(
  env: LemonEnv = process.env,
  nodeEnv = process.env.NODE_ENV
): { ok: true; mode: LemonMode; secret: string } | { ok: false } {
  const mode = readMode(env);
  if (!mode || (nodeEnv === 'production' && mode !== 'live'))
    return { ok: false };
  const secret =
    mode === 'live'
      ? env.LEMON_WEBHOOK_SECRET_LIVE?.trim()
      : env.LEMON_WEBHOOK_SECRET_TEST?.trim();
  return secret ? { ok: true, mode, secret } : { ok: false };
}

export function resolveLemonSubscriptionWebhookConfig(
  env: LemonEnv = process.env,
  nodeEnv = process.env.NODE_ENV
):
  | { ok: true; config: LemonSubscriptionWebhookConfig }
  | {
      ok: false;
      reason:
        | LemonConfigFailureReason
        | 'missing_prices'
        | 'invalid_price'
        | 'invalid_currency';
    } {
  const base = resolveLemonCheckoutConfig('monthly', env, nodeEnv);
  if (!base.ok) return base;

  const prices = PLANS.map((plan) =>
    env[`LEMON_PRICE_${plan.toUpperCase()}_MINOR`]?.trim()
  );
  if (prices.some((value) => !value)) {
    return { ok: false, reason: 'missing_prices' };
  }
  if (prices.some((value) => !/^\d+$/.test(value ?? ''))) {
    return { ok: false, reason: 'invalid_price' };
  }
  const parsedPrices = prices.map(Number);
  if (
    parsedPrices.some((value) => !Number.isSafeInteger(value) || value <= 0)
  ) {
    return { ok: false, reason: 'invalid_price' };
  }

  const currency = env.LEMON_SUBSCRIPTION_CURRENCY?.trim().toUpperCase() ?? '';
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, reason: 'invalid_currency' };
  }

  const variantIds = valuesForMode(env, base.config.mode);
  return {
    ok: true,
    config: {
      mode: base.config.mode,
      storeId: base.config.storeId,
      variantIds,
      expectedTotals: {
        monthly: parsedPrices[0]!,
        quarterly: parsedPrices[1]!,
        yearly: parsedPrices[2]!
      },
      currency
    }
  };
}

export function resolveLemonIqCheckoutConfig(
  env: LemonEnv = process.env,
  nodeEnv = process.env.NODE_ENV
):
  | { ok: true; config: LemonIqCheckoutConfig }
  | {
      ok: false;
      reason:
        | 'disabled'
        | 'test_mode_in_production'
        | 'missing_api_config'
        | 'missing_iq_variant'
        | 'invalid_iq_variant'
        | 'live_test_collision'
        | 'missing_webhook_secret'
        | 'invalid_expected_total'
        | 'invalid_currency';
    } {
  const mode = readMode(env);
  if (!mode) return { ok: false, reason: 'disabled' };
  if (nodeEnv === 'production' && mode !== 'live') {
    return { ok: false, reason: 'test_mode_in_production' };
  }

  const apiKey = env.LEMONSQUEEZY_API_KEY?.trim() ?? '';
  const storeId = env.LEMONSQUEEZY_STORE_ID?.trim() ?? '';
  if (!apiKey || !storeId) return { ok: false, reason: 'missing_api_config' };

  const liveVariant = env.LEMON_IQ_VARIANT_LIVE?.trim() ?? '';
  const testVariant = env.LEMON_IQ_VARIANT_TEST?.trim() ?? '';
  const variantId = mode === 'live' ? liveVariant : testVariant;
  if (!variantId) return { ok: false, reason: 'missing_iq_variant' };
  if (!/^\d+$/.test(variantId))
    return { ok: false, reason: 'invalid_iq_variant' };
  if (liveVariant && testVariant && liveVariant === testVariant) {
    return { ok: false, reason: 'live_test_collision' };
  }

  const webhook = resolveLemonWebhookConfig(env, nodeEnv);
  if (!webhook.ok) return { ok: false, reason: 'missing_webhook_secret' };

  const expectedTotalRaw = env.LEMON_IQ_EXPECTED_TOTAL_MINOR?.trim() ?? '';
  if (!/^\d+$/.test(expectedTotalRaw)) {
    return { ok: false, reason: 'invalid_expected_total' };
  }
  const expectedTotal = Number(expectedTotalRaw);
  if (!Number.isSafeInteger(expectedTotal) || expectedTotal <= 0) {
    return { ok: false, reason: 'invalid_expected_total' };
  }
  const currency = env.LEMON_IQ_CURRENCY?.trim().toUpperCase() ?? '';
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, reason: 'invalid_currency' };
  }

  return {
    ok: true,
    config: {
      mode,
      apiKey,
      storeId,
      variantId,
      webhookSecret: webhook.secret,
      expectedTotal,
      currency
    }
  };
}

export async function validateLemonVariantMode(
  config: LemonCheckoutConfig,
  fetchImpl: typeof fetch = fetch
): Promise<
  | { ok: true }
  | { ok: false; reason: 'http' | 'mode_mismatch' | 'store_mismatch' }
> {
  const response = await fetchImpl(
    `https://api.lemonsqueezy.com/v1/variants/${encodeURIComponent(config.variantId)}`,
    {
      headers: {
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${config.apiKey}`
      },
      cache: 'no-store'
    }
  );
  if (!response.ok) return { ok: false, reason: 'http' };

  const body = (await response.json().catch(() => null)) as {
    data?: {
      attributes?: { test_mode?: boolean };
      relationships?: { store?: { data?: { id?: string } } };
    };
  } | null;
  const testMode = body?.data?.attributes?.test_mode;
  if (testMode !== (config.mode === 'test')) {
    return { ok: false, reason: 'mode_mismatch' };
  }
  const providerStoreId = body?.data?.relationships?.store?.data?.id;
  if (providerStoreId && providerStoreId !== config.storeId) {
    return { ok: false, reason: 'store_mismatch' };
  }
  return { ok: true };
}

export const SECURE_CHECKOUT_UNAVAILABLE_MESSAGE =
  'Checkout is temporarily unavailable while secure payment setup is completed.';
