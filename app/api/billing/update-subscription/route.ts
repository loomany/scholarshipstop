import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import type { BillingPlanKey } from '@/lib/payments/lemonVariantIds';
import {
  resolveLemonCheckoutConfig,
  SECURE_CHECKOUT_UNAVAILABLE_MESSAGE,
  validateLemonVariantMode
} from '@/lib/payments/lemonRuntimeConfig';
import { pickCanonicalSubscription } from '@/lib/payments/subscriptionAccess';
import { syncSubscriptionFromLemonAfterRestChange } from '@/lib/payments/syncSupabaseSubscriptionFromLemonApi';
import type { Tables } from '@/types_db';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LEMON_API_BASE = 'https://api.lemonsqueezy.com/v1';

const PLAN_KEYS = new Set<BillingPlanKey>(['monthly', 'quarterly', 'yearly']);

/**
 * Change an existing Lemon subscription to another variant with **immediate invoice**
 * (proration + charge now), matching Lemon dashboard “Apply changes with proration and invoice immediately”.
 *
 * After a successful PATCH, we **GET** the subscription from Lemon and upsert Supabase (same as
 * webhooks) so the UI updates immediately. If that sync fails, webhooks still eventually reconcile.
 * If the card fails, Lemon returns an error and the DB stays unchanged until a successful payment webhook.
 */
export async function POST(req: Request) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Billing is not configured on the server.' },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const planRaw = (body as { plan?: string })?.plan;
  if (!planRaw || !PLAN_KEYS.has(planRaw as BillingPlanKey)) {
    return NextResponse.json(
      { error: 'Body must include plan: monthly | quarterly | yearly.' },
      { status: 400 }
    );
  }
  const planKey = planRaw as BillingPlanKey;

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
    console.error(
      '[billing/update-subscription] subscription query failed',
      queryError.message
    );
    return NextResponse.json(
      { error: 'Could not load subscription.' },
      { status: 500 }
    );
  }

  const canonical = pickCanonicalSubscription(
    subscriptionRows ?? []
  ) as Tables<'subscriptions'> | null;

  if (!canonical || canonical.provider !== 'lemon_squeezy') {
    return NextResponse.json(
      {
        error:
          'No Lemon Squeezy subscription found. Use checkout to subscribe first.'
      },
      { status: 400 }
    );
  }

  const subscriptionId = canonical.id.trim();
  if (!subscriptionId) {
    return NextResponse.json(
      { error: 'Invalid subscription id.' },
      { status: 400 }
    );
  }

  const lemonTestMode = canonical.test_mode === true;
  const resolved = resolveLemonCheckoutConfig(planKey);
  if (!resolved.ok || (resolved.config.mode === 'test') !== lemonTestMode) {
    return NextResponse.json(
      { error: SECURE_CHECKOUT_UNAVAILABLE_MESSAGE },
      { status: 503 }
    );
  }
  const variantIdStr = resolved.config.variantId;

  const variantNum = Number.parseInt(variantIdStr, 10);
  if (!Number.isFinite(variantNum)) {
    return NextResponse.json(
      { error: 'Invalid variant id in environment.' },
      { status: 500 }
    );
  }

  console.info('[billing/update-subscription]', {
    plan: planKey,
    lemonTestMode,
    targetVariantId: variantNum
  });

  const currentVid = canonical.provider_variant_id?.trim() ?? '';
  if (currentVid === String(variantNum)) {
    return NextResponse.json(
      { error: 'You are already on this plan.' },
      { status: 400 }
    );
  }

  const url = `${LEMON_API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`;

  let variantCheck: Awaited<ReturnType<typeof validateLemonVariantMode>>;
  try {
    variantCheck = await validateLemonVariantMode(resolved.config);
  } catch (e) {
    console.error('[billing/update-subscription] variant prefetch failed', e);
    return NextResponse.json(
      { error: 'Could not verify variant with Lemon. Try again later.' },
      { status: 502 }
    );
  }

  if (!variantCheck.ok) {
    console.error(
      '[billing/update-subscription] variant rejected by mode/store guard',
      {
        variantId: variantNum,
        reason: variantCheck.reason
      }
    );
    return NextResponse.json(
      { error: SECURE_CHECKOUT_UNAVAILABLE_MESSAGE },
      { status: 400 }
    );
  }

  /**
   * With `invoice_immediately: true` we must not leave trialing state ambiguous: omitting
   * `trial_ends_at` can still make Lemon validate an existing trial end date and return 422
   * ("must be a date after …"). Explicit `null` ends the trial so the prorated invoice can run now.
   */
  const patchAttributes: Record<string, boolean | number | null> = {
    variant_id: variantNum,
    invoice_immediately: true,
    trial_ends_at: null
  };

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
          attributes: patchAttributes
        }
      })
    });
  } catch (e) {
    console.error('[billing/update-subscription] Lemon API request failed', e);
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
    console.error('[billing/update-subscription] Lemon API error', {
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
          'Payment provider rejected the plan change. Your subscription was not changed.',
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
    console.warn(
      '[billing/update-subscription] post-PATCH Supabase sync skipped or failed',
      {
        reason: syncResult.reason,
        subscriptionId
      }
    );
  }

  revalidatePath('/account');
  revalidatePath('/subscription');

  return NextResponse.json({
    ok: true,
    subscriptionId,
    plan: planKey,
    lemon: lemonJson,
    synced: syncResult.ok
  });
}
