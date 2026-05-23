/**
 * Full published scholarship_detail ES gap: DB vs sitemap list.
 */
import { createClient } from '@supabase/supabase-js';

import { listPublishedScholarshipDetailTranslations } from '@/lib/i18n/scholarshipPilot/listPublishedScholarshipDetailTranslations';

import { loadEnvLocal } from './env';

async function main() {
  loadEnvLocal();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: rows } = await db
    .from('content_translations')
    .select('source_id, locale, machine_model, translated_title, translated_body, translated_summary, translated_slug, quality_score')
    .eq('source_type', 'scholarship_detail')
    .eq('locale', 'es')
    .eq('status', 'published');

  const listed = await listPublishedScholarshipDetailTranslations();
  const listedEs = new Set(listed.filter((r) => r.locale === 'es').map((r) => r.scholarshipSlug));

  const ids = [...new Set((rows ?? []).map((r) => String(r.source_id)))];
  const slugById = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 80) {
    const { data: sch } = await db.from('scholarships').select('id, slug, is_indexable').in('id', ids.slice(i, i + 80));
    for (const s of sch ?? []) slugById.set(String(s.id), String(s.slug ?? '').trim().toLowerCase());
  }

  const gaps: { slug: string; machine_model: string | null; emptyTitle: boolean; emptyBody: boolean }[] = [];
  for (const row of rows ?? []) {
    const slug = slugById.get(String(row.source_id));
    if (!slug || listedEs.has(slug)) continue;
    gaps.push({
      slug,
      machine_model: row.machine_model,
      emptyTitle: !String(row.translated_title ?? '').trim(),
      emptyBody: !row.translated_body?.trim() && !row.translated_summary?.trim()
    });
  }

  const byModel: Record<string, number> = {};
  for (const g of gaps) {
    const k = g.machine_model ?? 'null';
    byModel[k] = (byModel[k] ?? 0) + 1;
  }

  console.log(
    JSON.stringify(
      {
        publishedEs: rows?.length ?? 0,
        listedEs: listedEs.size,
        gap: (rows?.length ?? 0) - listedEs.size,
        emptyTitleInGap: gaps.filter((g) => g.emptyTitle).length,
        emptyBodyInGap: gaps.filter((g) => g.emptyBody).length,
        byMachineModel: byModel,
        sample: gaps.slice(0, 20)
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
