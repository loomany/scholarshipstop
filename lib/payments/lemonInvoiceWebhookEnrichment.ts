import 'server-only';

import {
  isSubscriptionInvoicePayload,
  normalizeLemonEventName,
  type LemonWebhookPayload
} from '@/lib/payments/lemonSubscriptionState';

const LEMON_API_BASE = 'https://api.lemonsqueezy.com/v1';

/**
 * Invoice webhooks omit subscription variant and lifecycle fields. Fetch the
 * subscription resource while preserving the signed event type, amount and currency.
 * Failures throw so Lemon retries instead of receiving a false acknowledgement.
 */
export async function enrichInvoicePaymentSuccessWithSubscriptionFetch(
  payload: LemonWebhookPayload,
  fetchImpl: typeof fetch = fetch
): Promise<LemonWebhookPayload | null> {
  const eventName = normalizeLemonEventName(payload.meta?.event_name);
  if (
    eventName !== 'subscription_payment_success' &&
    eventName !== 'subscription_payment_failed' &&
    eventName !== 'subscription_payment_recovered' &&
    eventName !== 'subscription_payment_refunded'
  ) {
    return null;
  }
  if (!isSubscriptionInvoicePayload(payload)) return null;

  const invoiceAttributes = payload.data?.attributes ?? payload.attributes;
  const subscriptionId = invoiceAttributes?.subscription_id;
  if (subscriptionId == null || String(subscriptionId).trim() === '') {
    throw new Error('Subscription invoice webhook has no subscription id.');
  }

  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'LEMONSQUEEZY_API_KEY is required to enrich subscription invoice webhooks.'
    );
  }

  let response: Response;
  try {
    response = await fetchImpl(
      `${LEMON_API_BASE}/subscriptions/${encodeURIComponent(String(subscriptionId))}`,
      {
        headers: {
          Accept: 'application/vnd.api+json',
          Authorization: `Bearer ${apiKey}`
        },
        cache: 'no-store'
      }
    );
  } catch (error) {
    throw new Error(
      `Subscription enrichment fetch failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Subscription enrichment returned HTTP ${response.status}.`
    );
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new Error('Subscription enrichment returned invalid JSON.');
  }

  const document = json as { data?: LemonWebhookPayload['data'] };
  if (!document.data || typeof document.data !== 'object') {
    throw new Error('Subscription enrichment response has no data resource.');
  }

  return {
    meta: payload.meta,
    data: {
      ...document.data,
      attributes: {
        ...document.data.attributes,
        total: invoiceAttributes?.total,
        currency: invoiceAttributes?.currency,
        subscription_id: invoiceAttributes?.subscription_id
      }
    }
  };
}
