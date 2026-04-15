/**
 * Regenerates hero images for the first N essays listed in
 * scripts/gradient-fallback-grants.output.json (gradient placeholder heroes).
 * Uses production pipeline: tryResolveHeroImageUrl (FLUX when ESSAY_HUB_HERO_FAL_BACKEND unset)
 * + ingestEssayHeroFromFalOrFallback.
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/backfill-flux-10-gradient-essays.ts
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
import { getURL } from '@/utils/helpers';
import { essayHubArticlePath } from '@/lib/essays/essayHubSection';

import type { Database } from '@/types_db';

const TAKE = 10;

type GrantRow = {
  essay_id: string;
  essay_slug: string;
  essay_title: string;
  scholarship_title?: string;
};

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

async function main() {
  const jsonPath = resolve(
    process.cwd(),
    'scripts',
    'gradient-fallback-grants.output.json'
  );
  const raw = readFileSync(jsonPath, 'utf8');
  const parsed = JSON.parse(raw) as { grants: GrantRow[] };
  const picks = (parsed.grants ?? []).slice(0, TAKE);
  if (picks.length === 0) {
    throw new Error(`No grants in ${jsonPath}`);
  }

  const supabase = serviceSupabase();

  const { data: allPublished, error: pe } = await supabase
    .from('essays')
    .select('id')
    .eq('is_published', true)
    .order('created_at', { ascending: true });

  if (pe) throw new Error(pe.message);
  const orderedIds = (allPublished ?? []).map((r) => r.id);

  const links: { title: string; url: string; slug: string }[] = [];

  for (const g of picks) {
    const slug = g.essay_slug.trim();
    const existingIndex = Math.max(0, orderedIds.indexOf(g.essay_id));
    const grantCategory = await loadGrantCategoryHaystackForEssay(supabase, g.essay_id);
    /** Same source as queue worker: catalog scholarship title */
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

    const path = essayHubArticlePath(slug).replace(/^\/+/, '');
    links.push({
      slug,
      title: g.essay_title?.trim() || grantTitle,
      url: getURL(path)
    });

    console.log(JSON.stringify({ ok: true, slug, hero_image_url: heroUrl }, null, 2));

    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log('');
  console.log('--- public essay URLs ---');
  for (const l of links) {
    console.log(l.url);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
