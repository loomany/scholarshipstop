/**
 * Находит опубликованные эссе **без hero** или с **градиентным placeholder** (тот же размер файла,
 * что buildFallbackEssayHeroWebpBuffer), и прогоняет FLUX + ingest (настройки из runEssayGenerationJob:
 * по умолчанию 704×396 (или FLUX_HERO_*), см. runEssayGenerationJob).
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/backfill-flux-essays-needing-hero.ts
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/backfill-flux-essays-needing-hero.ts --limit 3
 */
import { createHash } from 'crypto';

import { createClient } from '@supabase/supabase-js';

import {
  buildFallbackEssayHeroWebpBuffer,
  ingestEssayHeroFromFalOrFallback
} from '@/lib/essays/essayHeroIngest';
import {
  buildEssayHubHeroImagePrompt,
  buildGrantCategoryHaystack,
  tryResolveHeroImageUrl
} from '@/lib/essays/runEssayGenerationJob';

import type { Database } from '@/types_db';

const PAGE = 400;
const PAUSE_MS = 1500;
const HEAD_CONCURRENCY = 24;

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(url, key);
}

async function loadGrantCategoryHaystackForEssay(
  supabase: ReturnType<typeof serviceSupabase>,
  essayId: string
): Promise<string> {
  const { data: link, error: le } = await supabase
    .from('scholarship_essays')
    .select('scholarship_id')
    .eq('essay_id', essayId)
    .maybeSingle();
  if (le || !link?.scholarship_id) return '';

  const { data: sch, error: se } = await supabase
    .from('scholarships')
    .select('category, category_slug, tags, summary_short, title')
    .eq('id', link.scholarship_id)
    .maybeSingle();
  if (se || !sch) return '';

  return buildGrantCategoryHaystack({
    category: sch.category ?? null,
    category_slug: sch.category_slug ?? null,
    tags: sch.tags ?? null,
    summary_short: sch.summary_short ?? null,
    title: sch.title
  });
}

async function loadScholarshipTitleForEssay(
  supabase: ReturnType<typeof serviceSupabase>,
  essayId: string
): Promise<string | null> {
  const { data: link } = await supabase
    .from('scholarship_essays')
    .select('scholarship_id')
    .eq('essay_id', essayId)
    .maybeSingle();
  if (!link?.scholarship_id) return null;
  const { data: sch } = await supabase
    .from('scholarships')
    .select('title')
    .eq('id', link.scholarship_id)
    .maybeSingle();
  return sch?.title?.trim() ?? null;
}

/** true = нужен новый hero (нет URL или градиентный fallback) */
async function needsNewHero(
  heroUrl: string | null | undefined,
  fallbackLen: number,
  fallbackHash: string
): Promise<boolean> {
  const u = heroUrl?.trim();
  if (!u) return true;

  try {
    const head = await fetch(u, {
      method: 'HEAD',
      signal: AbortSignal.timeout(25_000),
      redirect: 'follow'
    });
    if (!head.ok) return true;
    const cl = head.headers.get('content-length');
    if (cl != null && /^\d+$/.test(cl.trim())) {
      const n = parseInt(cl.trim(), 10);
      if (n !== fallbackLen) return false;
      return true;
    }
  } catch {
    return true;
  }

  try {
    const res = await fetch(u, {
      signal: AbortSignal.timeout(60_000),
      redirect: 'follow',
      headers: { Accept: 'image/*' }
    });
    if (!res.ok) return true;
    const buf = await res.arrayBuffer();
    const h = createHash('sha256').update(Buffer.from(buf)).digest('hex');
    return h === fallbackHash;
  } catch {
    return true;
  }
}

function parseArgs() {
  const argv = process.argv.slice(2);
  let limit: number | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--limit' && argv[i + 1]) {
      limit = Math.max(1, parseInt(argv[i + 1], 10) || 1);
      i += 1;
    }
  }
  return { limit };
}

async function main() {
  const { limit } = parseArgs();

  const fallbackBuf = await buildFallbackEssayHeroWebpBuffer();
  const fallbackLen = fallbackBuf.length;
  const fallbackHash = createHash('sha256').update(fallbackBuf).digest('hex');

  const supabase = serviceSupabase();

  const ordered: {
    id: string;
    slug: string | null;
    title: string | null;
    hero_image_url: string | null;
  }[] = [];
  let rangeFrom = 0;
  for (;;) {
    const { data: batch, error: pe } = await supabase
      .from('essays')
      .select('id, slug, title, hero_image_url')
      .eq('is_published', true)
      .order('created_at', { ascending: true })
      .range(rangeFrom, rangeFrom + PAGE - 1);
    if (pe) throw new Error(pe.message);
    const rows = batch ?? [];
    ordered.push(...(rows as typeof ordered));
    if (rows.length < PAGE) break;
    rangeFrom += PAGE;
  }
  const orderedIds = ordered.map((r) => r.id);

  console.log(
    JSON.stringify(
      {
        phase: 'scan',
        published_total: ordered.length,
        fallback_placeholder_bytes: fallbackLen,
        flux_defaults_note:
          '704×396 unless FLUX_HERO_WIDTH/HEIGHT set — see runEssayGenerationJob buildFluxDevHeroBody'
      },
      null,
      2
    )
  );

  const candidates: typeof ordered = [];
  for (let from = 0; from < ordered.length; from += PAGE) {
    const rows = ordered.slice(from, from + PAGE);
    for (let i = 0; i < rows.length; i += HEAD_CONCURRENCY) {
      const slice = rows.slice(i, i + HEAD_CONCURRENCY);
      const flags = await Promise.all(
        slice.map((row) => needsNewHero(row.hero_image_url, fallbackLen, fallbackHash))
      );
      for (let j = 0; j < slice.length; j += 1) {
        if (flags[j]) candidates.push(slice[j]!);
      }
    }
  }

  const toRun = limit != null ? candidates.slice(0, limit) : candidates;

  console.log(
    JSON.stringify(
      {
        phase: 'targets',
        need_hero_count: candidates.length,
        will_process: toRun.length,
        limit: limit ?? null
      },
      null,
      2
    )
  );

  if (toRun.length === 0) {
    console.log('Nothing to process.');
    return;
  }

  let ok = 0;
  let failed = 0;
  const errors: { slug: string; error: string }[] = [];

  for (let idx = 0; idx < toRun.length; idx += 1) {
    const row = toRun[idx]!;
    const slug = row.slug?.trim() ?? row.id;
    try {
      const existingIndex = Math.max(0, orderedIds.indexOf(row.id));
      const grantCategory = await loadGrantCategoryHaystackForEssay(supabase, row.id);
      const schTitle = await loadScholarshipTitleForEssay(supabase, row.id);
      const grantTitle =
        schTitle || row.title?.trim() || 'Scholarship essay';

      const heroPrompt = buildEssayHubHeroImagePrompt({
        existingIndex,
        grantTitle,
        grantCategory
      });
      const falHeroUrl = await tryResolveHeroImageUrl(heroPrompt);
      const { url: heroUrl, heroIsReal } = await ingestEssayHeroFromFalOrFallback(
        supabase,
        {
          falImageUrl: falHeroUrl,
          slug
        }
      );

      const { error: upErr } = await supabase
        .from('essays')
        .update({
          hero_image_url: heroUrl,
          hero_is_real: heroIsReal,
          updated_at: new Date().toISOString()
        })
        .eq('id', row.id);

      if (upErr) throw new Error(upErr.message);

      ok += 1;
      console.log(
        JSON.stringify(
          {
            progress: `${idx + 1}/${toRun.length}`,
            ok: true,
            slug,
            hero_image_url: heroUrl
          },
          null,
          2
        )
      );
    } catch (e) {
      failed += 1;
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ slug, error: msg });
      console.error(
        JSON.stringify(
          { progress: `${idx + 1}/${toRun.length}`, ok: false, slug, error: msg },
          null,
          2
        )
      );
    }

    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }

  console.log(
    JSON.stringify(
      {
        done: true,
        processed_ok: ok,
        processed_failed: failed,
        errors: errors.slice(0, 40),
        errors_truncated: errors.length > 40
      },
      null,
      2
    )
  );

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
