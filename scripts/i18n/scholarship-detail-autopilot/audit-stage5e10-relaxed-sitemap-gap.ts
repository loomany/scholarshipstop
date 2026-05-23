/**
 * Stage 5E-10 — audit relaxed waves 21–30 DB vs sitemap eligibility.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { listPublishedScholarshipDetailTranslations } from '@/lib/i18n/scholarshipPilot/listPublishedScholarshipDetailTranslations';
import { getTranslatedPageSeoDecision } from '@/lib/i18n/translationPolicy';

import { BASE, DATE, loadEnvLocal } from './env';

const RELAXED_PREFIX = 'stage5e-scholarship-autopilot-relaxed-wave-';
const WAVES = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30];

function waveFromModel(model: string | null): number | null {
  const m = model?.match(/relaxed-wave-(\d+)$/);
  return m ? Number(m[1]) : null;
}

function escapeCsv(v: string | number | boolean) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

type Row = {
  source_id: string;
  locale: string;
  status: string | null;
  quality_score: number | null;
  translated_title: string | null;
  translated_body: string | null;
  translated_summary: string | null;
  translated_slug: string | null;
  machine_model: string | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function sitemapEligibleReason(
  row: Row,
  slug: string | undefined,
  indexable: boolean | undefined
): { eligible: boolean; reason: string } {
  if (!slug) return { eligible: false, reason: 'scholarship_join_missing' };
  if (indexable === false) return { eligible: false, reason: 'source_not_indexable' };
  if (row.status !== 'published') return { eligible: false, reason: 'not_published' };
  if ((row.quality_score ?? 0) < 85) return { eligible: false, reason: 'quality_below_85' };
  const body = row.translated_body?.trim() ?? '';
  const summary = row.translated_summary?.trim() ?? '';
  if (!body && !summary) return { eligible: false, reason: 'empty_body_and_summary' };
  const ts = row.translated_slug?.trim().toLowerCase();
  if (ts && ts !== slug) return { eligible: false, reason: 'translated_slug_mismatch' };

  const decision = getTranslatedPageSeoDecision({
    sourceIndexable: true,
    translationStatus: 'published',
    qualityScore: row.quality_score,
    hasLocalizedTitle: Boolean(row.translated_title?.trim()),
    hasLocalizedH1: Boolean(row.translated_title?.trim()),
    hasLocalizedBody: Boolean(body || summary),
    hasMixedLanguageRisk: false
  });
  if (!decision.includeInSitemap) {
    return { eligible: false, reason: `seo_policy:${decision.reasons[0] ?? 'unknown'}` };
  }
  return { eligible: true, reason: '' };
}

function listEligibleReason(row: Row, slug: string | undefined, indexable: boolean | undefined): string {
  if (!slug) return 'list:scholarship_join_missing';
  if (indexable === false) return 'list:source_not_indexable';
  if ((row.quality_score ?? 0) < 85) return 'list:quality_below_85';
  const body = row.translated_body?.trim() ?? '';
  const summary = row.translated_summary?.trim() ?? '';
  if (!body && !summary) return 'list:empty_body_and_summary';
  const ts = row.translated_slug?.trim().toLowerCase();
  if (ts && ts !== slug) return 'list:translated_slug_mismatch';
  return 'list:eligible';
}

async function fetchStatus(path: string): Promise<number> {
  try {
    const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
    return res.status;
  } catch {
    return 0;
  }
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
      'source_id, locale, status, quality_score, translated_title, translated_body, translated_summary, translated_slug, machine_model, published_at, created_at, updated_at'
    )
    .eq('source_type', 'scholarship_detail')
    .in('locale', ['es', 'fr'])
    .like('machine_model', `${RELAXED_PREFIX}%`);

  if (error) throw new Error(error.message);
  const allRows = (rows ?? []) as Row[];

  const byWave: Record<number, Row[]> = {};
  for (const w of WAVES) byWave[w] = [];
  for (const row of allRows) {
    const w = waveFromModel(row.machine_model);
    if (w && byWave[w]) byWave[w].push(row);
  }

  const waveSummary: Record<number, object> = {};
  for (const w of WAVES) {
    const wr = byWave[w]!;
    const sourceIds = new Set(wr.map((r) => r.source_id));
    waveSummary[w] = {
      total: wr.length,
      es: wr.filter((r) => r.locale === 'es').length,
      fr: wr.filter((r) => r.locale === 'fr').length,
      distinctScholarships: sourceIds.size,
      emptyTitle: wr.filter((r) => !r.translated_title?.trim()).length,
      emptyBody: wr.filter((r) => !r.translated_body?.trim() && !r.translated_summary?.trim()).length,
      status: Object.fromEntries(
        [...new Set(wr.map((r) => r.status ?? 'null'))].map((s) => [
          s,
          wr.filter((r) => r.status === s).length
        ])
      )
    };
  }

  const sourceIds = [...new Set(allRows.map((r) => String(r.source_id)))];
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
  const listedFr = new Set(listed.filter((r) => r.locale === 'fr').map((r) => r.scholarshipSlug));

  const esXml = await (await fetch(`${BASE}/sitemaps/locale-es-scholarships-detail-db.xml`)).text();
  const frXml = await (await fetch(`${BASE}/sitemaps/locale-fr-scholarships-detail-db.xml`)).text();
  const liveEsCount = (esXml.match(/<loc>/g) ?? []).length;
  const liveFrCount = (frXml.match(/<loc>/g) ?? []).length;

  const csvLines: string[] = [
    'wave,locale,slug,source_id,status,quality_score,has_translated_title,has_translated_body,source_indexable,slug_resolved,sitemap_eligible_yes_no,missing_reason,route_status,list_eligible_reason,in_live_xml'
  ];

  const reasonCounts: Record<string, number> = {};
  let eligibleEs = 0;
  let eligibleFr = 0;
  const missingByWave: Record<number, number> = {};

  for (const w of WAVES) {
    missingByWave[w] = 0;
    for (const row of byWave[w]!) {
      const slug = slugById.get(String(row.source_id));
      const indexable = indexableById.get(String(row.source_id));
      const { eligible, reason } = sitemapEligibleReason(row, slug, indexable);
      const listReason = listEligibleReason(row, slug, indexable);
      if (eligible && row.locale === 'es') eligibleEs++;
      if (eligible && row.locale === 'fr') eligibleFr++;

      const missing = reason || 'eligible';
      if (!eligible) {
        reasonCounts[missing] = (reasonCounts[missing] ?? 0) + 1;
        missingByWave[w] = (missingByWave[w] ?? 0) + 1;
      }

      const inXml =
        slug &&
        ((row.locale === 'es' && esXml.includes(`/es/scholarships/${slug}`)) ||
          (row.locale === 'fr' && frXml.includes(`/fr/scholarships/${slug}`)));

      let routeStatus = '';
      if (slug && !eligible) {
        const loc = row.locale;
        routeStatus = String(await fetchStatus(`/${loc}/scholarships/${slug}`));
      } else if (slug && eligible && !inXml) {
        routeStatus = 'eligible_not_in_xml';
      } else if (slug && eligible && inXml) {
        routeStatus = '200';
      }

      csvLines.push(
        [
          w,
          row.locale,
          slug ?? '',
          row.source_id,
          row.status ?? '',
          row.quality_score ?? '',
          Boolean(row.translated_title?.trim()) ? 'yes' : 'no',
          Boolean(row.translated_body?.trim() || row.translated_summary?.trim()) ? 'yes' : 'no',
          indexable === false ? 'no' : 'yes',
          slug ? 'yes' : 'no',
          eligible ? 'yes' : 'no',
          missing,
          routeStatus,
          listReason,
          inXml ? 'yes' : 'no'
        ]
          .map(escapeCsv)
          .join(',')
      );
    }
  }

  const distinctScholarships = new Set(allRows.map((r) => r.source_id)).size;
  const csvPath = join(
    process.cwd(),
    'reports/seo',
    `i18n-stage5e-10-relaxed-waves-21-30-sitemap-gap-audit-${DATE}.csv`
  );
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  writeFileSync(csvPath, csvLines.join('\n') + '\n', 'utf8');

  const summary = {
    dbTotalRows: allRows.length,
    dbEs: allRows.filter((r) => r.locale === 'es').length,
    dbFr: allRows.filter((r) => r.locale === 'fr').length,
    distinctScholarships,
    eligibleEsRows: eligibleEs,
    eligibleFrRows: eligibleFr,
    listedEs: listedEs.size,
    listedFr: listedFr.size,
    liveEsCount,
    liveFrCount,
    reasonCounts,
    missingByWave,
    waveSummary
  };

  console.log(JSON.stringify(summary, null, 2));
  writeFileSync(
    join(process.cwd(), 'reports/seo', `i18n-stage5e-10-audit-summary-${DATE}.json`),
    JSON.stringify(summary, null, 2),
    'utf8'
  );
  console.log('Wrote', csvPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
