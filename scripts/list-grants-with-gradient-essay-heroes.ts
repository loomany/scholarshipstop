/**
 * Гранты (scholarships), у которых опубликованный essay hub гайд использует
 * градиентный placeholder hero (FAL miss → buildFallbackEssayHeroWebp в essayHeroIngest.ts).
 *
 * Быстрый путь: HEAD + content-length; иначе GET + SHA256 эталона.
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/list-grants-with-gradient-essay-heroes.ts
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/list-grants-with-gradient-essay-heroes.ts --write
 */
import { createHash } from 'crypto';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

import { createClient } from '@supabase/supabase-js';

import { buildFallbackEssayHeroWebpBuffer } from '@/lib/essays/essayHeroIngest';

import type { Database } from '@/types_db';

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  return createClient<Database>(url, key);
}

const PAGE = 400;
const CONCURRENCY = 32;

function sha256Buf(buf: ArrayBuffer | Buffer): string {
  return createHash('sha256').update(Buffer.isBuffer(buf) ? buf : Buffer.from(buf)).digest('hex');
}

async function isGradientHero(
  url: string,
  fallbackLen: number,
  fallbackHash: string
): Promise<'gradient' | 'real' | 'error'> {
  try {
    let headLen: number | null = null;
    try {
      const head = await fetch(url, {
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
      /* HEAD часто 405 — идём в GET */
    }

    if (headLen !== null && headLen !== fallbackLen) {
      return 'real';
    }

    const res = await fetch(url, {
      signal: AbortSignal.timeout(60_000),
      redirect: 'follow',
      headers: { Accept: 'image/webp,image/*,*/*' }
    });
    if (!res.ok) return 'error';
    const buf = await res.arrayBuffer();
    const h = sha256Buf(buf);
    return h === fallbackHash ? 'gradient' : 'real';
  } catch {
    return 'error';
  }
}

type EssayRow = { id: string; slug: string; title: string; hero_image_url: string | null };

async function main() {
  const writeFile = process.argv.includes('--write');
  const fallbackBuf = await buildFallbackEssayHeroWebpBuffer();
  const fallbackLen = fallbackBuf.length;
  const fallbackHash = sha256Buf(fallbackBuf);

  const supabase = serviceSupabase();
  const gradientEssays: EssayRow[] = [];
  let totalPublished = 0;
  let withHeroUrl = 0;
  let realHero = 0;
  let errors = 0;

  let from = 0;
  for (;;) {
    const { data: rows, error } = await supabase
      .from('essays')
      .select('id, slug, title, hero_image_url')
      .eq('is_published', true)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw new Error(error.message);
    const batch = (rows ?? []) as EssayRow[];
    if (batch.length === 0) break;

    totalPublished += batch.length;

    const withUrl = batch.filter((r) => r.hero_image_url?.trim());
    withHeroUrl += withUrl.length;

    for (let i = 0; i < withUrl.length; i += CONCURRENCY) {
      const slice = withUrl.slice(i, i + CONCURRENCY);
      const outcomes = await Promise.all(
        slice.map(async (row) => {
          const url = row.hero_image_url!.trim();
          const k = await isGradientHero(url, fallbackLen, fallbackHash);
          return { row, k };
        })
      );
      for (const { row, k } of outcomes) {
        if (k === 'gradient') gradientEssays.push(row);
        else if (k === 'real') realHero += 1;
        else errors += 1;
      }
    }

    from += PAGE;
    if (batch.length < PAGE) break;
  }

  const essayIds = gradientEssays.map((e) => e.id);
  const grantRows: {
    essay_id: string;
    essay_slug: string;
    essay_title: string;
    scholarship_id: string;
    scholarship_title: string | null;
    scholarship_slug: string | null;
    url: string | null;
  }[] = [];

  const chunkSize = 200;
  for (let i = 0; i < essayIds.length; i += chunkSize) {
    const chunk = essayIds.slice(i, i + chunkSize);
    const { data: links, error: le } = await supabase
      .from('scholarship_essays')
      .select('essay_id, scholarship_id, scholarships ( id, title, slug, url )')
      .in('essay_id', chunk);

    if (le) throw new Error(le.message);

    const rows = (links ?? []) as {
      essay_id: string;
      scholarship_id: string;
      scholarships: { id: string; title: string | null; slug: string | null; url: string | null } | null;
    }[];

    const essayById = new Map(gradientEssays.map((e) => [e.id, e]));
    for (const r of rows) {
      const essay = essayById.get(r.essay_id);
      const s = r.scholarships;
      if (!essay || !s) continue;
      grantRows.push({
        essay_id: r.essay_id,
        essay_slug: essay.slug,
        essay_title: essay.title,
        scholarship_id: s.id,
        scholarship_title: s.title,
        scholarship_slug: s.slug,
        url: s.url
      });
    }
  }

  const summary = {
    canonical_gradient_fallback_bytes: fallbackLen,
    canonical_gradient_fallback_sha256: fallbackHash,
    essays_published_total: totalPublished,
    essays_with_hero_url: withHeroUrl,
    essays_gradient_placeholder_hero: gradientEssays.length,
    essays_real_hero_image: realHero,
    hero_fetch_errors: errors,
    grants_linked_to_those_essays: grantRows.length,
    note:
      'Один грант ↔ один гайд в hub; если связей несколько, строк будет несколько. Градиент = тот же WebP, что buildFallbackEssayHeroWebpBuffer.'
  };

  console.log(JSON.stringify(summary, null, 2));
  console.log('');
  console.log('--- grants (scholarships) with gradient essay hero ---');
  console.log(JSON.stringify(grantRows, null, 2));

  if (writeFile) {
    const out = resolve(process.cwd(), 'scripts', 'gradient-fallback-grants.output.json');
    writeFileSync(
      out,
      JSON.stringify({ summary, grants: grantRows }, null, 2),
      'utf8'
    );
    console.log('');
    console.log(`Wrote ${out}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
