import 'server-only';

import type { Tables } from '@/types_db';
import {
  extractLemonCustomerPortalUrl,
  extractLemonUpdatePaymentMethodUrl,
  lemonRestDocumentToWebhookPayload
} from '@/lib/payments/lemonSubscriptionState';

const LEMON_API = 'https://api.lemonsqueezy.com/v1';

/**
 * When `raw_payload` has no `urls` (e.g. after invoice-only webhooks), “Update billing” would
 * only open `/subscription`. Fetch the live subscription from Lemon REST — includes portal URLs.
 */
export async function enrichBillingFixUrlFromLemonApi(
  subscription: Tables<'subscriptions'>,
  userId: string,
  fallback: string
): Promise<string> {
  if (subscription.provider !== 'lemon_squeezy') return fallback;
  const sid = subscription.id?.trim();
  if (!sid) return fallback;
  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim();
  if (!apiKey) return fallback;

  let res: Response;
  try {
    res = await fetch(`${LEMON_API}/subscriptions/${encodeURIComponent(sid)}`, {
      headers: {
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`
      },
      cache: 'no-store'
    });
  } catch {
    return fallback;
  }

  if (!res.ok) return fallback;

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return fallback;
  }

  const payload = lemonRestDocumentToWebhookPayload(json, userId);
  if (!payload) return fallback;

  return (
    extractLemonUpdatePaymentMethodUrl(payload) ??
    extractLemonCustomerPortalUrl(payload) ??
    fallback
  );
}
