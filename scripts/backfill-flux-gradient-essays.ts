/**
 * Regenerates Essay Hub heroes from FLUX (see runEssayGenerationJob) for rows listed in
 * scripts/gradient-fallback-grants.output.json (snapshot from gradient-placeholder audit).
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/backfill-flux-gradient-essays.ts --skip 10
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/backfill-flux-gradient-essays.ts --skip 10 --limit 5   # smoke
 *
 * After the first 10 were done manually, use --skip 10 for the rest (~864).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { createClient } from '@supabase/supabase-js';

import { ingestEssayHeroFromFalOrFallback } from '@/lib/essays/essayHeroIngest';
import {
  buildEssayHubHeroImagePrompt,
  buildGrantCategoryHaystack,
  tryResolveHeroImageUrl
} from '@/lib/essays/runEssayGenerationJob';

import type { Database } from '@/types_db';

type GrantRow = {
  essay_id: string;
  essay_slug: string;
  essay_title: string;
  scholarship_title?: string;
};

function parseArgs() {
  const argv = process.argv.slice(2);
  let skip = 0;
  let limit: number | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--skip' && argv[i + 1]) {
      skip = Math.max(0, parseInt(argv[i + 1], 10) || 0);
      i += 1;
    } else if (argv[i] === '--limit' && argv[i + 1]) {
      limit = Math.max(1, parseInt(argv[i + 1], 10) || 1);
      i += 1;
    }
  }
  return { skip, limit };
}

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

const PAUSE_MS = 1500;

async function main() {
  const { skip, limit } = parseArgs();

  const jsonPath = resolve(
    process.cwd(),
    'scripts',
    'gradient-fallback-grants.output.json'
  );
  const raw = readFileSync(jsonPath, 'utf8');
  const parsed = JSON.parse(raw) as {
    grants: GrantRow[];
    summary?: { essays_gradient_placeholder_hero?: number };
  };
  const all = parsed.grants ?? [];
  const afterSkip = all.slice(skip);
  const targets = limit != null ? afterSkip.slice(0, limit) : afterSkip;

  console.log(
    JSON.stringify(
      {
        json_file: jsonPath,
        gradient_rows_in_snapshot: all.length,
        summary_gradient_count: parsed.summary?.essays_gradient_placeholder_hero ?? null,
        skip_first: skip,
        limit: limit ?? null,
        will_process: targets.length,
        note:
          'Remaining ≈ snapshot length − skip (first batch was 10). Re-run list-grants script for exact current DB count.'
      },
      null,
      2
    )
  );

  if (targets.length === 0) {
    console.log('Nothing to process.');
    return;
  }

  const supabase = serviceSupabase();

  const { data: allPublished, error: pe } = await supabase
    .from('essays')
    .select('id')
    .eq('is_published', true)
    .order('created_at', { ascending: true });

  if (pe) throw new Error(pe.message);
  const orderedIds = (allPublished ?? []).map((r) => r.id);

  let ok = 0;
  let failed = 0;
  const errors: { slug: string; error: string }[] = [];

  for (let idx = 0; idx < targets.length; idx += 1) {
    const g = targets[idx]!;
    const slug = g.essay_slug.trim();
    try {
      const existingIndex = Math.max(0, orderedIds.indexOf(g.essay_id));
      const grantCategory = await loadGrantCategoryHaystackForEssay(supabase, g.essay_id);
      const grantTitle =
        g.scholarship_title?.trim() || g.essay_title?.trim() || 'Scholarship essay';

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
        .eq('id', g.essay_id);

      if (upErr) throw new Error(upErr.message);

      ok += 1;
      console.log(
        JSON.stringify(
          {
            progress: `${idx + 1}/${targets.length}`,
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
      console.error(JSON.stringify({ progress: `${idx + 1}/${targets.length}`, ok: false, slug, error: msg }, null, 2));
    }

    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }

  console.log('');
  console.log(
    JSON.stringify(
      {
        done: true,
        processed_ok: ok,
        processed_failed: failed,
        errors: errors.slice(0, 30),
        errors_truncated: errors.length > 30
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
