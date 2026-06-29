import type { BillingPlanKey } from '@/lib/payments/lemonVariantIds';
import type { LemonSubscriptionWebhookConfig } from '@/lib/payments/lemonRuntimeConfig';
import {
  normalizeLemonEventName,
  resolveUserId,
  type LemonWebhookPayload
} from '@/lib/payments/lemonSubscriptionState';
import type { ProviderWebhookEvent } from '@/lib/payments/providerWebhookLedger';

const COVERED_EVENTS = new Set([
  'order_created',
  'order_refunded',
  'subscription_created',
  'subscription_updated',
  'subscription_deleted',
  'subscription_cancelled',
  'subscription_resumed',
  'subscription_expired',
  'subscription_paused',
  'subscription_unpaused',
  'subscription_plan_changed',
  'subscription_payment_success',
  'subscription_payment_failed',
  'subscription_payment_recovered',
  'subscription_payment_refunded'
]);

const AMOUNT_EVENTS = new Set([
  'order_created',
  'order_refunded',
  'subscription_payment_success',
  'subscription_payment_failed',
  'subscription_payment_recovered',
  'subscription_payment_refunded'
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Attributes = NonNullable<LemonWebhookPayload['data']>['attributes'];

export type LemonSubscriptionEventValidationResult =
  | {
      ok: true;
      event: ProviderWebhookEvent;
      plan: BillingPlanKey;
      userId: string;
    }
  | {
      ok: false;
      covered: boolean;
      reason: string;
    };

function attributes(payload: LemonWebhookPayload): Attributes {
  return payload.data?.attributes ?? payload.attributes;
}

function stringId(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function resourceType(payload: LemonWebhookPayload): string {
  return (
    (payload.data as { type?: string } | undefined)?.type?.trim() || 'unknown'
  );
}

function resolveVariantId(
  effective: Attributes,
  original: Attributes
): string | null {
  return stringId(
    effective?.variant_id ??
      original?.variant_id ??
      original?.first_order_item?.variant_id
  );
}

function resolvePlan(
  variantId: string,
  config: LemonSubscriptionWebhookConfig
): BillingPlanKey | null {
  const entry = Object.entries(config.variantIds).find(
    ([, configuredId]) => configuredId === variantId
  );
  return (entry?.[0] as BillingPlanKey | undefined) ?? null;
}

export function isCoveredLemonSubscriptionEvent(eventName: string): boolean {
  return COVERED_EVENTS.has(normalizeLemonEventName(eventName));
}

export function validateLemonSubscriptionEvent(options: {
  payload: LemonWebhookPayload;
  originalPayload?: LemonWebhookPayload;
  payloadHash: string;
  providerEventId?: string | null;
  config: LemonSubscriptionWebhookConfig;
}): LemonSubscriptionEventValidationResult {
  const original = options.originalPayload ?? options.payload;
  const eventType = normalizeLemonEventName(original.meta?.event_name);
  if (!COVERED_EVENTS.has(eventType)) {
    return { ok: false, covered: false, reason: 'unsupported_event' };
  }

  const effectiveAttributes = attributes(options.payload);
  const originalAttributes = attributes(original);
  const storeId = stringId(
    effectiveAttributes?.store_id ?? originalAttributes?.store_id
  );
  if (!storeId) return { ok: false, covered: true, reason: 'missing_store' };
  if (storeId !== options.config.storeId) {
    return { ok: false, covered: true, reason: 'store_mismatch' };
  }

  const testMode =
    effectiveAttributes?.test_mode ?? originalAttributes?.test_mode;
  if (typeof testMode !== 'boolean') {
    return { ok: false, covered: true, reason: 'missing_test_mode' };
  }
  if (testMode !== (options.config.mode === 'test')) {
    return { ok: false, covered: true, reason: 'mode_mismatch' };
  }

  const variantId = resolveVariantId(effectiveAttributes, originalAttributes);
  if (!variantId) {
    return { ok: false, covered: true, reason: 'missing_variant' };
  }
  const plan = resolvePlan(variantId, options.config);
  if (!plan) {
    return { ok: false, covered: true, reason: 'variant_mismatch' };
  }

  const userId = resolveUserId(options.payload) ?? resolveUserId(original);
  if (!userId) {
    return { ok: false, covered: true, reason: 'missing_user_mapping' };
  }
  if (!UUID_PATTERN.test(userId)) {
    return { ok: false, covered: true, reason: 'invalid_user_mapping' };
  }

  if (AMOUNT_EVENTS.has(eventType)) {
    const total = originalAttributes?.total ?? effectiveAttributes?.total;
    if (
      typeof total !== 'number' ||
      !Number.isSafeInteger(total) ||
      total < 0
    ) {
      return { ok: false, covered: true, reason: 'missing_amount' };
    }
    if (total !== options.config.expectedTotals[plan]) {
      return { ok: false, covered: true, reason: 'amount_mismatch' };
    }
    const currency = (
      originalAttributes?.currency ??
      effectiveAttributes?.currency ??
      ''
    )
      .trim()
      .toUpperCase();
    if (!currency) {
      return { ok: false, covered: true, reason: 'missing_currency' };
    }
    if (currency !== options.config.currency) {
      return { ok: false, covered: true, reason: 'currency_mismatch' };
    }
  }

  const originalType = resourceType(original);
  const originalResourceId = stringId(original.data?.id);
  if (!originalResourceId) {
    return { ok: false, covered: true, reason: 'missing_resource_id' };
  }

  const providerOrderId =
    originalType === 'orders'
      ? originalResourceId
      : stringId(originalAttributes?.order_id ?? effectiveAttributes?.order_id);
  const providerSubscriptionId = stringId(
    originalAttributes?.subscription_id ??
      (resourceType(options.payload) === 'subscriptions'
        ? options.payload.data?.id
        : null) ??
      (eventType.startsWith('subscription_') &&
      originalType !== 'subscription-invoices'
        ? original.data?.id
        : null)
  );

  if (eventType.startsWith('order_') && !providerOrderId) {
    return { ok: false, covered: true, reason: 'missing_order_id' };
  }
  if (eventType.startsWith('subscription_') && !providerSubscriptionId) {
    return { ok: false, covered: true, reason: 'missing_subscription_id' };
  }

  const explicitEventId = options.providerEventId?.trim();
  const eventId = explicitEventId
    ? `provider:${explicitEventId}`
    : `synthetic:${eventType}:${originalType}:${originalResourceId}:${options.payloadHash}`;

  return {
    ok: true,
    plan,
    userId,
    event: {
      provider: 'lemon_squeezy',
      eventId,
      eventType,
      payloadHash: options.payloadHash,
      providerOrderId,
      providerSubscriptionId
    }
  };
}
