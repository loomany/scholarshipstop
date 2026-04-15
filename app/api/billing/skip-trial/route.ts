import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { pickCanonicalSubscription } from '@/lib/payments/subscriptionAccess';
import type { Tables } from '@/types_db';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LEMON_API_BASE = 'https://api.lemonsqueezy.com/v1';

const TRIAL_SKIP_STATUSES = new Set<Tables<'subscriptions'>['status']>([
  'trialing',
  'on_trial'
]);

function parseIsoDate(value: string | null): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isEligibleLemonTrialSubscription(row: Tables<'subscriptions'>): boolean {
  if (row.provider !== 'lemon_squeezy') return false;
  const status = row.status;
  if (!status || !TRIAL_SKIP_STATUSES.has(status)) return false;
  const trialEnd = parseIsoDate(row.trial_end);
  if (trialEnd !== null && trialEnd.getTime() <= Date.now()) {
    return false;
  }
  return true;
}

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
    console.error('[billing/skip-trial] subscription query failed', queryError.message);
    return NextResponse.json({ error: 'Could not load subscription.' }, { status: 500 });
  }

  const canonical = pickCanonicalSubscription(subscriptionRows ?? []);

  if (!canonical || !isEligibleLemonTrialSubscription(canonical as Tables<'subscriptions'>)) {
    return NextResponse.json(
      {
        error:
          'No Lemon Squeezy trial subscription found, or the trial is no longer active.'
      },
      { status: 400 }
    );
  }

  const subscription = canonical as Tables<'subscriptions'>;
  const subscriptionId = subscription.id.trim();
  if (!subscriptionId) {
    return NextResponse.json({ error: 'Invalid subscription id.' }, { status: 400 });
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
            billing_anchor: 0,
            /** Charge skipped trial immediately (same semantics as dashboard “invoice immediately”). */
            invoice_immediately: true,
            /** Avoid 422 from stale trial end validation when invoicing immediately. */
            trial_ends_at: null
          }
        }
      })
    });
  } catch (e) {
    console.error('[billing/skip-trial] Lemon API request failed', e);
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
    console.error('[billing/skip-trial] Lemon API error', {
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
        error: 'Payment provider rejected the request.',
        detail: lemonJson ?? rawText.slice(0, 500)
      },
      { status }
    );
  }

  revalidatePath('/account');
  revalidatePath('/subscription');

  return NextResponse.json({
    ok: true,
    subscriptionId: subscriptionId,
    lemon: lemonJson
  });
}
