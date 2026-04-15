import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import {
  normalizeSubscriptionStatus,
  pickCanonicalSubscription
} from '@/lib/payments/subscriptionAccess';
import { syncSubscriptionFromLemonAfterRestChange } from '@/lib/payments/syncSupabaseSubscriptionFromLemonApi';
import type { Tables } from '@/types_db';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LEMON_API_BASE = 'https://api.lemonsqueezy.com/v1';

/**
 * Cancels at end of current period (Lemon `cancelled: true`). Same as dashboard / portal.
 */
export async function POST() {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Billing is not configured on the server.' },
      { status: 500 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: subscriptionRows, error: queryError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created', { ascending: false })
    .limit(20);

  if (queryError) {
    console.error('[billing/cancel-subscription] subscription query failed', queryError.message);
    return NextResponse.json({ error: 'Could not load subscription.' }, { status: 500 });
  }

  const canonical = pickCanonicalSubscription(subscriptionRows ?? []) as Tables<'subscriptions'> | null;

  if (!canonical || canonical.provider !== 'lemon_squeezy') {
    return NextResponse.json(
      { error: 'No Lemon Squeezy subscription found.' },
      { status: 400 }
    );
  }

  const subscriptionId = canonical.id.trim();
  if (!subscriptionId) {
    return NextResponse.json({ error: 'Invalid subscription id.' }, { status: 400 });
  }

  const st = normalizeSubscriptionStatus(canonical.status);
  if (st === 'cancelled' || st === 'canceled') {
    return NextResponse.json(
      { error: 'Subscription is already cancelled.' },
      { status: 400 }
    );
  }

  const url = `${LEMON_API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`;

  let lemonResponse: Response;
  try {
    lemonResponse = await fetch(url, {
      method: 'PATCH',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        data: {
          type: 'subscriptions',
          id: subscriptionId,
          attributes: {
            cancelled: true
          }
        }
      })
    });
  } catch (e) {
    console.error('[billing/cancel-subscription] Lemon API request failed', e);
    return NextResponse.json(
      { error: 'Could not reach the payment provider. Try again later.' },
      { status: 502 }
    );
  }

  const rawText = await lemonResponse.text();
  let lemonJson: unknown = null;
  if (rawText) {
    try {
      lemonJson = JSON.parse(rawText) as unknown;
    } catch {
      lemonJson = null;
    }
  }

  if (!lemonResponse.ok) {
    console.error('[billing/cancel-subscription] Lemon API error', {
      status: lemonResponse.status,
      body: rawText.slice(0, 2000)
    });
    const upstream = lemonResponse.status;
    const status =
      upstream === 401 || upstream === 403
        ? 502
        : upstream >= 400 && upstream < 500
          ? 400
          : 502;
    return NextResponse.json(
      {
        error:
          'Could not cancel the subscription. If you pay with PayPal, open the billing portal from your account.',
        detail: lemonJson ?? rawText.slice(0, 500)
      },
      { status }
    );
  }

  const syncResult = await syncSubscriptionFromLemonAfterRestChange({
    apiKey,
    subscriptionId,
    userId: user.id
  });
  if (!syncResult.ok) {
    console.warn('[billing/cancel-subscription] post-PATCH Supabase sync skipped or failed', {
      reason: syncResult.reason,
      subscriptionId
    });
  }

  revalidatePath('/account');
  revalidatePath('/subscription');

  return NextResponse.json({
    ok: true,
    subscriptionId,
    lemon: lemonJson,
    synced: syncResult.ok
  });
}
