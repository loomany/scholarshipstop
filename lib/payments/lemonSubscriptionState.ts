export type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: {
      user_id?: string;
      userId?: string;
    };
  };
  data?: {
    attributes?: {
      status?: string;
      user_id?: string;
      userId?: string;
      custom_data?: {
        user_id?: string;
        userId?: string;
      };
    };
  };
};

export type LemonSubscriptionDecision =
  | { kind: 'update'; userId: string; isSubscribed: boolean; eventName: string }
  | { kind: 'ignored'; eventName: string };

export function resolveUserId(payload: LemonWebhookPayload): string | null {
  const userId =
    payload.data?.attributes?.user_id ??
    payload.data?.attributes?.userId ??
    payload.data?.attributes?.custom_data?.user_id ??
    payload.data?.attributes?.custom_data?.userId ??
    payload.meta?.custom_data?.user_id ??
    payload.meta?.custom_data?.userId ??
    null;
  return typeof userId === 'string' && userId.trim() ? userId : null;
}

export function toSubscribedFromLemonStatus(status?: string): boolean {
  const normalized = (status ?? '').toLowerCase();
  return normalized === 'active' || normalized === 'trialing';
}

export function decideSubscriptionUpdate(
  payload: LemonWebhookPayload
): LemonSubscriptionDecision {
  const eventName = payload.meta?.event_name ?? '';
  const userId = resolveUserId(payload);

  if (eventName === 'subscription.created') {
    if (!userId) throw new Error('Missing user id in webhook payload.');
    return { kind: 'update', userId, isSubscribed: true, eventName };
  }
  if (eventName === 'subscription.updated') {
    if (!userId) throw new Error('Missing user id in webhook payload.');
    return {
      kind: 'update',
      userId,
      isSubscribed: toSubscribedFromLemonStatus(payload.data?.attributes?.status),
      eventName
    };
  }
  if (eventName === 'subscription.deleted') {
    if (!userId) throw new Error('Missing user id in webhook payload.');
    return { kind: 'update', userId, isSubscribed: false, eventName };
  }

  return { kind: 'ignored', eventName };
}
