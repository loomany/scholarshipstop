/**
 * Stage 5E-11 production baseline before Wave 31+.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { checkScholarshipDetailHtml } from '../../seo/i18n-scholarship-detail-html-check';

import { fetchTranslatedScholarshipDetailSourceIds } from './fetch-translated-source-ids';
import {
  countSitemapEligibleEsScholarshipDetails,
  countSitemapEligibleFrScholarshipDetails
} from './load-persisted-wave';
import { BASE, DATE, IQ, loadEnvLocal } from './env';

async function fetchStatus(path: string): Promise<number> {
  for (let i = 0; i < 4; i++) {
    try {
      return (await fetch(`${BASE}${path}`, { redirect: 'manual' })).status;
    } catch {
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  return 0;
}

async function fetchText(path: string): Promise<string> {
  for (let i = 0; i < 4; i++) {
    try {
      return await (await fetch(`${BASE}${path}`)).text();
    } catch {
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  return '';
}

async function main() {
  loadEnvLocal();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const issues: string[] = [];
  const esSitemap = await countSitemapEligibleEsScholarshipDetails();
  const frSitemap = await countSitemapEligibleFrScholarshipDetails();

  const { count: esDb } = await db
    .from('content_translations')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'scholarship_detail')
    .eq('locale', 'es')
    .eq('status', 'published');
  const { count: frDb } = await db
    .from('content_translations')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'scholarship_detail')
    .eq('locale', 'fr')
    .eq('status', 'published');

  const translatedIds = await fetchTranslatedScholarshipDetailSourceIds(db);

  const esXml = await fetchText('/sitemaps/locale-es-scholarships-detail-db.xml');
  const frXml = await fetchText('/sitemaps/locale-fr-scholarships-detail-db.xml');
  const liveEs = (esXml.match(/<loc>/g) ?? []).length;
  const liveFr = (frXml.match(/<loc>/g) ?? []).length;

  if (esSitemap !== 1201) issues.push(`eligible ES ${esSitemap} != 1201`);
  if (frSitemap !== 1201) issues.push(`eligible FR ${frSitemap} != 1201`);
  if (liveEs !== esSitemap) issues.push(`live ES ${liveEs} != eligible ${esSitemap}`);
  if (liveFr !== frSitemap) issues.push(`live FR ${liveFr} != eligible ${frSitemap}`);
  if (esXml.includes('/en/') || frXml.includes('review_required')) issues.push('sitemap has /en or review_required');
  if ((await fetchStatus('/en')) !== 404) issues.push('/en not 404');

  const { data: sampleRows } = await db
    .from('content_translations')
    .select('translated_slug')
    .eq('source_type', 'scholarship_detail')
    .eq('locale', 'es')
    .eq('status', 'published')
    .limit(30);
  for (const row of sampleRows ?? []) {
    const slug = String(row.translated_slug ?? '').trim();
    if (!slug) continue;
    const en = await fetchStatus(`/scholarships/${slug}`);
    const es = await fetchStatus(`/es/scholarships/${slug}`);
    const fr = await fetchStatus(`/fr/scholarships/${slug}`);
    if (en !== 200 || es !== 200 || fr !== 200) issues.push(`route ${slug} en=${en} es=${es} fr=${fr}`);
  }

  for (const slug of ['fake-pilot-slug-not-in-allowlist-xyz', 'nonexistent-autopilot-slug-qa-test-abc']) {
    if ((await fetchStatus(`/es/scholarships/${slug}`)) !== 404) issues.push(`unseeded es ${slug}`);
    if ((await fetchStatus(`/fr/scholarships/${slug}`)) !== 404) issues.push(`unseeded fr ${slug}`);
  }

  const htmlSlug = String(sampleRows?.[0]?.translated_slug ?? '').trim();
  if (htmlSlug) {
    for (const loc of ['es', 'fr'] as const) {
      const r = await checkScholarshipDetailHtml(loc, `/${loc}/scholarships/${htmlSlug}`);
      if (!r.ok) issues.push(`html ${r.path}: ${r.issues.join('; ')}`);
    }
  }

  if ((await fetchStatus('/es/scholarships/category/stem')) !== 200) issues.push('category ES fail');
  if ((await fetchStatus('/es/resources/how-to-apply-for-scholarships')) !== 200) issues.push('resource ES fail');
  if ((await fetchStatus('/es/providers/loyola-university-chicago')) !== 200) issues.push('provider ES fail');
  const iqHtml = await (await fetch(`${IQ}/es`)).text();
  if (!iqHtml.includes('data-iq-product-shell') && !iqHtml.includes('IQ-Style Score')) {
    issues.push('IQ markers missing');
  }

  const passed = issues.length === 0;
  const body = `# Stage 5E-11 — Wave 31+ baseline (${DATE})

## Counts

| Metric | Value |
|--------|-------|
| DB published ES rows | ${esDb ?? 0} |
| DB published FR rows | ${frDb ?? 0} |
| Distinct translated scholarships | ${translatedIds.size} |
| Sitemap-eligible ES | ${esSitemap} |
| Sitemap-eligible FR | ${frSitemap} |
| Live XML ES | ${liveEs} |
| Live XML FR | ${liveFr} |

## Verdict: **${passed ? 'PASS' : 'FAIL'}**

${issues.length ? issues.map((i) => `- ${i}`).join('\n') : '- no issues'}
`;

  const path = join(process.cwd(), 'reports/seo', `i18n-stage5e-11-wave31-plus-baseline-${DATE}.md`);
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  writeFileSync(path, body, 'utf8');
  console.log(JSON.stringify({ passed, esSitemap, frSitemap, liveEs, liveFr, distinct: translatedIds.size }, null, 2));
  console.log('Wrote', path);
  process.exit(passed ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
