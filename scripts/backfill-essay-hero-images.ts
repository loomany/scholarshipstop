/**
 * Sets `hero_image_url` for published essays (oldest first by `created_at`).
 * Tries FAL once; on missing key / FAL failure / ingest failure, uploads a gradient fallback to Storage.
 *
 * - Default: only rows **missing** `hero_image_url`.
 * - `--force`: regenerate FAL heroes for the first N published essays even if a URL exists.
 * - `--all`: regenerate **all** published essays (implies overwrite; ignores numeric limit).
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/backfill-essay-hero-images.ts [limit] [--force]
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/backfill-essay-hero-images.ts --all
 * Default limit: 3
 */
import { createClient } from '@supabase/supabase-js';

import { ingestEssayHeroFromFalOrFallback } from '@/lib/essays/essayHeroIngest';
import {
  buildEssayHubHeroImagePrompt,
  buildGrantCategoryHaystack,
  tryResolveHeroImageUrl
} from '@/lib/essays/runEssayGenerationJob';
import type { Database } from '@/types_db';

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

function parseArgs() {
  const argv = process.argv.slice(2);
  const all = argv.includes('--all');
  const force = argv.includes('--force') || all;
  const numArg = argv.find((a) => /^\d+$/.test(a));
  const limit = all
    ? Number.MAX_SAFE_INTEGER
    : Math.max(1, numArg ? Number(numArg) : 3);
  return { limit, force, all };
}

async function main() {
  const { limit, force, all } = parseArgs();
  const supabase = serviceSupabase();

  const { data: rows, error } = await supabase
    .from('essays')
    .select('id, slug, title, hero_image_url')
    .eq('is_published', true)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const ordered = rows ?? [];
  const targets = all
    ? ordered
    : force
      ? ordered.slice(0, limit)
      : ordered.filter((r) => !r.hero_image_url?.trim()).slice(0, limit);

  if (targets.length === 0) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          message: force
            ? 'No published essays to process.'
            : 'No published essays missing hero_image_url (in first N by created_at).',
          limit,
          force,
          all
        },
        null,
        2
      )
    );
    return;
  }

  const results: { slug: string; ok: boolean; error?: string }[] = [];

  for (const row of targets) {
    const slug = row.slug?.trim() ?? row.id;
    try {
      const existingIndex = Math.max(
        0,
        ordered.findIndex((e) => e.id === row.id)
      );
      const grantCategory = await loadGrantCategoryHaystackForEssay(
        supabase,
        row.id
      );
      const grantTitle = row.title?.trim() || 'Scholarship essay';
      const heroPrompt = buildEssayHubHeroImagePrompt({
        existingIndex,
        grantTitle,
        grantCategory
      });
      const falHeroUrl = await tryResolveHeroImageUrl(heroPrompt);
      const heroUrl = await ingestEssayHeroFromFalOrFallback(supabase, {
        falImageUrl: falHeroUrl,
        slug
      });
      const { error: upErr } = await supabase
        .from('essays')
        .update({
          hero_image_url: heroUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', row.id);
      if (upErr) throw new Error(upErr.message);
      results.push({ slug, ok: true });
      console.log(JSON.stringify({ ok: true, slug, hero_image_url: heroUrl }, null, 2));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ slug, ok: false, error: msg });
      console.error(JSON.stringify({ ok: false, slug, error: msg }, null, 2));
    }
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
