import 'server-only';

import { friendlyUndetectableError } from '@/lib/essay/undetectableUserMessages';

/** One POST submits the full `content` string; the API returns one humanized `output` (not per-sentence). */
const SUBMIT_URL = 'https://humanize.undetectable.ai/submit';
const DOCUMENT_URL = 'https://humanize.undetectable.ai/document';

const MIN_CHARS = 50;
/** Slightly faster polling; total wait cap still ~MAX_POLLS * POLL_MS. */
const POLL_MS = 1800;
const MAX_POLLS = 72;

/** API: Quality / Balanced / More Human — default is strongest humanization (More Human). @see Humanization API v2 */
const DEFAULT_STRENGTH = 'More Human';

export type UndetectableHumanizeOptions = {
  /** Default v2 (multilingual); v11 / v11sr are English-focused per Undetectable docs. */
  model?: string;
  readability?: string;
  purpose?: string;
  strength?: string;
  /**
   * If the result is longer than `source.length * ratio`, trim to the last completed sentence
   * within the limit (Undetectable’s API does not expose a max length).
   */
  maxOutputLengthRatio?: number;
};

/**
 * Caps humanized output length relative to the source (e.g. 1.2 = up to +20%).
 */
export function clampHumanizeOutputToMaxExpansion(
  source: string,
  output: string,
  maxRatio: number
): string {
  const out = output.trim();
  if (!out || maxRatio <= 0 || !Number.isFinite(maxRatio)) return out;
  const srcLen = source.trim().length;
  if (srcLen < 1) return out;
  const maxLen = Math.max(MIN_CHARS, Math.floor(srcLen * maxRatio));
  if (out.length <= maxLen) return out;

  const hard = out.slice(0, maxLen);
  let bestEnd = -1;
  const re = /[.!?](?:\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(hard)) !== null) {
    bestEnd = m.index + m[0].length;
  }
  if (bestEnd >= Math.floor(maxLen * 0.45)) {
    return hard.slice(0, bestEnd).trim();
  }
  return hard.trim();
}

/**
 * Humanization API v2: submit → poll /document until `output` is ready.
 * @see https://help.undetectable.ai/en/article/humanization-api-v2-p28b2n
 */
export async function humanizeWithUndetectable(
  text: string,
  apiKey: string,
  options: UndetectableHumanizeOptions = {}
): Promise<string> {
  const trimmed = text.trim();
  if (trimmed.length < MIN_CHARS) {
    throw new Error(
      `Undetectable.AI requires at least ${MIN_CHARS} characters. Add a bit more text or merge two sentences.`
    );
  }

  const model = options.model?.trim() || process.env.UNDETECTABLE_MODEL?.trim() || 'v2';
  const readability = options.readability ?? 'University';
  const purpose = options.purpose ?? 'Essay';
  const strength =
    options.strength?.trim() ||
    process.env.UNDETECTABLE_STRENGTH?.trim() ||
    DEFAULT_STRENGTH;

  const submitRes = await fetch(SUBMIT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey
    },
    body: JSON.stringify({
      content: trimmed,
      readability,
      purpose,
      strength,
      model
    })
  });

  const submitRaw = await submitRes.text();
  let submitJson: { id?: string; error?: string; status?: string } = {};
  try {
    submitJson = JSON.parse(submitRaw) as typeof submitJson;
  } catch {
    /* ignore */
  }

  if (!submitRes.ok) {
    if (submitRes.status === 402) {
      throw new Error(
        'Your Undetectable.AI account is out of credits. Add credits in the Undetectable.AI dashboard.'
      );
    }
    if (submitRes.status === 401) {
      throw new Error('Invalid Undetectable.AI API key (UNDETECTABLE_API_KEY).');
    }
    const raw =
      typeof submitJson.error === 'string' && submitJson.error.trim()
        ? submitJson.error
        : submitRaw;
    throw new Error(
      friendlyUndetectableError(raw) || `Undetectable submit HTTP ${submitRes.status}`
    );
  }

  const docId = submitJson.id;
  if (!docId || typeof docId !== 'string') {
    throw new Error('Undetectable.AI did not return a document id.');
  }

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_MS));

    const docRes = await fetch(DOCUMENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey
      },
      body: JSON.stringify({ id: docId })
    });

    const docRaw = await docRes.text();
    let docJson: { output?: string; error?: string; input?: string } = {};
    try {
      docJson = JSON.parse(docRaw) as typeof docJson;
    } catch {
      /* ignore */
    }

    if (!docRes.ok) {
      if (docRes.status === 402) {
        throw new Error(
          'Your Undetectable.AI account is out of credits. Add credits in the Undetectable.AI dashboard.'
        );
      }
      if (docRes.status === 401) {
        throw new Error('Invalid Undetectable.AI API key (UNDETECTABLE_API_KEY).');
      }
      const raw =
        typeof docJson.error === 'string' && docJson.error.trim()
          ? docJson.error
          : docRaw;
      throw new Error(
        friendlyUndetectableError(raw) || `Undetectable document HTTP ${docRes.status}`
      );
    }

    const out = docJson.output;
    if (typeof out === 'string' && out.trim()) {
      let result = out.trim();
      const ratio = options.maxOutputLengthRatio;
      if (typeof ratio === 'number' && ratio > 0 && Number.isFinite(ratio)) {
        result = clampHumanizeOutputToMaxExpansion(trimmed, result, ratio);
      }
      return result;
    }
  }

  throw new Error(
    'Timed out waiting for Undetectable.AI. Try again in a minute.'
  );
}
