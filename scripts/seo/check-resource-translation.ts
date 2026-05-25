/**
 * Diagnose why /es/resources/{slug} returns 404.
 * Usage: npx tsx scripts/seo/check-resource-translation.ts usa-geology-scholarships
 */
import { config } from 'dotenv';

config({ path: '.env.local' });

const slug = (process.argv[2] ?? 'usa-geology-scholarships').trim().toLowerCase();

function routable(row: {
  status: string;
  quality_score: number | null;
  translated_title: string | null;
  translated_body: string | null;
}): boolean {
  if (row.status !== 'published') return false;
  const score = row.quality_score;
  if (typeof score === 'number' && score < 85) return false;
  return Boolean(row.translated_title?.trim() && row.translated_body?.trim());
}

async function main() {
  const { createPublicClient } = await import('@/utils/supabase/public');
  const supabase = createPublicClient();
  if (!supabase) {
    console.log('❌ Supabase client unavailable (.env.local)');
    process.exit(1);
  }

  const { data: post, error: postErr } = await supabase
    .from('content_posts')
    .select('id, slug, status')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (postErr || !post?.id) {
    console.log(`❌ No published content_posts row for slug "${slug}"`);
    process.exit(1);
  }
  console.log(`✓ EN article exists: id=${post.id}`);

  for (const locale of ['es', 'fr'] as const) {
    const { data: anyRow } = await supabase
      .from('content_translations')
      .select('status, quality_score, translated_title, translated_body')
      .eq('source_type', 'resource_article')
      .eq('source_id', post.id)
      .eq('locale', locale)
      .maybeSingle();

    if (!anyRow) {
      console.log(`❌ ${locale}: no content_translations row — create & publish translation`);
      continue;
    }

    if (routable(anyRow as Parameters<typeof routable>[0])) {
      console.log(
        `✓ ${locale}: routable (quality=${anyRow.quality_score}, title=${String(anyRow.translated_title).slice(0, 50)}…)`
      );
    } else {
      const title = String(anyRow.translated_title ?? '').trim();
      const body = String(anyRow.translated_body ?? '').trim();
      console.log(
        `❌ ${locale}: row exists but not routable — status=${anyRow.status}, quality=${anyRow.quality_score}, hasTitle=${Boolean(title)}, hasBody=${Boolean(body)}`
      );
      console.log(
        '   Route needs: status=published, quality_score>=85, non-empty translated_title & translated_body'
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
