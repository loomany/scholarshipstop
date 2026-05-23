/**
 * Phase 1: QA all 56 live scholarship_detail pilots (DB, sitemap, routes, HTML sample).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

import { createClient } from '@supabase/supabase-js';

import { SCHOLARSHIP_DETAIL_PILOT_SLUGS_V1 } from '@/lib/i18n/scholarshipPilot/scholarshipPilotSlugs';
import { checkScholarshipDetailHtml } from './i18n-scholarship-detail-html-check';

const BASE = (process.env.SMOKE_BASE_URL ?? 'https://scholarshiptop.com').replace(/\/$/, '');
const DATE = '2026-05-23';
const EXPECTED = 56;

const UNSEEDED = [
  'how-to-apply-for-a-scholarship-step-by-step',
  'fake-pilot-slug-not-in-allowlist-xyz',
  'nonexistent-scholarship-detail-gate-test-99999'
];

function loadEnvLocal() {
  const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8').replace(/^\uFEFF/, '');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[t.slice(0, eq).trim()] = v;
  }
}

async function status(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  return res.status;
}

function pickSample<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]!);
  }
  return out;
}

async function main() {
  loadEnvLocal();
  const slugs = [...SCHOLARSHIP_DETAIL_PILOT_SLUGS_V1];
  if (slugs.length !== EXPECTED) {
    console.error(`Expected ${EXPECTED} slugs, got ${slugs.length}`);
    process.exit(1);
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: rows } = await db
    .from('content_translations')
    .select('locale, status, quality_score, machine_model')
    .eq('source_type', 'scholarship_detail');

  const all = rows ?? [];
  const dbSummary = {
    total: all.length,
    es: all.filter((r) => r.locale === 'es').length,
    fr: all.filter((r) => r.locale === 'fr').length,
    published: all.filter((r) => r.status === 'published').length,
    statuses: Object.fromEntries(
      [...new Set(all.map((r) => r.status))].map((s) => [s, all.filter((r) => r.status === s).length])
    ),
    quality_below_85: all.filter((r) => (r.quality_score ?? 0) < 85).length,
    machine_models: Object.fromEntries(
      [...new Set(all.map((r) => r.machine_model).filter(Boolean))].map((m) => [
        m,
        all.filter((r) => r.machine_model === m).length
      ])
    )
  };

  const indexXml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const esXml = await (await fetch(`${BASE}/sitemaps/locale-es-scholarships-detail-db.xml`)).text();
  const frXml = await (await fetch(`${BASE}/sitemaps/locale-fr-scholarships-detail-db.xml`)).text();
  const esCount = (esXml.match(/<loc>/g) ?? []).length;
  const frCount = (frXml.match(/<loc>/g) ?? []).length;

  const sitemapIssues: string[] = [];
  if (!indexXml.includes('locale-es-scholarships-detail-db')) sitemapIssues.push('index missing ES bucket');
  if (!indexXml.includes('locale-fr-scholarships-detail-db')) sitemapIssues.push('index missing FR bucket');
  if (esCount !== EXPECTED) sitemapIssues.push(`ES count ${esCount} != ${EXPECTED}`);
  if (frCount !== EXPECTED) sitemapIssues.push(`FR count ${frCount} != ${EXPECTED}`);
  if ([esXml, frXml].some((x) => x.includes('/en/'))) sitemapIssues.push('/en in sitemap');
  if (['review_required', 'draft'].some((m) => esXml.includes(m) || frXml.includes(m))) {
    sitemapIssues.push('draft/review in sitemap');
  }

  const routeFails: string[] = [];
  const concurrency = 8;
  for (let i = 0; i < slugs.length; i += concurrency) {
    const chunk = slugs.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (slug) => {
        const en = await status(`/scholarships/${slug}`);
        const es = await status(`/es/scholarships/${slug}`);
        const fr = await status(`/fr/scholarships/${slug}`);
        if (en !== 200 || es !== 200 || fr !== 200) {
          routeFails.push(`${slug} en=${en} es=${es} fr=${fr}`);
        }
      })
    );
    process.stdout.write(`\rRoutes ${Math.min(i + concurrency, slugs.length)}/${slugs.length}`);
  }
  console.log('');

  for (const slug of UNSEEDED) {
    const es = await status(`/es/scholarships/${slug}`);
    const fr = await status(`/fr/scholarships/${slug}`);
    if (es !== 404 || fr !== 404) {
      routeFails.push(`unseeded ${slug} es=${es} fr=${fr}`);
    }
  }

  const htmlSample = pickSample(slugs, 10);
  const htmlResults: Awaited<ReturnType<typeof checkScholarshipDetailHtml>>[] = [];
  for (const slug of htmlSample) {
    for (const loc of ['es', 'fr'] as const) {
      htmlResults.push(await checkScholarshipDetailHtml(loc, `/${loc}/scholarships/${slug}`));
    }
  }
  const htmlFails = htmlResults.filter((r) => !r.ok);

  const qaPass =
    dbSummary.total === 112 &&
    dbSummary.es === EXPECTED &&
    dbSummary.fr === EXPECTED &&
    dbSummary.published === 112 &&
    dbSummary.quality_below_85 === 0 &&
    sitemapIssues.length === 0 &&
    routeFails.length === 0 &&
    htmlFails.length === 0;

  const report = `# Stage 5E current 56 scholarship_detail QA (${DATE})

## Verdict: ${qaPass ? '**PASS**' : '**FAIL**'}

## DB (scholarship_detail)

\`\`\`json
${JSON.stringify(dbSummary, null, 2)}
\`\`\`

## Sitemap

| Check | Result |
|-------|--------|
| ES URLs | ${esCount} (expected ${EXPECTED}) |
| FR URLs | ${frCount} (expected ${EXPECTED}) |
| index ES bucket | ${indexXml.includes('locale-es-scholarships-detail-db')} |
| index FR bucket | ${indexXml.includes('locale-fr-scholarships-detail-db')} |
| /en in XML | ${[esXml, frXml].some((x) => x.includes('/en/'))} |
| draft/review | ${['review_required', 'draft'].some((m) => esXml.includes(m) || frXml.includes(m))} |

${sitemapIssues.length ? `Issues: ${sitemapIssues.join('; ')}` : ''}

## Route smoke (all ${EXPECTED} slugs × EN/ES/FR)

- Failures: **${routeFails.length}**
${routeFails.length ? routeFails.map((f) => `- ${f}`).join('\n') : '- none'}

## Unseeded gate (3 slugs → 404 ES/FR)

${UNSEEDED.map((s) => `- \`${s}\``).join('\n')}

## HTML spot-check (${htmlSample.length} slugs × ES/FR)

- Failures: **${htmlFails.length}**
${htmlFails.length ? htmlFails.map((r) => `- ${r.path}: ${r.issues.join('; ')}`).join('\n') : '- none'}

Sample slugs: ${htmlSample.join(', ')}
`;

  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const path = join(process.cwd(), 'reports/seo', `i18n-stage5e-current-56-scholarship-detail-qa-${DATE}.md`);
  writeFileSync(path, report, 'utf8');
  console.log('Wrote', path);
  console.log(JSON.stringify({ qaPass, dbSummary, esCount, frCount, routeFails: routeFails.length, htmlFails: htmlFails.length }, null, 2));
  if (!qaPass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
