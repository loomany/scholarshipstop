import type { Tables } from '@/types_db';

type Profile = Tables<'profiles'>;
type Subscription = Tables<'subscriptions'>;
type Price = Tables<'prices'>;
type Product = Tables<'products'>;

export type SubscriptionWithPriceAndProduct = Subscription & {
  prices:
    | (Price & {
        products: Product | null;
      })
    | null;
};

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

  const interval = subscription.prices?.interval;
  const intervalCount = subscription.prices?.interval_count ?? 1;
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

function getEffectiveNow(profile: Profile | null) {
  return profile?.subscription_debug_now ?? null;
}

export function deriveSubscriptionPresentation(
  profile: Profile | null,
  subscription: SubscriptionWithPriceAndProduct | null
): AppSubscriptionPresentation {
  const nowValue = getEffectiveNow(profile);
  const debugPlan = profile?.subscription_debug_plan;
  const effectiveSubscription: SubscriptionWithPriceAndProduct | null = subscription
    ? {
        ...subscription,
        status:
          (profile?.subscription_debug_status as Subscription['status'] | null | undefined) ??
          subscription.status,
        trial_end: profile?.subscription_debug_trial_ends_at ?? subscription.trial_end,
        renews_at: profile?.subscription_debug_renews_at ?? subscription.renews_at
      }
    : null;

  const fallbackPlan = getFallbackPlan(profile);
  const plan =
    debugPlan === 'free' ||
    debugPlan === 'trial' ||
    debugPlan === 'monthly_pro' ||
    debugPlan === 'quarterly_pro' ||
    debugPlan === 'yearly_pro'
      ? debugPlan
      : derivePlanFromSubscription(effectiveSubscription, fallbackPlan, nowValue);

  const trialEndsAt =
    profile?.subscription_debug_trial_ends_at ?? effectiveSubscription?.trial_end ?? null;
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
    profile?.subscription_debug_renews_at ??
      effectiveSubscription?.renews_at ??
      effectiveSubscription?.current_period_end
  );
  const endsAt = formatDate(effectiveSubscription?.ended_at ?? effectiveSubscription?.cancel_at);
  const providerStatus = normalizeProviderStatus(
    profile?.subscription_debug_status ?? effectiveSubscription?.status
  );
  const hasDebugOverride =
    debugPlan === 'free' ||
    debugPlan === 'trial' ||
    debugPlan === 'monthly_pro' ||
    debugPlan === 'quarterly_pro' ||
    debugPlan === 'yearly_pro';
  const isSubscribed = hasDebugOverride
    ? plan === 'trial'
      ? Boolean(parseDate(trialEndsAt) && (parseDate(nowValue ?? null) ?? new Date()) < (parseDate(trialEndsAt) ?? new Date()))
      : plan !== 'free'
    : plan !== 'free' &&
      (providerStatus === 'active' ||
        providerStatus === 'subscription_created' ||
        providerStatus === 'subscription_updated' ||
        providerStatus === 'trialing' ||
        providerStatus === 'on_trial' ||
        isWithinGracePeriod(effectiveSubscription, nowValue) ||
        false);

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
