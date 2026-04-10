import type { Json, Tables } from '@/types_db';

type Profile = Tables<'profiles'>;
type Subscription = Tables<'subscriptions'>;
type Price = Tables<'prices'>;
type Product = Tables<'products'>;

export type SubscriptionWithPriceAndProduct = Subscription & {
  prices:
    | (Price & {
        products: Product | null;
      })
    | null
    | (Price & {
        products: Product | null;
      })[];
};

/** Billing cadence for pricing cards (Monthly / Quarterly / Yearly). */
export type SubscriptionBillingTier = 'monthly' | 'quarterly' | 'yearly';

function getEmbeddedPriceRow(
  subscription: SubscriptionWithPriceAndProduct
): (Price & { products: Product | null }) | null {
  const raw = subscription.prices;
  if (!raw) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  return row ?? null;
}

/** Match checkout variant ids from env (Lemon); works when product_name is missing in SSR row. */
function inferTierFromLemonVariantId(
  providerVariantId: string | null | undefined
): SubscriptionBillingTier | null {
  if (providerVariantId == null || providerVariantId === '') return null;
  const vid = String(providerVariantId).trim();
  const monthly = process.env.NEXT_PUBLIC_LS_MONTHLY_VARIANT_ID;
  const quarterly = process.env.NEXT_PUBLIC_LS_QUARTERLY_VARIANT_ID;
  const yearly = process.env.NEXT_PUBLIC_LS_YEARLY_VARIANT_ID;
  if (monthly && vid === String(monthly).trim()) return 'monthly';
  if (quarterly && vid === String(quarterly).trim()) return 'quarterly';
  if (yearly && vid === String(yearly).trim()) return 'yearly';
  return null;
}

/** Last-resort tier from stored Lemon webhook JSON (same fields as live webhook). */
function inferBillingTierFromRawPayload(raw: Json | null): SubscriptionBillingTier | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const root = raw as Record<string, unknown>;
  const data = root.data as Record<string, unknown> | undefined;
  const attrs = (data?.attributes ?? root.attributes) as Record<string, unknown> | undefined;
  if (!attrs || typeof attrs !== 'object') return null;
  const productName = String(attrs.product_name ?? '');
  const variantName = String(attrs.variant_name ?? '');
  const planText = `${productName} ${variantName}`.toLowerCase();
  if (planText.includes('year')) return 'yearly';
  if (planText.includes('quarter')) return 'quarterly';
  if (planText.includes('month')) return 'monthly';
  return null;
}

/**
 * Which pricing-card tier the user's subscription maps to (including Lemon trial on a variant).
 * Used for /subscription “current plan” vs “Upgrade” CTAs.
 */
export function inferSubscriptionBillingTier(
  subscription: SubscriptionWithPriceAndProduct | null,
  profile: Profile | null
): SubscriptionBillingTier | null {
  if (subscription) {
    if (subscription.plan_code === 'monthly_pro') return 'monthly';
    if (subscription.plan_code === 'quarterly_pro') return 'quarterly';
    if (subscription.plan_code === 'yearly_pro') return 'yearly';

    const priceRow = getEmbeddedPriceRow(subscription);
    const interval = priceRow?.interval;
    const intervalCount = priceRow?.interval_count ?? 1;
    if (interval === 'year') return 'yearly';
    if (interval === 'month' && intervalCount === 3) return 'quarterly';
    if (interval === 'month') return 'monthly';

    const productName = priceRow?.products?.name ?? '';
    const planText = `${subscription.provider_product_name ?? ''} ${subscription.provider_variant_name ?? ''} ${productName}`.toLowerCase();
    if (planText.includes('year')) return 'yearly';
    if (planText.includes('quarter')) return 'quarterly';
    if (planText.includes('month')) return 'monthly';

    const fromRaw = inferBillingTierFromRawPayload(subscription.raw_payload);
    if (fromRaw) return fromRaw;

    const fromVariant = inferTierFromLemonVariantId(subscription.provider_variant_id);
    if (fromVariant) return fromVariant;
  }

  switch (profile?.subscription_plan) {
    case 'monthly_pro':
      return 'monthly';
    case 'quarterly_pro':
      return 'quarterly';
    case 'yearly_pro':
      return 'yearly';
    default:
      return null;
  }
}

export type AppSubscriptionPlan =
  | 'free'
  | 'trial'
  | 'monthly_pro'
  | 'quarterly_pro'
  | 'yearly_pro';

export type AppSubscriptionPresentation = {
  plan: AppSubscriptionPlan;
  label: string;
  status: string;
  isSubscribed: boolean;
  nextBillingDate: string | null;
  endsAt: string | null;
  trialEndsAt: string | null;
  remainingDays: number | null;
  remainingHours: number | null;
  countdownLabel: string | null;
  progressPercent: number | null;
};

const DISPLAY_LABELS: Record<AppSubscriptionPlan, string> = {
  free: 'Free Plan',
  trial: '3-Day Trial',
  monthly_pro: 'Monthly Pro',
  quarterly_pro: 'Quarterly Pro',
  yearly_pro: 'Yearly Pro'
};

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string | null | undefined) {
  const date = parseDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function getRemainingTime(targetValue: string | null | undefined, nowValue?: string | null) {
  const target = parseDate(targetValue);
  const now = parseDate(nowValue ?? null) ?? new Date();
  if (!target) {
    return {
      remainingMs: null,
      remainingDays: null,
      remainingHours: null
    };
  }

  const remainingMs = Math.max(0, target.getTime() - now.getTime());
  return {
    remainingMs,
    remainingDays: Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24))),
    remainingHours: Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60)))
  };
}

function getCountdownLabel(targetValue: string | null | undefined, nowValue?: string | null) {
  const { remainingMs, remainingDays, remainingHours } = getRemainingTime(targetValue, nowValue);
  if (remainingMs == null) return null;
  if (remainingMs < 1000 * 60 * 60) return 'Expires soon';
  if (remainingMs < 1000 * 60 * 60 * 48) {
    return `Expires in ${remainingHours} hour${remainingHours === 1 ? '' : 's'}`;
  }
  return `Expires in ${remainingDays} day${remainingDays === 1 ? '' : 's'}`;
}

function getProgressPercent(
  startValue: string | null | undefined,
  endValue: string | null | undefined,
  nowValue?: string | null
) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  const now = parseDate(nowValue ?? null) ?? new Date();
  if (!start || !end || end <= start) return null;
  const total = end.getTime() - start.getTime();
  const remaining = Math.min(Math.max(end.getTime() - now.getTime(), 0), total);
  return Math.max(6, Math.min(100, (remaining / total) * 100));
}

function normalizeProviderStatus(status: string | null | undefined) {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'subscription_cancelled') return 'cancelled';
  if (normalized === 'subscription_canceled') return 'canceled';
  if (normalized === 'subscription_resumed') return 'active';
  if (normalized === 'subscription_payment_recovered') return 'active';
  if (normalized === 'subscription_payment_success') return 'active';
  if (normalized === 'subscription_payment_failed') return 'past_due';
  if (normalized === 'subscription_expired') return 'expired';
  if (normalized === 'subscription_paused') return 'paused';
  if (normalized === 'subscription_unpaused') return 'active';
  if (!normalized) return 'inactive';
  return normalized;
}

function isWithinGracePeriod(subscription: SubscriptionWithPriceAndProduct | null, nowValue?: string | null) {
  const normalizedStatus = normalizeProviderStatus(subscription?.status);
  if (normalizedStatus !== 'canceled' && normalizedStatus !== 'cancelled') {
    return false;
  }
  const endDate =
    parseDate(subscription?.ended_at) ??
    parseDate(subscription?.cancel_at) ??
    parseDate(subscription?.current_period_end) ??
    parseDate(subscription?.renews_at);
  const now = parseDate(nowValue ?? null) ?? new Date();
  return Boolean(endDate && endDate.getTime() > now.getTime());
}

function derivePlanFromSubscription(
  subscription: SubscriptionWithPriceAndProduct | null,
  fallbackPlan: AppSubscriptionPlan,
  nowValue?: string | null
): AppSubscriptionPlan {
  if (!subscription) return fallbackPlan;

  const debugStatus = normalizeProviderStatus(subscription.status);
  const trialEndsAt = subscription.trial_end;
  const trialStillRunning = Boolean(
    parseDate(trialEndsAt) &&
      (parseDate(nowValue ?? null) ?? new Date()).getTime() < (parseDate(trialEndsAt)?.getTime() ?? 0)
  );

  if ((debugStatus === 'trialing' || debugStatus === 'on_trial') && trialStillRunning) {
    return 'trial';
  }

  if (
    debugStatus !== 'active' &&
    !isWithinGracePeriod(subscription, nowValue) &&
    debugStatus !== 'trialing' &&
    debugStatus !== 'on_trial'
  ) {
    return fallbackPlan;
  }

  if (subscription.plan_code === 'trial') return 'trial';
  if (subscription.plan_code === 'monthly_pro') return 'monthly_pro';
  if (subscription.plan_code === 'quarterly_pro') return 'quarterly_pro';
  if (subscription.plan_code === 'yearly_pro') return 'yearly_pro';

  const priceRow = getEmbeddedPriceRow(subscription);
  const interval = priceRow?.interval;
  const intervalCount = priceRow?.interval_count ?? 1;
  if (interval === 'year') return 'yearly_pro';
  if (interval === 'month' && intervalCount === 3) return 'quarterly_pro';
  if (interval === 'month') return 'monthly_pro';
  return fallbackPlan;
}

function getFallbackPlan(profile: Profile | null): AppSubscriptionPlan {
  switch (profile?.subscription_plan) {
    case 'trial':
    case 'monthly_pro':
    case 'quarterly_pro':
    case 'yearly_pro':
      return profile.subscription_plan;
    default:
      return profile?.is_subscribed ? 'monthly_pro' : 'free';
  }
}

export function deriveSubscriptionPresentation(
  profile: Profile | null,
  subscription: SubscriptionWithPriceAndProduct | null
): AppSubscriptionPresentation {
  const nowValue = null;
  const effectiveSubscription = subscription;
  const fallbackPlan = getFallbackPlan(profile);
  const plan = derivePlanFromSubscription(effectiveSubscription, fallbackPlan, nowValue);
  const trialEndsAt = effectiveSubscription?.trial_end ?? null;
  const { remainingDays, remainingHours } = getRemainingTime(trialEndsAt, nowValue);
  const countdownLabel = plan === 'trial' ? getCountdownLabel(trialEndsAt, nowValue) : null;
  const progressPercent =
    plan === 'trial'
      ? getProgressPercent(
          effectiveSubscription?.trial_start ?? profile?.created_at ?? null,
          trialEndsAt,
          nowValue
        )
      : null;
  const nextBillingDate = formatDate(
    effectiveSubscription?.renews_at ?? effectiveSubscription?.current_period_end
  );
  const endsAt = formatDate(effectiveSubscription?.ended_at ?? effectiveSubscription?.cancel_at);
  const providerStatus = normalizeProviderStatus(effectiveSubscription?.status);
  const isSubscribed =
    plan !== 'free' &&
    (providerStatus === 'active' ||
      providerStatus === 'subscription_created' ||
      providerStatus === 'subscription_updated' ||
      providerStatus === 'trialing' ||
      providerStatus === 'on_trial' ||
      isWithinGracePeriod(effectiveSubscription, nowValue) ||
      (!effectiveSubscription && Boolean(profile?.is_subscribed)));

  return {
    plan,
    label: DISPLAY_LABELS[plan],
    status: providerStatus,
    isSubscribed,
    nextBillingDate,
    endsAt,
    trialEndsAt,
    remainingDays,
    remainingHours,
    countdownLabel,
    progressPercent
  };
}

export function hasActiveSubscriptionAccess(
  profile: Profile | null,
  subscription: SubscriptionWithPriceAndProduct | null
) {
  return deriveSubscriptionPresentation(profile, subscription).isSubscribed;
}
