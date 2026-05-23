/**
 * Stage 5E-9 QA — verify current scholarship_detail 1001/1001 before relaxed waves.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { checkScholarshipDetailHtml } from '../../seo/i18n-scholarship-detail-html-check';

import { listPublishedScholarshipDetailTranslations } from '@/lib/i18n/scholarshipPilot/listPublishedScholarshipDetailTranslations';

import { BASE, DATE, IQ, loadEnvLocal } from './env';

async function fetchWithRetry(path: string, attempts = 4): Promise<Response> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(`${BASE}${path}`, { redirect: 'manual' });
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw last;
}

async function fetchStatus(path: string): Promise<number> {
  const res = await fetchWithRetry(path);
  return res.status;
}

async function main() {
  loadEnvLocal();
  const issues: string[] = [];
  const expected = 1001;

  const indexStatus = await fetchStatus('/sitemap.xml');
  if (indexStatus !== 200) issues.push(`/sitemap.xml ${indexStatus}`);

  const esXml = await (await fetchWithRetry('/sitemaps/locale-es-scholarships-detail-db.xml')).text();
  const frXml = await (await fetchWithRetry('/sitemaps/locale-fr-scholarships-detail-db.xml')).text();
  const esCount = (esXml.match(/<loc>/g) ?? []).length;
  const frCount = (frXml.match(/<loc>/g) ?? []).length;

  if (esCount !== expected) issues.push(`ES count ${esCount} != ${expected}`);
  if (frCount !== expected) issues.push(`FR count ${frCount} != ${expected}`);
  if (esXml.includes('/en/') || frXml.includes('/en/') || esXml.includes('review_required')) {
    issues.push('sitemap has /en or review_required');
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: published } = await db
    .from('content_translations')
    .select('translated_slug, locale')
    .eq('source_type', 'scholarship_detail')
    .eq('status', 'published')
    .in('locale', ['es', 'fr'])
    .limit(5000);

  const esSlugs = [...new Set((published ?? []).filter((r) => r.locale === 'es').map((r) => r.translated_slug))];
  const sampleSlugs = esSlugs.filter(Boolean).slice(0, 30) as string[];

  for (const slug of sampleSlugs) {
    const en = await fetchStatus(`/scholarships/${slug}`);
    const es = await fetchStatus(`/es/scholarships/${slug}`);
    const fr = await fetchStatus(`/fr/scholarships/${slug}`);
    if (en !== 200 || es !== 200 || fr !== 200) {
      issues.push(`route ${slug} en=${en} es=${es} fr=${fr}`);
    }
  }

  const unseeded = [
    'how-to-apply-for-a-scholarship-step-by-step',
    'fake-pilot-slug-not-in-allowlist-xyz',
    'nonexistent-autopilot-slug-qa-test-abc',
    'another-unseeded-slug-qa-xyz-123',
    'third-unseeded-slug-qa-456',
    'fourth-unseeded-slug-qa-789',
    'fifth-unseeded-slug-qa-000',
    'sixth-unseeded-slug-qa-111',
    'seventh-unseeded-slug-qa-222',
    'eighth-unseeded-slug-qa-333'
  ];
  for (const slug of unseeded) {
    const es = await fetchStatus(`/es/scholarships/${slug}`);
    const fr = await fetchStatus(`/fr/scholarships/${slug}`);
    if (es !== 404 || fr !== 404) issues.push(`unseeded ${slug} es=${es} fr=${fr}`);
  }

  const htmlSample = sampleSlugs.slice(0, 5);
  for (const slug of htmlSample) {
    for (const loc of ['es', 'fr'] as const) {
      const r = await checkScholarshipDetailHtml(loc, `/${loc}/scholarships/${slug}`);
      if (!r.ok) issues.push(`html ${r.path}: ${r.issues.join('; ')}`);
    }
  }

  if ((await fetchStatus('/en')) !== 404) issues.push('/en not 404');
  if ((await fetchStatus('/es')) !== 200) issues.push('/es hub fail');
  if ((await fetchStatus('/fr')) !== 200) issues.push('/fr hub fail');
  if ((await fetchStatus('/es/scholarships/category/stem')) !== 200) issues.push('category ES fail');
  if ((await fetchStatus('/es/resources/how-to-apply-for-scholarships')) !== 200) issues.push('resource ES fail');
  if ((await fetchStatus('/es/providers/loyola-university-chicago')) !== 200) issues.push('provider ES fail');
  const iqEs = await fetch(`${IQ}/es`);
  const iqHtml = await iqEs.text();
  if (!iqHtml.includes('data-iq-product-shell') && !iqHtml.includes('IQ-Style Score')) {
    issues.push('IQ product markers missing');
  }

  const listed = await listPublishedScholarshipDetailTranslations();
  const passed = issues.length === 0;

  const body = `# Stage 5E-9 — current scholarship_detail QA (${DATE})

## Expected baseline: ${expected} ES / ${expected} FR

| Check | Result |
|-------|--------|
| /sitemap.xml | ${indexStatus} |
| ES detail sitemap | ${esCount} |
| FR detail sitemap | ${frCount} |
| Sample routes (30) | ${sampleSlugs.length} checked |
| Unseeded (10) | checked |
| HTML spot-check (5×2) | checked |
| /en | ${await fetchStatus('/en')} |
| Regressions | category/resource/provider/IQ |

## Verdict: **${passed ? 'PASS' : 'FAIL'}**

${issues.length ? issues.map((i) => `- ${i}`).join('\n') : '- no issues'}

Published translations in DB sample: ${listed.length} listed rows fetched.
`;

  const path = join(
    process.cwd(),
    'reports/seo',
    `i18n-stage5e-9-current-1001-scholarship-detail-qa-${DATE}.md`
  );
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  writeFileSync(path, body, 'utf8');
  console.log(JSON.stringify({ passed, esCount, frCount, issues }, null, 2));
  console.log('Wrote', path);
  process.exit(passed ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
