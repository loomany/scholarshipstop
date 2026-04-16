import type { FalImageAttemptResult } from '@/lib/fal/falAttemptTypes';

export function falMaxAttempts(): number {
  const n = Number.parseInt(process.env.FAL_HERO_MAX_ATTEMPTS?.trim() || '3', 10);
  return Math.max(1, Math.min(5, Number.isFinite(n) ? n : 3));
}

export function falRequestTimeoutMs(): number {
  const n = Number.parseInt(process.env.FAL_HERO_REQUEST_TIMEOUT_MS?.trim() || '', 10);
  return Number.isFinite(n) && n >= 30_000 ? Math.min(n, 300_000) : 120_000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function shouldRetryFalAttempt(
  attemptIndex: number,
  maxAttempts: number,
  r: FalImageAttemptResult
): boolean {
  if (attemptIndex >= maxAttempts - 1) return false;
  if (r.detail === 'FAL_KEY missing') return false;
  if (r.url?.startsWith('http')) return false;

  const s = r.httpStatus;
  if (s === 401 || s === 402 || s === 403 || s === 400) return false;

  if (s === 429 || s === 408 || s === 502 || s === 503 || s === 504) return true;
  if (s === 0) return true;
  if (s === 200 && r.detail.includes('no image URL')) return true;

  return false;
}

/**
 * Bounded retries for transient FAL failures (shared by Essay Hub + Content Hub resource covers).
 */
export async function runFalImageAttemptLoop(
  attemptOne: () => Promise<FalImageAttemptResult>,
  logPrefix: string
): Promise<FalImageAttemptResult> {
  const maxAttempts = falMaxAttempts();
  let last: FalImageAttemptResult = {
    url: null,
    httpStatus: 0,
    detail: 'no attempts'
  };

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    last = await attemptOne();
    if (last.url?.startsWith('http')) return last;

    if (!shouldRetryFalAttempt(attempt, maxAttempts, last)) break;

    const backoff = 1200 * 2 ** attempt + Math.floor(Math.random() * 400);
    console.error(
      `${logPrefix} FAL attempt ${attempt + 1}/${maxAttempts} failed; retry in ${backoff}ms`,
      { httpStatus: last.httpStatus, detail: last.detail.slice(0, 500) }
    );
    await sleep(backoff);
  }

  console.error(`${logPrefix} FAL gave up after retries`, {
    attempts: maxAttempts,
    httpStatus: last.httpStatus,
    detail: last.detail.slice(0, 800)
  });
  return last;
}
