/**
 * Find published autopilot rows excluded from scholarship detail sitemap list.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { listPublishedScholarshipDetailTranslations } from '@/lib/i18n/scholarshipPilot/listPublishedScholarshipDetailTranslations';
import { getTranslatedPageSeoDecision } from '@/lib/i18n/translationPolicy';

import { DATE, loadEnvLocal } from './env';
const MACHINE_PREFIX = 'stage5e-scholarship-autopilot-wave-';

type Reason = string;

function classify(
  row: {
    locale: string;
    status: string;
    quality_score: number | null;
    translated_title: string | null;
    translated_body: string | null;
    translated_summary: string | null;
    translated_slug: string | null;
  },
  slug: string | undefined,
  indexable: boolean | undefined
): Reason {
  if (!slug) return 'scholarship_join_missing';
  if (indexable === false) return 'scholarship_not_indexable';
  if (row.status !== 'published') return 'not_published';
  const score = row.quality_score;
  if (typeof score === 'number' && score < 85) return 'quality_below_85';
  const body = row.translated_body?.trim() ?? '';
  const summary = row.translated_summary?.trim() ?? '';
  if (!body && !summary) return 'empty_body_and_summary';
  if (!row.translated_title?.trim()) return 'empty_translated_title';
  const ts = row.translated_slug?.trim().toLowerCase();
  if (ts && ts !== slug) return 'translated_slug_mismatch';
  const decision = getTranslatedPageSeoDecision({
    sourceIndexable: true,
    translationStatus: 'published',
    qualityScore: score,
    hasLocalizedTitle: Boolean(row.translated_title?.trim()),
    hasLocalizedH1: Boolean(row.translated_title?.trim()),
    hasLocalizedBody: Boolean(body || summary),
    hasMixedLanguageRisk: false
  });
  if (!decision.includeInSitemap) return `seo_policy:${decision.reasons[0] ?? 'unknown'}`;
  return 'eligible';
}

async function main() {
  loadEnvLocal();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: rows, error } = await db
    .from('content_translations')
    .select(
      'source_id, locale, status, machine_model, quality_score, translated_title, translated_body, translated_summary, translated_slug'
    )
    .eq('source_type', 'scholarship_detail')
    .in('locale', ['es', 'fr'])
    .eq('status', 'published')
    .like('machine_model', `${MACHINE_PREFIX}%`);

  if (error) throw new Error(error.message);

  const esRows = (rows ?? []).filter((r) => r.locale === 'es');
  const sourceIds = [...new Set(esRows.map((r) => String(r.source_id)))];

  const slugById = new Map<string, string>();
  const indexableById = new Map<string, boolean>();
  for (let i = 0; i < sourceIds.length; i += 80) {
    const slice = sourceIds.slice(i, i + 80);
    const { data: sch } = await db.from('scholarships').select('id, slug, is_indexable').in('id', slice);
    for (const s of sch ?? []) {
      const id = String(s.id);
      slugById.set(id, String(s.slug ?? '').trim().toLowerCase());
      indexableById.set(id, s.is_indexable !== false);
    }
  }

  const listed = await listPublishedScholarshipDetailTranslations();
  const listedEs = new Set(listed.filter((r) => r.locale === 'es').map((r) => r.scholarshipSlug));

  const reasonCounts: Record<string, number> = {};
  const excludedSlugs: { slug: string; reason: Reason; waveLabel: string | null }[] = [];

  for (const row of esRows) {
    const slug = slugById.get(String(row.source_id));
    const reason = classify(row, slug, indexableById.get(String(row.source_id)));
    reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
    if (reason !== 'eligible' && slug && !listedEs.has(slug)) {
      const waveMatch = row.machine_model
        ? new RegExp('wave-(\\d+)$').exec(row.machine_model)
        : null;
      const waveNum = waveMatch?.[1] ?? null;
      excludedSlugs.push({
        slug,
        reason,
        waveLabel: waveNum ? 'wave-' + waveNum : null
      });
    }
  }

  const allPublishedEs = await db
    .from('content_translations')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'scholarship_detail')
    .eq('locale', 'es')
    .eq('status', 'published');

  console.log(
    JSON.stringify(
      {
        autopilotPublishedEs: esRows.length,
        allPublishedEs: allPublishedEs.count,
        listedEs: listedEs.size,
        gap: esRows.length - listedEs.size,
        reasonCounts,
        excludedSample: excludedSlugs.slice(0, 15)
      },
      null,
      2
    )
  );

  const excludedLines = excludedSlugs
    .slice(0, 30)
    .map((e) => '- ' + e.slug + ' (' + (e.waveLabel ?? '?') + '): ' + e.reason)
    .join('\n');

  const md =
    '# Sitemap eligibility gap audit (' +
    DATE +
    ')\n\n' +
    '- Autopilot published ES rows: ' +
    esRows.length +
    '\n' +
    '- All published ES rows: ' +
    (allPublishedEs.count ?? 0) +
    '\n' +
    '- Sitemap-listed ES: ' +
    listedEs.size +
    '\n' +
    '- Reason breakdown: ' +
    JSON.stringify(reasonCounts) +
    '\n\n## Excluded samples\n' +
    excludedLines +
    '\n';
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  writeFileSync(join(process.cwd(), 'reports/seo', `i18n-stage5e-7-sitemap-gap-audit-${DATE}.md`), md);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
