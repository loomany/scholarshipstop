import 'server-only';

import {
  isSubscriptionInvoicePayload,
  normalizeLemonEventName,
  type LemonWebhookPayload
} from '@/lib/payments/lemonSubscriptionState';

const LEMON_API_BASE = 'https://api.lemonsqueezy.com/v1';

/**
 * Lemon often emits `subscription_payment_success` / `subscription_payment_recovered` with a
 * **subscription-invoices** body only. Our DB sync expects a **subscriptions** resource
 * (variant, status, renews_at, etc.). Those invoice webhooks were previously ignored, so plan
 * upgrades could leave the app stale if `subscription_updated` / `subscription_plan_changed`
 * did not arrive or failed.
 *
 * When `LEMONSQUEEZY_API_KEY` is set, we GET the subscription document and rewrite the payload
 * to a synthetic `subscription_updated` event so `decideSubscriptionUpdate` + upsert run as usual.
 * `meta.custom_data` from the invoice (e.g. `user_id`) is preserved.
 */
export async function enrichInvoicePaymentSuccessWithSubscriptionFetch(
  payload: LemonWebhookPayload
): Promise<LemonWebhookPayload | null> {
  const eventName = normalizeLemonEventName(payload.meta?.event_name);
  if (eventName !== 'subscription_payment_success' && eventName !== 'subscription_payment_recovered') {
    return null;
  }
  if (!isSubscriptionInvoicePayload(payload)) return null;

  const subscriptionId = payload.data?.attributes?.subscription_id;
  if (subscriptionId == null || String(subscriptionId).trim() === '') return null;

  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim();
  if (!apiKey) {
    console.warn(
      '[lemon:webhook] LEMONSQUEEZY_API_KEY missing; cannot enrich invoice webhook — ensure subscription_updated is delivered or set API key'
    );
    return null;
  }

  let res: Response;
  try {
    res = await fetch(
      `${LEMON_API_BASE}/subscriptions/${encodeURIComponent(String(subscriptionId))}`,
      {
        headers: {
          Accept: 'application/vnd.api+json',
          Authorization: `Bearer ${apiKey}`
        }
      }
    );
  } catch (e) {
    console.warn('[lemon:webhook] subscription fetch failed', {
      subscriptionId,
      message: e instanceof Error ? e.message : String(e)
    });
    return null;
  }

  if (!res.ok) {
    const snippet = (await res.text()).slice(0, 500);
    console.warn('[lemon:webhook] subscription fetch not ok', {
      subscriptionId,
      status: res.status,
      body: snippet
    });
    return null;
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return null;
  }

  const data = json as { data?: LemonWebhookPayload['data'] };
  if (!data.data || typeof data.data !== 'object') return null;

  return {
    meta: {
      ...payload.meta,
      event_name: 'subscription_updated'
    },
    data: data.data
  };
}
