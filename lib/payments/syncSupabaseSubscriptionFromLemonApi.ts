import 'server-only';

import { createClient } from '@supabase/supabase-js';

import {
  decideSubscriptionUpdate,
  lemonRestDocumentToWebhookPayload
} from '@/lib/payments/lemonSubscriptionState';
import type { Database } from '@/types_db';

const LEMON_API_BASE = 'https://api.lemonsqueezy.com/v1';

/**
 * After a successful Lemon REST change (e.g. PATCH variant), webhooks may arrive late or be missed.
 * GET the subscription and upsert `subscriptions` + `profiles` the same way as `POST /api/webhooks`.
 */
export async function syncSubscriptionFromLemonAfterRestChange(options: {
  apiKey: string;
  subscriptionId: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.warn(
      '[lemon sync] SUPABASE_SERVICE_ROLE_KEY missing — skipping DB sync after API plan change (webhooks will catch up)'
    );
    return { ok: false, reason: 'missing_service_role' };
  }

  const supabaseAdmin = createClient<Database>(url, key);

  let res: Response;
  try {
    res = await fetch(
      `${LEMON_API_BASE}/subscriptions/${encodeURIComponent(options.subscriptionId)}`,
      {
        headers: {
          Accept: 'application/vnd.api+json',
          Authorization: `Bearer ${options.apiKey}`
        }
      }
    );
  } catch (e) {
    console.error('[lemon sync] GET /subscriptions failed', e);
    return { ok: false, reason: 'fetch_failed' };
  }

  if (!res.ok) {
    const snippet = (await res.text()).slice(0, 500);
    console.error('[lemon sync] GET /subscriptions not ok', {
      status: res.status,
      snippet
    });
    return { ok: false, reason: `http_${res.status}` };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, reason: 'json_parse' };
  }

  const payload = lemonRestDocumentToWebhookPayload(json, options.userId);
  if (!payload) {
    return { ok: false, reason: 'payload_wrap' };
  }

  const decision = decideSubscriptionUpdate(payload);
  if (decision.kind !== 'upsert') {
    return { ok: false, reason: 'not_upsert' };
  }

  const { error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .upsert([decision.subscription], { onConflict: 'id' });

  if (subErr) {
    console.error('[lemon sync] subscriptions upsert failed', subErr);
    return { ok: false, reason: 'subscription_upsert' };
  }

  const { error: profErr } = await supabaseAdmin.from('profiles').upsert(
    [
      {
        id: decision.userId,
        is_subscribed: decision.isSubscribed,
        subscription_plan: decision.subscriptionPlan
      }
    ],
    { onConflict: 'id' }
  );

  if (profErr) {
    console.error('[lemon sync] profiles upsert failed', profErr);
    return { ok: false, reason: 'profile_upsert' };
  }

  return { ok: true };
}
