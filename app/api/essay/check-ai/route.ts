import { NextResponse } from 'next/server';

import { runGptZeroPredict } from '@/lib/essay/runGptZeroPredict';
import type { GptZeroSentenceScore } from '@/lib/essay/parseGptZeroRichResponse';
import { runUndetectableDetect } from '@/lib/essay/runUndetectableDetect';
import {
  shouldApplyTrialFeatureQuotas,
  trialReleaseQuota,
  trialReserveQuota
} from '@/lib/payments/trialFeatureQuotas';
import type { SubscriptionWithPriceAndProduct } from '@/lib/payments/subscriptionEntitlements';
import { pickCanonicalSubscription } from '@/lib/payments/subscriptionAccess';
import type { Tables } from '@/types_db';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 240;
export const dynamic = 'force-dynamic';
export const preferredRegion = ['iad1', 'fra1', 'cdg1'];

/** Согласовано с smart-merge — тот же верхний предел на размер эссе. */
const MAX_CONTENT_CHARS = 600_000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

type DetectorKind = 'gptzero' | 'undetectable';

function parseDetector(raw: unknown): DetectorKind {
  if (raw === 'undetectable') return 'undetectable';
  return 'gptzero';
}

export async function POST(request: Request) {
  let body: { essay_id?: string; detector?: string; content?: string };
  try {
    body = (await request.json()) as {
      essay_id?: string;
      detector?: string;
      /** Если передан — анализируем его (тот же текст, что в редакторе / Copy), а не только снимок из БД. */
      content?: string;
    };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const essayId = body.essay_id?.trim();
  if (!essayId || !UUID_RE.test(essayId)) {
    return NextResponse.json({ error: 'Invalid essay_id' }, { status: 400 });
  }

  const detector = parseDetector(body.detector);

  if (detector === 'gptzero' && !process.env.GPTZERO_API_KEY?.trim()) {
    return NextResponse.json(
      { error: 'GPTZero is not configured (GPTZERO_API_KEY)' },
      { status: 503 }
    );
  }

  if (detector === 'undetectable' && !process.env.UNDETECTABLE_API_KEY?.trim()) {
    return NextResponse.json(
      { error: 'Undetectable.AI is not configured (UNDETECTABLE_API_KEY)' },
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

  const { data: row, error } = (await (supabase as Sb)
    .from('essay_results')
    .select('id, content')
    .eq('id', essayId)
    .eq('user_id', user.id)
    .maybeSingle()) as {
    data: Pick<Tables<'essay_results'>, 'id' | 'content'> | null;
    error: { message: string } | null;
  };

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message ?? 'Essay not found' },
      { status: 404 }
    );
  }

  const fromClient =
    typeof body.content === 'string' ? body.content.trim() : '';
  const fromDb = (row.content ?? '').trim();
  const document =
    fromClient.length > 0
      ? fromClient
      : fromDb.length > 0
        ? fromDb
        : '';

  if (!document) {
    return NextResponse.json(
      { error: 'Essay has no text to analyze' },
      { status: 400 }
    );
  }

  if (document.length > MAX_CONTENT_CHARS) {
    return NextResponse.json(
      { error: `Text is too long (max ${MAX_CONTENT_CHARS} characters)` },
      { status: 400 }
    );
  }

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

  let aiCheckReserved = false;
  if (applyTrialQuotas) {
    const r = await trialReserveQuota(supabase, 'ai_check');
    if (!r.ok) {
      return NextResponse.json(
        {
          error:
            'Trial limit reached: AI authenticity checks are unavailable on your trial. Upgrade to a paid plan to continue.',
          code: 'trial_quota_exceeded',
          kind: 'ai_check'
        },
        { status: 402 }
      );
    }
    aiCheckReserved = true;
  }

  try {
    if (detector === 'undetectable') {
      const { humanScore } = await runUndetectableDetect(document);
      /** REST Undetectable returns only a document score; for GPTZero-style highlights we merge GPTZero sentence maps on the same text. */
      let sentences: GptZeroSentenceScore[] | null = null;
      if (process.env.GPTZERO_API_KEY?.trim()) {
        try {
          const gz = await runGptZeroPredict(document);
          sentences = gz.sentences;
        } catch (e) {
          console.warn(
            '[check-ai] GPTZero sentence map failed (Undetectable score path):',
            e instanceof Error ? e.message : e
          );
        }
      }
      return NextResponse.json({
        humanScore,
        sentences,
        detector: 'undetectable' as const
      });
    }
    const { humanScore, sentences } = await runGptZeroPredict(document);
    return NextResponse.json({
      humanScore,
      sentences,
      detector: 'gptzero' as const
    });
  } catch (e) {
    if (aiCheckReserved) {
      await trialReleaseQuota(supabase, 'ai_check');
    }
    const msg = e instanceof Error ? e.message : 'AI detector request failed';
    const label = detector === 'undetectable' ? 'Undetectable.AI' : 'GPTZero';
    return NextResponse.json(
      { error: `${label} request failed`, detail: msg },
      { status: 502 }
    );
  }
}
