/**
 * Counts published essays whose hero_image_url points at the canonical gradient
 * fallback WebP (FAL miss → ingestFallbackHeroWebpToSupabase in essayHeroIngest.ts).
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/count-essay-gradient-fallback-heroes.ts
 */
import { createHash } from 'crypto';

import { createClient } from '@supabase/supabase-js';

import { buildFallbackEssayHeroWebpBuffer } from '@/lib/essays/essayHeroIngest';

import type { Database } from '@/types_db';

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  return createClient<Database>(url, key);
}

const PAGE = 500;
const CONCURRENCY = 12;

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  return createHash('sha256').update(Buffer.from(buf)).digest('hex');
}

async function main() {
  const fallbackBuf = await buildFallbackEssayHeroWebpBuffer();
  const fallbackHash = createHash('sha256').update(fallbackBuf).digest('hex');

  const supabase = serviceSupabase();
  let from = 0;
  let totalPublished = 0;
  let withUrl = 0;
  let gradientFallback = 0;
  let fetchFailed = 0;
  const failedSamples: string[] = [];

  async function classifyHero(url: string): Promise<'gradient' | 'real' | 'fetch_failed'> {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(60_000),
        headers: { Accept: 'image/webp,image/*,*/*' }
      });
      if (!res.ok) {
        if (failedSamples.length < 5) failedSamples.push(`${url.slice(0, 80)}… HTTP ${res.status}`);
        return 'fetch_failed';
      }
      const buf = await res.arrayBuffer();
      const h = await sha256Hex(buf);
      return h === fallbackHash ? 'gradient' : 'real';
    } catch {
      if (failedSamples.length < 5) failedSamples.push(`${url.slice(0, 80)}… network/error`);
      return 'fetch_failed';
    }
  }

  let realHero = 0;

  for (;;) {
    const { data: rows, error } = await supabase
      .from('essays')
      .select('id, hero_image_url')
      .eq('is_published', true)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw new Error(error.message);
    const batch = rows ?? [];
    if (batch.length === 0) break;

    totalPublished += batch.length;

    const urls = batch.map((r) => r.hero_image_url?.trim()).filter((u): u is string => Boolean(u));
    withUrl += urls.length;

    for (let i = 0; i < urls.length; i += CONCURRENCY) {
      const slice = urls.slice(i, i + CONCURRENCY);
      const outcomes = await Promise.all(slice.map((u) => classifyHero(u)));
      for (const o of outcomes) {
        if (o === 'gradient') gradientFallback += 1;
        else if (o === 'real') realHero += 1;
        else fetchFailed += 1;
      }
    }

    from += PAGE;
    if (batch.length < PAGE) break;
  }

  console.log(
    JSON.stringify(
      {
        canonical_gradient_fallback_sha256: fallbackHash,
        essays_published_total: totalPublished,
        essays_with_hero_url: withUrl,
        essays_gradient_fallback_hero: gradientFallback,
        essays_real_fal_or_other_hero_image: realHero,
        hero_fetch_or_http_errors: fetchFailed,
        sample_errors: failedSamples
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
