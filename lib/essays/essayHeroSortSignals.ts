import { createHash } from 'crypto';

import { buildFallbackEssayHeroWebpBuffer } from '@/lib/essays/essayHeroIngest';

export type EssayHeroSortQuality = 'real' | 'weak';

let fingerprintCache: { len: number; hash: string } | null = null;

function sha256Buf(buf: ArrayBuffer | Buffer): string {
  return createHash('sha256')
    .update(Buffer.isBuffer(buf) ? buf : Buffer.from(buf))
    .digest('hex');
}

/** Fingerprint of `buildFallbackEssayHeroWebpBuffer` (gradient placeholder). */
export async function getEssayHeroFallbackFingerprint(): Promise<{
  len: number;
  hash: string;
}> {
  if (fingerprintCache) return fingerprintCache;
  const buf = await buildFallbackEssayHeroWebpBuffer();
  fingerprintCache = { len: buf.length, hash: sha256Buf(buf) };
  return fingerprintCache;
}

/**
 * `weak` = no URL, gradient placeholder bytes, or fetch error.
 * `real` = hero asset differs from canonical gradient (typical FLUX/sharp WebP).
 */
export async function classifyEssayHeroUrlForSort(
  heroUrl: string | null | undefined,
  fp: { len: number; hash: string }
): Promise<EssayHeroSortQuality> {
  const u = heroUrl?.trim();
  if (!u) return 'weak';

  try {
    let headLen: number | null = null;
    try {
      const head = await fetch(u, {
        method: 'HEAD',
        signal: AbortSignal.timeout(25_000),
        redirect: 'follow'
      });
      if (head.ok) {
        const cl = head.headers.get('content-length');
        if (cl != null && /^\d+$/.test(cl.trim())) {
          headLen = parseInt(cl.trim(), 10);
        }
      }
    } catch {
      /* HEAD may be 405 — fall through to GET */
    }

    if (headLen !== null && headLen !== fp.len) {
      return 'real';
    }

    const res = await fetch(u, {
      signal: AbortSignal.timeout(60_000),
      redirect: 'follow',
      headers: { Accept: 'image/webp,image/*,*/*' }
    });
    if (!res.ok) return 'weak';
    const buf = await res.arrayBuffer();
    const h = sha256Buf(buf);
    return h === fp.hash ? 'weak' : 'real';
  } catch {
    return 'weak';
  }
}

const SORT_CLASSIFY_CONCURRENCY = 28;

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const chunk = Math.max(1, concurrency);
  for (let i = 0; i < items.length; i += chunk) {
    const part = await Promise.all(
      items.slice(i, i + chunk).map((item, j) => fn(item, i + j))
    );
    for (let k = 0; k < part.length; k += 1) {
      results[i + k] = part[k];
    }
  }
  return results;
}

/** Per-essay priority for `/essays` sort: 1 = show first, 0 = deprioritized. */
export async function buildEssayHeroListPriorityById(
  rows: { id: string; hero_image_url: string | null }[]
): Promise<Record<string, 0 | 1>> {
  const fp = await getEssayHeroFallbackFingerprint();
  const qualities = await mapWithConcurrency(
    rows,
    SORT_CLASSIFY_CONCURRENCY,
    async (row) => classifyEssayHeroUrlForSort(row.hero_image_url, fp)
  );
  const out: Record<string, 0 | 1> = {};
  for (let i = 0; i < rows.length; i += 1) {
    out[rows[i].id] = qualities[i] === 'real' ? 1 : 0;
  }
  return out;
}
