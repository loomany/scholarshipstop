import type { Json, Tables } from '@/types_db';
import {
  hasSubscriptionAccess,
  isGracePeriodActive,
  normalizeSubscriptionStatus
} from '@/lib/payments/subscriptionAccess';

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

function envVariantIdList(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
}

function envVariantIds(primaryName: string, legacyName: string): string[] {
  return Array.from(
    new Set([
      ...envVariantIdList(process.env[primaryName]),
      ...envVariantIdList(process.env[legacyName])
    ])
  );
}

/** Match checkout variant ids from env (Lemon). Comma-separated lists allowed (test vs live ids). */
function inferTierFromLemonVariantId(
  providerVariantId: string | null | undefined
): SubscriptionBillingTier | null {
  if (providerVariantId == null || providerVariantId === '') return null;
  const vid = String(providerVariantId).trim();
  const monthly = envVariantIds('NEXT_PUBLIC_LS_MONTHLY_VARIANT_ID', 'LEMONSQUEEZY_MONTHLY_VARIANT_ID');
  const quarterly = envVariantIds(
    'NEXT_PUBLIC_LS_QUARTERLY_VARIANT_ID',
    'LEMONSQUEEZY_QUARTERLY_VARIANT_ID'
  );
  const yearly = envVariantIds('NEXT_PUBLIC_LS_YEARLY_VARIANT_ID', 'LEMONSQUEEZY_YEARLY_VARIANT_ID');
  if (monthly.includes(vid)) return 'monthly';
  if (quarterly.includes(vid)) return 'quarterly';
  if (yearly.includes(vid)) return 'yearly';
  return null;
}

/** Last-resort tier from stored Lemon webhook JSON (same fields as live webhook). */
function inferBillingTierFromRawPayload(raw: Json | null): SubscriptionBillingTier | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const root = raw as Record<string, unknown>;
  const data = root.data as Record<string, unknown> | undefined;
  const attrs = (data?.attributes ?? root.attributes) as Record<string, unknown> | undefined;
  if (!attrs || typeof attrs !== 'object') return null;
  const variantIdRaw = attrs.variant_id;
  if (variantIdRaw != null && variantIdRaw !== '') {
    const fromVid = inferTierFromLemonVariantId(String(variantIdRaw));
    if (fromVid) return fromVid;
  }
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

    const fromProviderVariant = inferTierFromLemonVariantId(subscription.provider_variant_id);
    if (fromProviderVariant) return fromProviderVariant;

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

function isWithinGracePeriod(subscription: SubscriptionWithPriceAndProduct | null, nowValue?: string | null) {
  return isGracePeriodActive(
    {
      status: subscription?.status,
      endedAt: subscription?.ended_at,
      cancelAt: subscription?.cancel_at,
      currentPeriodEnd: subscription?.current_period_end,
      renewsAt: subscription?.renews_at
    },
    nowValue
  );
}

function derivePlanFromSubscription(
  subscription: SubscriptionWithPriceAndProduct | null,
  fallbackPlan: AppSubscriptionPlan,
  nowValue?: string | null
): AppSubscriptionPlan {
  if (!subscription) return fallbackPlan;

  const debugStatus = normalizeSubscriptionStatus(subscription.status);

  // Payment failed / lapsed — do not keep a paid plan from stale profile fallback.
  if (
    debugStatus === 'past_due' ||
    debugStatus === 'unpaid' ||
    debugStatus === 'expired'
  ) {
    return 'free';
  }

  if (
    (debugStatus === 'cancelled' || debugStatus === 'canceled') &&
    !isWithinGracePeriod(subscription, nowValue)
  ) {
    return 'free';
  }

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
  const providerStatus = normalizeSubscriptionStatus(effectiveSubscription?.status);
  const isSubscribed =
    plan !== 'free' &&
    (hasSubscriptionAccess(
      {
        status: effectiveSubscription?.status,
        endedAt: effectiveSubscription?.ended_at,
        cancelAt: effectiveSubscription?.cancel_at,
        currentPeriodEnd: effectiveSubscription?.current_period_end,
        renewsAt: effectiveSubscription?.renews_at
      },
      nowValue
    ) ||
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
