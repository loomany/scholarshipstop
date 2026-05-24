/**
 * Post-wave production smoke (sample routes + sitemap).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { checkScholarshipDetailHtml } from '../../seo/i18n-scholarship-detail-html-check';

import { listPublishedScholarshipDetailTranslations } from '@/lib/i18n/scholarshipPilot/listPublishedScholarshipDetailTranslations';

import { BASE, DATE, IQ, loadEnvLocal } from './env';
import type { AutopilotCandidate } from './types';

async function fetchWithRetry(url: string, attempts = 4): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url, { redirect: 'manual' });
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

async function status(path: string) {
  const res = await fetchWithRetry(`${BASE}${path}`);
  return res.status;
}

function pickSample<T>(arr: T[], n: number): T[] {
  const out: T[] = [];
  const step = Math.max(1, Math.floor(arr.length / n));
  for (let i = 0; i < n && i * step < arr.length; i++) out.push(arr[i * step]!);
  return out;
}

export type SmokeResult = {
  passed: boolean;
  issues: string[];
  esCount: number;
  frCount: number;
  expectedCount: number;
};

function smokeSampleSizes(candidateCount: number) {
  if (candidateCount >= 100) {
    return { routes: 20, html: 10, sitemapSlugs: 8, unseeded: 10 };
  }
  return {
    routes: Math.min(10, candidateCount),
    html: Math.min(5, candidateCount),
    sitemapSlugs: 5,
    unseeded: 2
  };
}

export async function smokeWave(
  waveNum: number,
  candidates: AutopilotCandidate[],
  expectedTotalScholarships: number,
  expectedFrScholarships: number = expectedTotalScholarships
): Promise<SmokeResult> {
  const issues: string[] = [];
  const expectedCount = expectedTotalScholarships;
  const expectedFr = expectedFrScholarships;
  const sizes = smokeSampleSizes(candidates.length);

  const sample = pickSample(candidates, sizes.routes);
  for (const c of sample) {
    const en = await status(`/scholarships/${c.slug}`);
    const es = await status(`/es/scholarships/${c.slug}`);
    const fr = await status(`/fr/scholarships/${c.slug}`);
    if (en !== 200 || es !== 200 || fr !== 200) {
      issues.push(`route ${c.slug} en=${en} es=${es} fr=${fr}`);
    }
  }

  const unseeded = [
    'how-to-apply-for-a-scholarship-step-by-step',
    'fake-pilot-slug-not-in-allowlist-xyz',
    ...Array.from({ length: Math.max(0, sizes.unseeded - 2) }, (_, i) => `unseeded-wave-${waveNum}-${i}-xyz`)
  ];
  for (const slug of unseeded) {
    const es = await status(`/es/scholarships/${slug}`);
    const fr = await status(`/fr/scholarships/${slug}`);
    if (es !== 404 || fr !== 404) issues.push(`unseeded ${slug} es=${es} fr=${fr}`);
  }

  let esXml = '';
  let frXml = '';
  let esCount = 0;
  let frCount = 0;
  for (let attempt = 0; attempt < 8; attempt++) {
    esXml = await (await fetchWithRetry(`${BASE}/sitemaps/locale-es-scholarships-detail-db.xml`)).text();
    frXml = await (await fetchWithRetry(`${BASE}/sitemaps/locale-fr-scholarships-detail-db.xml`)).text();
    esCount = (esXml.match(/<loc>/g) ?? []).length;
    frCount = (frXml.match(/<loc>/g) ?? []).length;
    if (esCount === 0 || frCount === 0) {
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
      continue;
    }
    if (esCount >= expectedCount && frCount >= expectedFr) break;
    await new Promise((r) => setTimeout(r, 10000 * (attempt + 1)));
  }

  if (esCount === 0 || frCount === 0) {
    issues.push('sitemap empty after retries');
  } else if (esCount < expectedCount || frCount < expectedFr) {
    issues.push(`sitemap ES=${esCount} FR=${frCount} expected>=${expectedCount}/${expectedFr}`);
  }
  const listed = await listPublishedScholarshipDetailTranslations();
  const listedEs = new Set(
    listed.filter((r) => r.locale === 'es').map((r) => r.scholarshipSlug)
  );
  const listedFr = new Set(
    listed.filter((r) => r.locale === 'fr').map((r) => r.scholarshipSlug)
  );
  for (const c of sample.slice(0, sizes.sitemapSlugs)) {
    if (listedEs.has(c.slug) && !esXml.includes(`/es/scholarships/${c.slug}`)) {
      issues.push(`ES sitemap missing ${c.slug}`);
    }
    if (listedFr.has(c.slug) && !frXml.includes(`/fr/scholarships/${c.slug}`)) {
      issues.push(`FR sitemap missing ${c.slug}`);
    }
  }
  if ([esXml, frXml].some((x) => x.includes('/en/') || x.includes('review_required'))) {
    issues.push('sitemap has /en or review_required');
  }

  const htmlSample = pickSample(candidates, sizes.html);
  for (const c of htmlSample) {
    for (const loc of ['es', 'fr'] as const) {
      const r = await checkScholarshipDetailHtml(loc, `/${loc}/scholarships/${c.slug}`);
      if (!r.ok) issues.push(`html ${r.path}: ${r.issues.join('; ')}`);
    }
  }

  if (await status('/en') !== 404) issues.push('/en not 404');
  if (await status('/es/scholarships/category/stem') !== 200) issues.push('category ES fail');
  if (await status('/es/resources/how-to-apply-for-scholarships') !== 200) issues.push('resource ES fail');
  if (await status('/es/providers/loyola-university-chicago') !== 200) issues.push('provider ES fail');
  const iqEs = await fetch(`${IQ}/es`);
  const iqHtml = await iqEs.text();
  if (!iqHtml.includes('data-iq-product-shell') && !iqHtml.includes('IQ-Style Score')) {
    issues.push('IQ product markers missing');
  }

  return { passed: issues.length === 0, issues, esCount, frCount, expectedCount };
}

export function writeSmokeReport(
  waveNum: number,
  candidates: AutopilotCandidate[],
  smoke: SmokeResult,
  publishUpserted: number,
  options?: { reportPrefix?: string; label?: string; netNew?: number; esDelta?: number; frDelta?: number }
) {
  const prefix = options?.reportPrefix ?? `i18n-stage5e-6-autopilot-wave-${waveNum}`;
  const label = options?.label ?? 'Autopilot';
  const path = join(
    process.cwd(),
    'reports/seo',
    `${prefix}-seed-smoke-${DATE}.md`
  );
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const netBlock =
    options?.netNew != null
      ? `\n- Net-new scholarships: ${options.netNew}\n- Sitemap ES delta: +${options.esDelta ?? '?'}\n- Sitemap FR delta: +${options.frDelta ?? '?'}\n`
      : '';
  const body = `# ${label} wave ${waveNum} seed & smoke (${DATE})
${netBlock}
- Scholarships in wave: ${candidates.length}
- Rows upserted: ${publishUpserted}
- machine_model: \`stage5e-scholarship-autopilot-relaxed-wave-${waveNum}\`
- OpenAI: $0

## Sitemap

- ES: ${smoke.esCount} (expected >= ${smoke.expectedCount})
- FR: ${smoke.frCount} (expected >= ${smoke.expectedCount})

## Verdict: **${smoke.passed ? 'PASS' : 'FAIL'}**

${smoke.issues.length ? smoke.issues.map((i) => `- ${i}`).join('\n') : '- no issues'}
`;
  writeFileSync(path, body, 'utf8');
  return path;
}

export async function verifyDbWave(
  waveNum: number,
  expectedRows: number,
  machineModel?: string
): Promise<string[]> {
  loadEnvLocal();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const model = machineModel ?? `stage5e-scholarship-autopilot-wave-${waveNum}`;
  const { data } = await db
    .from('content_translations')
    .select('locale, status, quality_score')
    .eq('source_type', 'scholarship_detail')
    .eq('machine_model', model);

  const issues: string[] = [];
  const rows = data ?? [];
  if (rows.length !== expectedRows) issues.push(`DB rows ${rows.length} != ${expectedRows}`);
  const es = rows.filter((r) => r.locale === 'es').length;
  const fr = rows.filter((r) => r.locale === 'fr').length;
  if (es !== expectedRows / 2 || fr !== expectedRows / 2) {
    issues.push(`DB es=${es} fr=${fr}`);
  }
  if (rows.some((r) => r.status !== 'published')) issues.push('non-published in wave');
  if (rows.some((r) => (r.quality_score ?? 0) < 85)) issues.push('quality < 85 in wave');
  return issues;
}
