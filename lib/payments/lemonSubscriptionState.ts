import type { Json, TablesInsert } from '@/types_db';
import type { AppSubscriptionPlan } from '@/lib/payments/subscriptionEntitlements';

export type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: {
      user_id?: string;
      userId?: string;
    };
  };
  data?: {
    id?: string;
    attributes?: {
      store_id?: number;
      customer_id?: number;
      order_id?: number;
      product_id?: number;
      variant_id?: number;
      product_name?: string;
      variant_name?: string;
      status?: string;
      cancelled?: boolean;
      user_id?: string;
      userId?: string;
      renews_at?: string | null;
      ends_at?: string | null;
      trial_ends_at?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
      test_mode?: boolean;
      first_subscription_item?: {
        id?: number;
        price_id?: number;
        quantity?: number;
      } | null;
      custom_data?: {
        user_id?: string;
        userId?: string;
      };
      urls?: {
        customer_portal?: string | null;
        customer_portal_update_subscription?: string | null;
      } | null;
    };
  };
  attributes?: {
    store_id?: number;
    customer_id?: number;
    order_id?: number;
    product_id?: number;
    variant_id?: number;
    product_name?: string;
    variant_name?: string;
    status?: string;
    cancelled?: boolean;
    user_id?: string;
    userId?: string;
    renews_at?: string | null;
    ends_at?: string | null;
    trial_ends_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    test_mode?: boolean;
    first_subscription_item?: {
      id?: number;
      price_id?: number;
      quantity?: number;
    } | null;
    custom_data?: {
      user_id?: string;
      userId?: string;
    };
    urls?: {
      customer_portal?: string | null;
      customer_portal_update_subscription?: string | null;
    } | null;
  };
};

/** Lemon-signed URLs for managing billing (present on subscription webhooks when included). */
export function extractLemonCustomerPortalUrl(
  payload: LemonWebhookPayload
): string | null {
  const attrs = payload.data?.attributes ?? payload.attributes;
  const urls = attrs?.urls;
  const u =
    urls?.customer_portal_update_subscription?.trim() ||
    urls?.customer_portal?.trim() ||
    '';
  return u || null;
}

export type LemonSubscriptionDecision =
  | {
      kind: 'upsert';
      userId: string;
      isSubscribed: boolean;
      eventName: string;
      subscription: TablesInsert<'subscriptions'>;
      subscriptionPlan: AppSubscriptionPlan;
    }
  | { kind: 'ignored'; eventName: string };

export function resolveUserId(payload: LemonWebhookPayload): string | null {
  const userId =
    payload.data?.attributes?.user_id ??
    payload.data?.attributes?.userId ??
    payload.data?.attributes?.custom_data?.user_id ??
    payload.data?.attributes?.custom_data?.userId ??
    payload.attributes?.user_id ??
    payload.attributes?.userId ??
    payload.attributes?.custom_data?.user_id ??
    payload.attributes?.custom_data?.userId ??
    payload.meta?.custom_data?.user_id ??
    payload.meta?.custom_data?.userId ??
    null;
  return typeof userId === 'string' && userId.trim() ? userId : null;
}

function getLemonAttributes(payload: LemonWebhookPayload) {
  return payload.data?.attributes ?? payload.attributes;
}

function isOrderPayload(payload: LemonWebhookPayload): boolean {
  return (payload.data as { type?: string } | undefined)?.type === 'orders';
}

function isSubscriptionInvoicePayload(payload: LemonWebhookPayload): boolean {
  return (payload.data as { type?: string } | undefined)?.type === 'subscription-invoices';
}

export function toSubscribedFromLemonStatus(status?: string): boolean {
  const normalized = (status ?? '').toLowerCase();
  return normalized === 'active' || normalized === 'trialing' || normalized === 'on_trial';
}

function normalizeLemonEventName(eventName?: string) {
  const normalized = (eventName ?? '').trim();
  switch (normalized) {
    case 'order.created':
      return 'order_created';
    case 'subscription.created':
      return 'subscription_created';
    case 'subscription.updated':
      return 'subscription_updated';
    case 'subscription.deleted':
      return 'subscription_deleted';
    case 'subscription.cancelled':
      return 'subscription_cancelled';
    case 'subscription.resumed':
      return 'subscription_resumed';
    case 'subscription.expired':
      return 'subscription_expired';
    case 'subscription.paused':
      return 'subscription_paused';
    case 'subscription.unpaused':
      return 'subscription_unpaused';
    case 'subscription.payment_failed':
      return 'subscription_payment_failed';
    case 'subscription.payment_recovered':
      return 'subscription_payment_recovered';
    case 'subscription.payment_success':
      return 'subscription_payment_success';
    default:
      return normalized.replace(/\./g, '_');
  }
}

function normalizeLemonStatus(status?: string) {
  const normalized = (status ?? '').toLowerCase();
  switch (normalized) {
    case 'on_trial':
      return 'trialing';
    case 'active':
      return 'active';
    case 'paused':
      return 'paused';
    case 'past_due':
      return 'past_due';
    case 'unpaid':
      return 'unpaid';
    case 'cancelled':
      return 'cancelled';
    case 'expired':
      return 'expired';
    case 'canceled':
      return 'canceled';
    default:
      return 'expired';
  }
}

function derivePlanCode(payload: LemonWebhookPayload): AppSubscriptionPlan {
  const attributes = getLemonAttributes(payload);
  const normalizedStatus = normalizeLemonStatus(attributes?.status);
  if (normalizedStatus === 'trialing') {
    return 'trial';
  }

  const planText = `${attributes?.product_name ?? ''} ${attributes?.variant_name ?? ''}`.toLowerCase();
  if (planText.includes('year')) return 'yearly_pro';
  if (planText.includes('quarter')) return 'quarterly_pro';
  if (planText.includes('month')) return 'monthly_pro';
  return toSubscribedFromLemonStatus(attributes?.status) ? 'monthly_pro' : 'free';
}

function buildSubscriptionUpsert(
  payload: LemonWebhookPayload,
  userId: string,
  eventName: string
): TablesInsert<'subscriptions'> {
  const attributes = getLemonAttributes(payload);
  const normalizedStatus = normalizeLemonStatus(attributes?.status);
  const nowIso = new Date().toISOString();
  const subscriptionId = String(payload.data?.id ?? (payload as { id?: string }).id ?? `${userId}:${eventName}`);
  const planCode = derivePlanCode(payload);
  const lemonPriceId =
    attributes?.first_subscription_item?.price_id != null
      ? String(attributes.first_subscription_item.price_id)
      : null;
  const lemonSubscriptionItemId =
    attributes?.first_subscription_item?.id != null
      ? String(attributes.first_subscription_item.id)
      : null;

  return {
    id: subscriptionId,
    user_id: userId,
    provider: 'lemon_squeezy',
    provider_customer_id:
      attributes?.customer_id != null ? String(attributes.customer_id) : null,
    provider_order_id: attributes?.order_id != null ? String(attributes.order_id) : null,
    provider_product_id:
      attributes?.product_id != null ? String(attributes.product_id) : null,
    provider_variant_id:
      attributes?.variant_id != null ? String(attributes.variant_id) : null,
    provider_product_name: attributes?.product_name ?? null,
    provider_variant_name: attributes?.variant_name ?? null,
    status: normalizedStatus,
    metadata: {
      source: 'lemon_squeezy',
      event_name: eventName,
      lemon_price_id: lemonPriceId,
      lemon_subscription_item_id: lemonSubscriptionItemId
    } as Json,
    plan_code: planCode,
    // `public.subscriptions.price_id` still references Stripe `prices.id`.
    // Lemon price ids are provider-specific and would violate that FK.
    price_id: null,
    quantity: attributes?.first_subscription_item?.quantity ?? null,
    cancel_at_period_end: Boolean(attributes?.cancelled),
    created: attributes?.created_at ?? nowIso,
    current_period_start: attributes?.updated_at ?? attributes?.created_at ?? nowIso,
    current_period_end:
      attributes?.renews_at ?? attributes?.trial_ends_at ?? attributes?.ends_at ?? nowIso,
    ended_at: attributes?.ends_at ?? null,
    cancel_at: attributes?.ends_at ?? null,
    canceled_at:
      normalizedStatus === 'cancelled' || normalizedStatus === 'canceled'
        ? attributes?.updated_at ?? nowIso
        : null,
    trial_start:
      normalizedStatus === 'trialing'
        ? attributes?.created_at ?? nowIso
        : null,
    trial_end: attributes?.trial_ends_at ?? null,
    renews_at: attributes?.renews_at ?? null,
    test_mode: Boolean(attributes?.test_mode),
    raw_payload: payload as Json
  };
}

export function decideSubscriptionUpdate(
  payload: LemonWebhookPayload
): LemonSubscriptionDecision {
  const eventName = normalizeLemonEventName(payload.meta?.event_name);
  if (eventName === 'order_created' && isOrderPayload(payload)) {
    return { kind: 'ignored', eventName };
  }
  if (
    (eventName === 'subscription_payment_success' ||
      eventName === 'subscription_payment_failed' ||
      eventName === 'subscription_payment_recovered') &&
    isSubscriptionInvoicePayload(payload)
  ) {
    // Invoice webhooks confirm billing outcomes, but they are not subscription objects.
    // Entitlements should be driven by `subscription_*` events that carry subscription state.
    return { kind: 'ignored', eventName };
  }
  const userId = resolveUserId(payload);
  const isSubscribed = toSubscribedFromLemonStatus(getLemonAttributes(payload)?.status);
  const subscriptionPlan = derivePlanCode(payload);

  if (
    eventName === 'subscription_created' ||
    eventName === 'subscription_updated' ||
    eventName === 'subscription_deleted' ||
    eventName === 'subscription_cancelled' ||
    eventName === 'subscription_resumed' ||
    eventName === 'subscription_expired' ||
    eventName === 'subscription_paused' ||
    eventName === 'subscription_unpaused' ||
    eventName === 'subscription_payment_success' ||
    eventName === 'subscription_payment_failed' ||
    eventName === 'subscription_payment_recovered'
  ) {
    if (!userId) throw new Error('Missing user id in webhook payload.');
    return {
      kind: 'upsert',
      userId,
      isSubscribed,
      eventName,
      subscription: buildSubscriptionUpsert(payload, userId, eventName),
      subscriptionPlan
    };
  }

  return { kind: 'ignored', eventName };
}
