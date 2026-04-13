import { NextResponse } from 'next/server';

import { humanizeWithUndetectable } from '@/lib/essay/undetectableHumanize';
import { isUndetectableHumanizeModelId } from '@/lib/essay/undetectableHumanizeModels';
import {
  shouldApplyTrialFeatureQuotas,
  trialReleaseQuota,
  trialReserveQuota
} from '@/lib/payments/trialFeatureQuotas';
import type { SubscriptionWithPriceAndProduct } from '@/lib/payments/subscriptionEntitlements';
import { pickCanonicalSubscription } from '@/lib/payments/subscriptionAccess';
import { createClient } from '@/utils/supabase/server';
import { getUserSubscriptionStatus } from '@/utils/supabase/queries';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const MAX_INPUT_CHARS = 80_000;

/** Default cap: at most ~+20% length vs source (trimmed in `clampHumanizeOutputToMaxExpansion`). 0 = no cap. */
function maxOutputLengthRatioFromEnv(): number | undefined {
  const raw = process.env.UNDETECTABLE_MAX_OUTPUT_LENGTH_RATIO?.trim();
  if (raw === undefined || raw === '') return 1.2;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

export async function POST(request: Request) {
  let body: { text?: string; model?: string; full_draft?: boolean };
  try {
    body = (await request.json()) as {
      text?: string;
      model?: string;
      full_draft?: boolean;
    };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text : '';
  let model: string | undefined;
  if (body.model !== undefined && body.model !== null && body.model !== '') {
    const raw = String(body.model).trim();
    if (!isUndetectableHumanizeModelId(raw)) {
      return NextResponse.json(
        { error: 'Invalid humanization model' },
        { status: 400 }
      );
    }
    model = raw;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return NextResponse.json({ error: 'text is empty' }, { status: 400 });
  }
  if (trimmed.length > MAX_INPUT_CHARS) {
    return NextResponse.json({ error: 'text is too long' }, { status: 400 });
  }

  const apiKey = process.env.UNDETECTABLE_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'UNDETECTABLE_API_KEY is not configured' },
      { status: 503 }
    );
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const subscribed = await getUserSubscriptionStatus(supabase, user.id);
  if (!subscribed) {
    return NextResponse.json(
      { error: 'Subscription required' },
      { status: 403 }
    );
  }

  const fullDraft = body.full_draft === true;

  const [{ data: profile }, { data: subRows }] = await Promise.all([
    (supabase as Sb).from('profiles').select('*').eq('id', user.id).maybeSingle(),
    (supabase as Sb)
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created', { ascending: false })
      .limit(20)
  ]);
  const subscription = pickCanonicalSubscription(
    subRows ?? []
  ) as SubscriptionWithPriceAndProduct | null;
  const applyTrialQuotas = shouldApplyTrialFeatureQuotas(profile, subscription);

  let humanizeDraftReserved = false;
  if (applyTrialQuotas && fullDraft) {
    const r = await trialReserveQuota(supabase, 'humanize_draft');
    if (!r.ok) {
      return NextResponse.json(
        {
          error:
            'Trial limit reached: no full-draft humanizations left. Upgrade to a paid plan to continue.',
          code: 'trial_quota_exceeded',
          kind: 'humanize_draft'
        },
        { status: 402 }
      );
    }
    humanizeDraftReserved = true;
  }

  try {
    const output = await humanizeWithUndetectable(trimmed, apiKey, {
      ...(model ? { model } : {}),
      maxOutputLengthRatio: maxOutputLengthRatioFromEnv()
    });
    return NextResponse.json({ output });
  } catch (e) {
    if (humanizeDraftReserved) {
      await trialReleaseQuota(supabase, 'humanize_draft');
    }
    const msg = e instanceof Error ? e.message : 'Undetectable.AI failed';
    console.error('[essay:undetectable-humanize]', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
