import 'server-only';

import { alignGptZeroScoresToLocalSegments } from '@/lib/essay/alignGptZeroScoresToLocalSegments';
import {
  extractGptZeroSentenceScores,
  type GptZeroSentenceScore
} from '@/lib/essay/parseGptZeroRichResponse';

const GPTZERO_URL = 'https://api.gptzero.me/v2/predict/text';

const GPTZERO_HTML_BODY_MESSAGE =
  'GPTZero вернул HTML вместо JSON (часто Cloudflare 520/5xx или геоблокировка). Подождите и нажмите проверку снова.';

const GPTZERO_TRANSIENT_STATUSES = new Set([429, 502, 503, 504, 520, 522, 524]);

/** Один запрос к GPTZero не должен висеть бесконечно (иначе UI на клиенте «крутится»). Длинные эссе и медленный API — 90 с на попытку. */
const FETCH_TIMEOUT_MS = 90_000;

function parseHumanProbability(raw: unknown): number | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  let probs: Record<string, unknown> | undefined;
  const docs = o.documents;
  if (Array.isArray(docs) && docs[0] && typeof docs[0] === 'object') {
    const d0 = docs[0] as Record<string, unknown>;
    if (d0.class_probabilities && typeof d0.class_probabilities === 'object') {
      probs = d0.class_probabilities as Record<string, unknown>;
    }
  }
  if (!probs && o.class_probabilities && typeof o.class_probabilities === 'object') {
    probs = o.class_probabilities as Record<string, unknown>;
  }

  const h = probs?.human;
  if (typeof h !== 'number' || !Number.isFinite(h)) return null;
  if (h >= 0 && h <= 1) return h;
  if (h > 1 && h <= 100) return h / 100;
  return null;
}

function toHumanScorePercent(prob01: number): number {
  const p = prob01 <= 1 ? prob01 * 100 : Math.min(100, prob01);
  return Math.round(Math.max(0, Math.min(100, p)));
}

function responseBodyLooksLikeHtml(text: string): boolean {
  const s = text.trimStart().toLowerCase();
  return (
    s.startsWith('<!doctype') ||
    s.startsWith('<html') ||
    s.startsWith('<!--') ||
    (s.startsWith('<') && s.includes('<html'))
  );
}

function shouldRetryGptZero(
  attempt: number,
  status: number,
  rawText: string
): boolean {
  if (attempt >= 3) return false;
  if (GPTZERO_TRANSIENT_STATUSES.has(status)) return true;
  if (status >= 500 && responseBodyLooksLikeHtml(rawText)) return true;
  return false;
}

function extractGptZeroErrorMessage(
  status: number,
  rawText: string,
  rawJson: unknown
): string {
  if (rawJson && typeof rawJson === 'object') {
    const o = rawJson as Record<string, unknown>;
    const m = o.message;
    if (typeof m === 'string' && m.trim()) return m.trim();
    const err = o.error;
    if (typeof err === 'string' && err.trim()) return err.trim();
    if (err && typeof err === 'object') {
      const em = (err as { message?: unknown }).message;
      if (typeof em === 'string' && em.trim()) return em.trim();
    }
    const detail = o.detail;
    if (typeof detail === 'string' && detail.trim()) return detail.trim();
  }
  const t = rawText.trim();
  if (responseBodyLooksLikeHtml(t)) {
    return GPTZERO_HTML_BODY_MESSAGE;
  }
  if (t) return t.length > 280 ? `${t.slice(0, 277)}…` : t;
  return `HTTP ${status}`;
}

export type GptZeroPredictResult = {
  humanScore: number;
  sentences: GptZeroSentenceScore[];
};

/**
 * Один запрос к GPTZero /v2/predict/text по готовому тексту (серверный ключ из ENV).
 */
export async function runGptZeroPredict(document: string): Promise<GptZeroPredictResult> {
  const apiKey = process.env.GPTZERO_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GPTZERO_API_KEY not configured');
  }

  const version =
    process.env.GPTZERO_MODEL_VERSION?.trim() || '2026-03-30-base';

  const payload = JSON.stringify({ document, version });

  let gptRes!: Response;
  let rawText = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      gptRes = await fetch(GPTZERO_URL, {
        method: 'POST',
        redirect: 'manual',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: payload,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
      });
    } catch (e) {
      const aborted =
        e != null &&
        typeof e === 'object' &&
        'name' in e &&
        (e as { name: string }).name === 'AbortError';
      if (aborted && attempt < 3) {
        console.warn('[gptzero] fetch timeout or abort, retry', attempt);
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }
      const rawMsg =
        e instanceof Error ? e.message : typeof e === 'string' ? e : 'GPTZero request failed';
      const looksLikeNetworkFailure =
        /fetch failed|failed to fetch|network|econnrefused|enotfound|etimedout|certificate|ssl|tls/i.test(
          rawMsg
        );
      throw new Error(
        aborted
          ? 'GPTZero не ответил вовремя. Проверьте сеть, VPN или попробуйте позже.'
          : looksLikeNetworkFailure
            ? `Не удалось связаться с GPTZero (${rawMsg}). Частые причины: нет интернета, блокировка api.gptzero.me (VPN/файрвол/регион), корпоративный прокси. Попробуйте другую сеть или позже.`
            : rawMsg
      );
    }

    if (gptRes.status >= 301 && gptRes.status <= 308) {
      throw new Error(
        'GPTZero redirect instead of JSON — проверьте сеть и ключ API.'
      );
    }

    rawText = await gptRes.text();

    if (shouldRetryGptZero(attempt, gptRes.status, rawText)) {
      await new Promise((r) => setTimeout(r, 600 * attempt));
      continue;
    }
    break;
  }

  let rawJson: unknown = null;
  if (rawText) {
    try {
      rawJson = JSON.parse(rawText) as unknown;
    } catch {
      rawJson = null;
    }
  }

  if (!gptRes.ok) {
    const msg = extractGptZeroErrorMessage(gptRes.status, rawText, rawJson);
    throw new Error(msg);
  }

  if (rawJson === null && responseBodyLooksLikeHtml(rawText)) {
    throw new Error(GPTZERO_HTML_BODY_MESSAGE);
  }

  const prob = parseHumanProbability(rawJson);
  if (prob === null) {
    throw new Error(
      responseBodyLooksLikeHtml(rawText)
        ? GPTZERO_HTML_BODY_MESSAGE
        : 'Could not parse GPTZero response'
    );
  }

  const rawScores = extractGptZeroSentenceScores(rawJson);
  const sentences = alignGptZeroScoresToLocalSegments(document, rawScores);

  return {
    humanScore: toHumanScorePercent(prob),
    sentences
  };
}
