import 'server-only';

import type { GptZeroSentenceScore } from '@/lib/essay/parseGptZeroRichResponse';
import { friendlyUndetectableError } from '@/lib/essay/undetectableUserMessages';

const DETECT_URL = 'https://ai-detect.undetectable.ai/detect';
const QUERY_URL = 'https://ai-detect.undetectable.ai/query';

const POLL_MS = 500;
const MAX_WAIT_MS = 90_000;

export type UndetectableDetectResult = {
  humanScore: number;
  /** Только document-level score; разметка по предложениям подмешивается в `check-ai` через GPTZero при наличии ключа. */
  sentences: GptZeroSentenceScore[] | null;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function humanPercentFromQueryPayload(data: Record<string, unknown>): number {
  const details = data.result_details;
  if (details && typeof details === 'object') {
    const h = (details as { human?: unknown }).human;
    if (typeof h === 'number' && Number.isFinite(h)) {
      return Math.round(Math.max(0, Math.min(100, h)));
    }
  }
  const r = data.result;
  if (typeof r === 'number' && Number.isFinite(r)) {
    /** В ответе `/query` поле `result` — «AI-ness» 0–100; human ≈ 100 − result. */
    return Math.round(Math.max(0, Math.min(100, 100 - r)));
  }
  throw new Error('Could not parse Undetectable.AI detector response');
}

/**
 * Синхронный детектор Undetectable.AI: POST /detect → poll POST /query до status done.
 * @see https://help.undetectable.ai/en/article/detector-api-1cf74il
 */
export async function runUndetectableDetect(
  document: string
): Promise<UndetectableDetectResult> {
  const apiKey = process.env.UNDETECTABLE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('UNDETECTABLE_API_KEY not configured');
  }

  const model =
    process.env.UNDETECTABLE_DETECT_MODEL?.trim() || 'xlm_ud_detector';

  const detectRes = await fetch(DETECT_URL, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: document,
      key: apiKey,
      model,
      retry_count: 0
    }),
    signal: AbortSignal.timeout(90_000)
  });

  const detectText = await detectRes.text();
  let detectJson: unknown = null;
  try {
    detectJson = detectText ? JSON.parse(detectText) : null;
  } catch {
    detectJson = null;
  }

  if (!detectRes.ok) {
    const fromJson =
      detectJson &&
      typeof detectJson === 'object' &&
      typeof (detectJson as { message?: unknown }).message === 'string'
        ? String((detectJson as { message: string }).message).trim()
        : '';
    const raw = fromJson || detectText;
    const msg = friendlyUndetectableError(raw) || raw.trim() || `HTTP ${detectRes.status}`;
    throw new Error(
      detectRes.status === 403
        ? `Undetectable.AI: ${msg || 'check API key or credits'}`
        : `Undetectable.AI detector: ${msg}`
    );
  }

  if (!detectJson || typeof detectJson !== 'object') {
    throw new Error('Undetectable.AI detector returned invalid JSON');
  }

  const id = (detectJson as { id?: unknown }).id;
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('Undetectable.AI detector did not return document id');
  }

  const started = Date.now();
  while (Date.now() - started < MAX_WAIT_MS) {
    await sleep(POLL_MS);

    const queryRes = await fetch(QUERY_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id }),
      signal: AbortSignal.timeout(60_000)
    });

    const queryText = await queryRes.text();
    let queryJson: Record<string, unknown> | null = null;
    try {
      queryJson = queryText ? (JSON.parse(queryText) as Record<string, unknown>) : null;
    } catch {
      queryJson = null;
    }

    if (!queryRes.ok || !queryJson) {
      if (Date.now() - started > MAX_WAIT_MS - POLL_MS) {
        throw new Error(
          friendlyUndetectableError(queryText) || 'Undetectable.AI query failed'
        );
      }
      continue;
    }

    const status = queryJson.status;
    if (status === 'failed') {
      throw new Error('Undetectable.AI detection failed for this text');
    }

    if (status === 'done') {
      const humanScore = humanPercentFromQueryPayload(queryJson);
      return { humanScore, sentences: null };
    }
  }

  throw new Error(
    'Undetectable.AI detector timed out waiting for results (try again)'
  );
}
