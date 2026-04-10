import type { Json, TablesInsert } from '@/types_db';
import type { AppSubscriptionPlan } from '@/lib/payments/subscriptionEntitlements';
import type { Database } from '@/types_db';
import {
  createSubscriptionEventFingerprint,
  hasSubscriptionAccess,
  normalizeSubscriptionStatus
} from '@/lib/payments/subscriptionAccess';

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
        update_payment_method?: string | null;
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
      update_payment_method?: string | null;
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

export function extractLemonUpdatePaymentMethodUrl(
  payload: LemonWebhookPayload
): string | null {
  const attrs = payload.data?.attributes ?? payload.attributes;
  const url = attrs?.urls?.update_payment_method?.trim() || '';
  return url || null;
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

type LemonAttributes =
  | NonNullable<LemonWebhookPayload['data']>['attributes']
  | LemonWebhookPayload['attributes']
  | undefined;

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
  return hasSubscriptionAccess({ status });
}

function isIgnoredOrderEvent(eventName: string, payload: LemonWebhookPayload) {
  return eventName === 'order_created' && isOrderPayload(payload);
}

function toSubscribedFromLemonAttributes(
  attributes: LemonAttributes,
  normalizedStatus?: Database['public']['Enums']['subscription_status']
) {
  const status = normalizedStatus ?? normalizeLemonStatus(attributes?.status);
  const accessEnd =
    status === 'cancelled' || status === 'canceled'
      ? attributes?.renews_at ?? attributes?.ends_at
      : attributes?.ends_at;

  return hasSubscriptionAccess({
    status,
    endedAt: accessEnd,
    cancelAt: accessEnd,
    currentPeriodEnd: attributes?.renews_at ?? attributes?.ends_at,
    renewsAt: attributes?.renews_at
  });
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
    case 'subscription.plan_changed':
      return 'subscription_plan_changed';
    case 'subscription.payment_failed':
      return 'subscription_payment_failed';
    case 'subscription.payment_recovered':
      return 'subscription_payment_recovered';
    case 'subscription.payment_success':
      return 'subscription_payment_success';
    case 'subscription.payment_refunded':
      return 'subscription_payment_refunded';
    case 'order.refunded':
      return 'order_refunded';
    default:
      return normalized.replace(/\./g, '_');
  }
}

function normalizeLemonStatus(status?: string) {
  const normalized = normalizeSubscriptionStatus(status);
  return (normalized === 'inactive'
    ? 'expired'
    : normalized) as Database['public']['Enums']['subscription_status'];
}

function eventOverrideStatus(
  eventName: string,
  payloadStatus?: string
): Database['public']['Enums']['subscription_status'] | null {
  switch (eventName) {
    case 'subscription_cancelled':
      return 'cancelled';
    case 'subscription_resumed':
    case 'subscription_unpaused':
    case 'subscription_plan_changed':
    case 'subscription_payment_success':
    case 'subscription_payment_recovered':
      return 'active';
    case 'subscription_expired':
    case 'subscription_deleted':
    case 'subscription_payment_refunded':
    case 'order_refunded':
      return 'expired';
    case 'subscription_paused':
      return 'paused';
    case 'subscription_payment_failed':
      return 'past_due';
    case 'subscription_created': {
      const payloadNormalized = normalizeLemonStatus(payloadStatus);
      if (payloadNormalized === 'trialing' || payloadNormalized === 'on_trial') {
        return 'trialing';
      }
      return 'active';
    }
    default:
      return null;
  }
}

function resolveEffectiveStatus(
  eventName: string,
  attributes: LemonAttributes
): Database['public']['Enums']['subscription_status'] {
  return eventOverrideStatus(eventName, attributes?.status) ?? normalizeLemonStatus(attributes?.status);
}

function derivePlanCode(
  attributes: LemonAttributes,
  normalizedStatus: Database['public']['Enums']['subscription_status']
): AppSubscriptionPlan {
  if (normalizedStatus === 'trialing') {
    return 'trial';
  }

  if (normalizedStatus === 'expired') {
    return 'free';
  }

  const planText = `${attributes?.product_name ?? ''} ${attributes?.variant_name ?? ''}`.toLowerCase();
  if (planText.includes('year')) return 'yearly_pro';
  if (planText.includes('quarter')) return 'quarterly_pro';
  if (planText.includes('month')) return 'monthly_pro';
  if (
    normalizedStatus === 'active' ||
    normalizedStatus === 'cancelled' ||
    normalizedStatus === 'canceled' ||
    normalizedStatus === 'past_due' ||
    normalizedStatus === 'unpaid' ||
    normalizedStatus === 'paused'
  ) {
    return 'monthly_pro';
  }

  return toSubscribedFromLemonStatus(normalizedStatus) ? 'monthly_pro' : 'free';
}

function buildSubscriptionUpsert(
  payload: LemonWebhookPayload,
  userId: string,
  eventName: string
): TablesInsert<'subscriptions'> {
  const attributes = getLemonAttributes(payload);
  const normalizedStatus = resolveEffectiveStatus(eventName, attributes);
  const nowIso = new Date().toISOString();
  const subscriptionId = String(payload.data?.id ?? (payload as { id?: string }).id ?? `${userId}:${eventName}`);
  const planCode = derivePlanCode(attributes, normalizedStatus);
  const lemonPriceId =
    attributes?.first_subscription_item?.price_id != null
      ? String(attributes.first_subscription_item.price_id)
      : null;
  const lemonSubscriptionItemId =
    attributes?.first_subscription_item?.id != null
      ? String(attributes.first_subscription_item.id)
      : null;
  const eventFingerprint = createSubscriptionEventFingerprint({
    eventName,
    subscriptionId,
    status: normalizedStatus,
    updatedAt: attributes?.updated_at,
    renewsAt: attributes?.renews_at,
    endsAt: attributes?.ends_at,
    trialEndsAt: attributes?.trial_ends_at,
    cancelled: attributes?.cancelled,
    orderId: attributes?.order_id
  });
  const currentPeriodEnd =
    attributes?.renews_at ?? attributes?.trial_ends_at ?? attributes?.ends_at ?? nowIso;
  const cancelledAccessEnd = attributes?.renews_at ?? attributes?.ends_at ?? currentPeriodEnd;
  const endedAt =
    normalizedStatus === 'cancelled' || normalizedStatus === 'canceled'
      ? cancelledAccessEnd
      : normalizedStatus === 'expired'
        ? attributes?.ends_at ?? attributes?.renews_at ?? nowIso
        : null;
  const cancelAt =
    normalizedStatus === 'cancelled' || normalizedStatus === 'canceled'
      ? cancelledAccessEnd
      : null;
  const canceledAt =
    normalizedStatus === 'cancelled' || normalizedStatus === 'canceled'
      ? attributes?.updated_at ?? nowIso
      : null;
  const trialStart =
    normalizedStatus === 'trialing'
      ? attributes?.created_at ?? nowIso
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
      lemon_event_fingerprint: eventFingerprint,
      lemon_price_id: lemonPriceId,
      lemon_subscription_item_id: lemonSubscriptionItemId
    } as Json,
    plan_code: planCode,
    // `public.subscriptions.price_id` still references Stripe `prices.id`.
    // Lemon price ids are provider-specific and would violate that FK.
    price_id: null,
    quantity: attributes?.first_subscription_item?.quantity ?? null,
    cancel_at_period_end:
      normalizedStatus === 'cancelled' || normalizedStatus === 'canceled'
        ? true
        : Boolean(attributes?.cancelled),
    created: attributes?.created_at ?? nowIso,
    current_period_start: attributes?.updated_at ?? attributes?.created_at ?? nowIso,
    current_period_end: currentPeriodEnd,
    ended_at: endedAt,
    cancel_at: cancelAt,
    canceled_at: canceledAt,
    trial_start: trialStart,
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
  if (isIgnoredOrderEvent(eventName, payload)) {
    return { kind: 'ignored', eventName };
  }
  if (
    (eventName === 'subscription_payment_success' ||
      eventName === 'subscription_payment_failed' ||
      eventName === 'subscription_payment_recovered' ||
      eventName === 'subscription_payment_refunded') &&
    isSubscriptionInvoicePayload(payload)
  ) {
    // Invoice webhooks confirm billing outcomes, but they are not subscription objects.
    // Entitlements should be driven by `subscription_*` events that carry subscription state.
    return { kind: 'ignored', eventName };
  }
  const userId = resolveUserId(payload);
  const attributes = getLemonAttributes(payload);
  const normalizedStatus = resolveEffectiveStatus(eventName, attributes);
  const isSubscribed = toSubscribedFromLemonAttributes(attributes, normalizedStatus);
  const subscriptionPlan = derivePlanCode(attributes, normalizedStatus);

  if (
    eventName === 'subscription_created' ||
    eventName === 'subscription_updated' ||
    eventName === 'subscription_deleted' ||
    eventName === 'subscription_cancelled' ||
    eventName === 'subscription_resumed' ||
    eventName === 'subscription_expired' ||
    eventName === 'subscription_paused' ||
    eventName === 'subscription_unpaused' ||
    eventName === 'subscription_plan_changed' ||
    eventName === 'subscription_payment_success' ||
    eventName === 'subscription_payment_failed' ||
    eventName === 'subscription_payment_recovered' ||
    eventName === 'subscription_payment_refunded' ||
    eventName === 'order_refunded'
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
