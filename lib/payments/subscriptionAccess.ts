type AccessStatusLike = {
  status?: string | null;
  ended_at?: string | null;
  cancel_at?: string | null;
  current_period_end?: string | null;
  renews_at?: string | null;
  created?: string | null;
};

type AccessWindowLike = {
  status?: string | null;
  endedAt?: string | null;
  cancelAt?: string | null;
  currentPeriodEnd?: string | null;
  renewsAt?: string | null;
};

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeSubscriptionStatus(status: string | null | undefined) {
  const normalized = (status ?? '').trim().toLowerCase();
  switch (normalized) {
    case 'subscription_cancelled':
      return 'cancelled';
    case 'subscription_canceled':
      return 'canceled';
    case 'subscription_resumed':
    case 'subscription_payment_recovered':
    case 'subscription_payment_success':
    case 'subscription_unpaused':
      return 'active';
    case 'subscription_payment_failed':
      return 'past_due';
    case 'subscription_expired':
      return 'expired';
    case 'subscription_paused':
      return 'paused';
    case 'on_trial':
      return 'trialing';
    default:
      return normalized || 'inactive';
  }
}

export function getSubscriptionAccessEndDate({
  endedAt,
  cancelAt,
  currentPeriodEnd,
  renewsAt
}: AccessWindowLike) {
  return (
    parseDate(endedAt) ??
    parseDate(cancelAt) ??
    parseDate(currentPeriodEnd) ??
    parseDate(renewsAt)
  );
}

export function isGracePeriodActive(
  {
    status,
    endedAt,
    cancelAt,
    currentPeriodEnd,
    renewsAt
  }: AccessWindowLike,
  nowValue?: string | null
) {
  const normalizedStatus = normalizeSubscriptionStatus(status);
  if (normalizedStatus !== 'canceled' && normalizedStatus !== 'cancelled') {
    return false;
  }

  const accessEndDate = getSubscriptionAccessEndDate({
    endedAt,
    cancelAt,
    currentPeriodEnd,
    renewsAt
  });
  const now = parseDate(nowValue ?? null) ?? new Date();
  return Boolean(accessEndDate && accessEndDate.getTime() > now.getTime());
}

export function hasSubscriptionAccess(
  {
    status,
    endedAt,
    cancelAt,
    currentPeriodEnd,
    renewsAt
  }: AccessWindowLike,
  nowValue?: string | null
) {
  const normalizedStatus = normalizeSubscriptionStatus(status);
  return (
    normalizedStatus === 'active' ||
    normalizedStatus === 'trialing' ||
    normalizedStatus === 'on_trial' ||
    isGracePeriodActive(
      {
        status: normalizedStatus,
        endedAt,
        cancelAt,
        currentPeriodEnd,
        renewsAt
      },
      nowValue
    )
  );
}

function subscriptionPriorityScore(subscription: AccessStatusLike) {
  const normalizedStatus = normalizeSubscriptionStatus(subscription.status);
  if (
    normalizedStatus === 'active' ||
    normalizedStatus === 'trialing' ||
    normalizedStatus === 'on_trial'
  ) {
    return 4;
  }
  if (
    isGracePeriodActive({
      status: normalizedStatus,
      endedAt: subscription.ended_at,
      cancelAt: subscription.cancel_at,
      currentPeriodEnd: subscription.current_period_end,
      renewsAt: subscription.renews_at
    })
  ) {
    return 3;
  }
  if (
    normalizedStatus === 'paused' ||
    normalizedStatus === 'past_due' ||
    normalizedStatus === 'unpaid'
  ) {
    return 2;
  }
  if (normalizedStatus === 'expired' || normalizedStatus === 'inactive') {
    return 0;
  }
  return 1;
}

function subscriptionSortTimestamp(subscription: AccessStatusLike) {
  return (
    getSubscriptionAccessEndDate({
      endedAt: subscription.ended_at,
      cancelAt: subscription.cancel_at,
      currentPeriodEnd: subscription.current_period_end,
      renewsAt: subscription.renews_at
    })?.getTime() ??
    parseDate(subscription.created)?.getTime() ??
    0
  );
}

export function pickCanonicalSubscription<T extends AccessStatusLike>(subscriptions: T[]) {
  if (subscriptions.length === 0) return null;

  return [...subscriptions].sort((left, right) => {
    const scoreDiff = subscriptionPriorityScore(right) - subscriptionPriorityScore(left);
    if (scoreDiff !== 0) return scoreDiff;

    const timeDiff = subscriptionSortTimestamp(right) - subscriptionSortTimestamp(left);
    if (timeDiff !== 0) return timeDiff;

    const leftCreated = parseDate(left.created)?.getTime() ?? 0;
    const rightCreated = parseDate(right.created)?.getTime() ?? 0;
    return rightCreated - leftCreated;
  })[0]!;
}

export function createSubscriptionEventFingerprint(input: {
  eventName: string;
  subscriptionId: string;
  status?: string | null;
  updatedAt?: string | null;
  renewsAt?: string | null;
  endsAt?: string | null;
  trialEndsAt?: string | null;
  cancelled?: boolean | null;
  orderId?: string | number | null;
}) {
  return [
    input.eventName,
    input.subscriptionId,
    normalizeSubscriptionStatus(input.status),
    input.updatedAt ?? '',
    input.renewsAt ?? '',
    input.endsAt ?? '',
    input.trialEndsAt ?? '',
    input.cancelled ? '1' : '0',
    input.orderId != null ? String(input.orderId) : ''
  ].join(':');
}
