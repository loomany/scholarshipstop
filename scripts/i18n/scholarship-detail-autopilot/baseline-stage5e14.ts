/**
 * Stage 5E-14 large run baseline before wave 81+ (expect 3701/3701).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { fetchTranslatedScholarshipDetailSourceIds } from './fetch-translated-source-ids';
import {
  countSitemapEligibleEsScholarshipDetails,
  countSitemapEligibleFrScholarshipDetails
} from './load-persisted-wave';
import { BASE, DATE, IQ, loadEnvLocal } from './env';

const EXPECTED = 3701;

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

async function fetchTextUrl(url: string): Promise<string> {
  for (let i = 0; i < 4; i++) {
    try {
      return await (await fetch(url)).text();
    } catch {
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  return '';
}

function iqProductOk(html: string): boolean {
  return (
    html.includes('data-iq-product-shell') ||
    html.includes('data-iq-product-shell-locale=') ||
    html.includes('IQ-Style Score') ||
    html.includes('Puntuación tipo CI') ||
    html.includes('Test de CI online')
  );
}

async function main() {
  loadEnvLocal();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const issues: string[] = [];

  if ((await fetchStatus('/sitemap.xml')) !== 200) issues.push('sitemap index not 200');
  const esXml = await fetchText('/sitemaps/locale-es-scholarships-detail-db.xml');
  const frXml = await fetchText('/sitemaps/locale-fr-scholarships-detail-db.xml');
  if (!esXml) issues.push('ES detail sitemap fetch failed');
  if (!frXml) issues.push('FR detail sitemap fetch failed');

  const esEligible = await countSitemapEligibleEsScholarshipDetails();
  const frEligible = await countSitemapEligibleFrScholarshipDetails();
  const liveEs = (esXml.match(/<loc>/g) ?? []).length;
  const liveFr = (frXml.match(/<loc>/g) ?? []).length;
  const distinct = (await fetchTranslatedScholarshipDetailSourceIds(db)).size;

  if (esEligible !== EXPECTED) issues.push(`eligible ES ${esEligible} != ${EXPECTED}`);
  if (frEligible !== EXPECTED) issues.push(`eligible FR ${frEligible} != ${EXPECTED}`);
  if (liveEs !== EXPECTED) issues.push(`live ES ${liveEs} != ${EXPECTED}`);
  if (liveFr !== EXPECTED) issues.push(`live FR ${liveFr} != ${EXPECTED}`);
  if (esXml.includes('/en/') || frXml.includes('review_required')) issues.push('bad sitemap content');
  if ((await fetchStatus('/en')) !== 404) issues.push('/en not 404');

  const { data: samples } = await db
    .from('content_translations')
    .select('translated_slug')
    .eq('source_type', 'scholarship_detail')
    .eq('locale', 'es')
    .eq('status', 'published')
    .limit(30);
  for (const row of samples ?? []) {
    const slug = String(row.translated_slug ?? '').trim();
    if (!slug) continue;
    if ((await fetchStatus(`/scholarships/${slug}`)) !== 200) issues.push(`EN ${slug}`);
    if ((await fetchStatus(`/es/scholarships/${slug}`)) !== 200) issues.push(`ES ${slug}`);
    if ((await fetchStatus(`/fr/scholarships/${slug}`)) !== 200) issues.push(`FR ${slug}`);
  }

  for (let i = 0; i < 10; i++) {
    const slug = `unseeded-5e14-check-${i}-xyz`;
    if ((await fetchStatus(`/es/scholarships/${slug}`)) !== 404) issues.push(`unseeded es ${i}`);
    if ((await fetchStatus(`/fr/scholarships/${slug}`)) !== 404) issues.push(`unseeded fr ${i}`);
  }

  if ((await fetchStatus('/es/scholarships/category/stem')) !== 200) issues.push('category ES');
  if ((await fetchStatus('/es/resources/how-to-apply-for-scholarships')) !== 200) issues.push('resource ES');
  if ((await fetchStatus('/es/providers/loyola-university-chicago')) !== 200) issues.push('provider ES');
  if ((await fetchStatus('/es/scholarships')) !== 200) issues.push('ES hub');
  if ((await fetchStatus('/fr/scholarships')) !== 200) issues.push('FR hub');
  const iqEs = await fetchTextUrl(`${IQ}/es`);
  const iqFr = await fetchTextUrl(`${IQ}/fr`);
  if (!iqProductOk(iqEs)) issues.push(`IQ /es missing (len=${iqEs.length})`);
  if (!iqProductOk(iqFr)) issues.push(`IQ /fr missing (len=${iqFr.length})`);

  const passed = !issues.length;
  const body = `# Stage 5E-14 large run baseline (${DATE})

| Metric | Value |
|--------|-------|
| Expected ES/FR sitemap | ${EXPECTED} |
| Eligible ES/FR | ${esEligible} / ${frEligible} |
| Live XML ES/FR | ${liveEs} / ${liveFr} |
| Distinct translated scholarships | ${distinct} |

## Verdict: **${passed ? 'PASS' : 'FAIL'}**

${issues.length ? issues.map((i) => `- ${i}`).join('\n') : '- no issues'}
`;
  const path = join(process.cwd(), 'reports/seo', `i18n-stage5e-14-large-run-baseline-${DATE}.md`);
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  writeFileSync(path, body, 'utf8');
  console.log(JSON.stringify({ passed, esEligible, frEligible, liveEs, liveFr, distinct }, null, 2));
  process.exit(passed ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
