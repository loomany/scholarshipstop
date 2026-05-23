/**
 * Compare DB published rows vs listPublishedScholarshipDetailTranslations output.
 */
import { createClient } from '@supabase/supabase-js';

import { listPublishedScholarshipDetailTranslations } from '@/lib/i18n/scholarshipPilot/listPublishedScholarshipDetailTranslations';

import { loadEnvLocal } from './env';
import { loadPersistedWaveSlugs } from './load-persisted-wave';

async function main() {
  const wave = Number(process.argv[2] ?? '3');
  loadEnvLocal();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { slugs } = await loadPersistedWaveSlugs(wave);
  const listed = await listPublishedScholarshipDetailTranslations();
  const listedSlugs = new Set(listed.map((r) => r.scholarshipSlug));

  const missing: string[] = [];
  const reasons: Record<string, string> = {};

  for (const slug of slugs) {
    if (listedSlugs.has(slug)) continue;
    missing.push(slug);

    const { data: sch } = await db.from('scholarships').select('id, slug, is_indexable').eq('slug', slug).maybeSingle();
    const { data: rows } = await db
      .from('content_translations')
      .select('locale, status, quality_score, translated_slug, translated_body, translated_summary')
      .eq('source_type', 'scholarship_detail')
      .eq('source_id', sch?.id ?? '')
      .in('locale', ['es', 'fr']);

    if (!sch) reasons[slug] = 'scholarship row missing';
    else if (sch.is_indexable === false) reasons[slug] = 'is_indexable=false';
    else if (!rows?.length) reasons[slug] = 'no translation rows';
    else {
      const es = rows.find((r) => r.locale === 'es');
      const ts = es?.translated_slug?.trim().toLowerCase();
      if (ts && ts !== slug) reasons[slug] = `translated_slug mismatch: ${ts}`;
      else if (!es?.translated_body?.trim() && !es?.translated_summary?.trim())
        reasons[slug] = 'empty body/summary';
      else reasons[slug] = 'unknown (check listPublished filters)';
    }
  }

  console.log(
    JSON.stringify(
      {
        wave,
        waveSlugs: slugs.length,
        listedTotal: listed.length,
        listedEs: listed.filter((r) => r.locale === 'es').length,
        missingFromList: missing.length,
        sampleReasons: Object.fromEntries(Object.entries(reasons).slice(0, 10))
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
