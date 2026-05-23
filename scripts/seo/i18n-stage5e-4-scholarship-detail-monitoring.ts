/**
 * Stage 5E-4 production monitoring (read-only, no DB writes).
 * Usage: npx tsx scripts/seo/i18n-stage5e-4-scholarship-detail-monitoring.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { SCHOLARSHIP_DETAIL_PILOT_SLUGS } from '@/lib/i18n/scholarshipPilot/scholarshipPilotSlugs';
import { checkScholarshipDetailHtml } from './i18n-scholarship-detail-html-check';

const BASE = (process.env.SMOKE_BASE_URL ?? 'https://scholarshiptop.com').replace(/\/$/, '');
const IQ = (process.env.IQ_SMOKE_BASE_URL ?? 'https://iq.scholarshiptop.com').replace(/\/$/, '');
const DATE = '2026-05-23';
const EXPECTED = 106;

const UNSEEDED = [
  'how-to-apply-for-a-scholarship-step-by-step',
  'fake-pilot-slug-not-in-allowlist-xyz',
  'nonexistent-scholarship-detail-gate-test-99999',
  'scholarship-application-guide-generic-404-test',
  'fully-funded-masters-scholarship-unseeded-gate'
];

const EN_FALLBACK = [
  'ScholarshipTop does not award this scholarship',
  'Use this page as a starting point and validate eligibility',
  'Before you apply, confirm on the provider'
];

function pickSample<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  const step = Math.max(1, Math.floor(copy.length / n));
  for (let i = 0; i < n && i * step < copy.length; i++) {
    out.push(copy[i * step]!);
  }
  while (out.length < n && copy.length) {
    const idx = Math.floor((out.length * 17) % copy.length);
    if (!out.includes(copy[idx]!)) out.push(copy[idx]!);
    else copy.splice(idx, 1);
  }
  return out.slice(0, n);
}

async function status(url: string) {
  const res = await fetch(url, { redirect: 'manual' });
  return res.status;
}

async function regressionCheck() {
  const checks: { label: string; path: string; expect: number; host?: 'iq'; altOk?: number[] }[] = [
    { label: 'main /en', path: '/en', expect: 404 },
    { label: 'main /es hub', path: '/es', expect: 200 },
    { label: 'main /fr hub', path: '/fr', expect: 200 },
    { label: 'category stem ES', path: '/es/scholarships/category/stem', expect: 200 },
    { label: 'category stem FR', path: '/fr/scholarships/category/stem', expect: 200 },
    { label: 'category hobbies ES', path: '/es/scholarships/hobbies', expect: 404 },
    { label: 'resource pilot ES', path: '/es/resources/how-to-apply-for-scholarships', expect: 200 },
    { label: 'resource pilot FR', path: '/fr/resources/how-to-apply-for-scholarships', expect: 200 },
    { label: 'provider pilot ES', path: '/es/providers/loyola-university-chicago', expect: 200 },
    { label: 'provider pilot FR', path: '/fr/providers/loyola-university-chicago', expect: 200 },
    { label: 'IQ /es', path: '/es', expect: 200, host: 'iq' },
    { label: 'IQ /fr', path: '/fr', expect: 200, host: 'iq' },
    { label: 'IQ /en', path: '/en', expect: 404, host: 'iq', altOk: [308] }
  ];
  const fails: string[] = [];
  for (const c of checks) {
    const origin = c.host === 'iq' ? IQ : BASE;
    const code = await status(`${origin}${c.path}`);
    const ok = code === c.expect || (c.altOk?.includes(code) ?? false);
    if (!ok) fails.push(`${c.label}: ${code} (expect ${c.expect})`);
  }
  const iqHtml = await (await fetch(`${IQ}/es`)).text();
  if (!iqHtml.includes('data-iq-product-shell') && !iqHtml.includes('IQ-Style Score')) {
    fails.push('IQ /es missing product shell markers');
  }
  return { fails, pass: fails.length === 0 };
}

async function main() {
  const slugs = [...SCHOLARSHIP_DETAIL_PILOT_SLUGS];
  const issues: string[] = [];

  const sitemapStatus = await status(`${BASE}/sitemap.xml`);
  const indexXml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const esXml = await (await fetch(`${BASE}/sitemaps/locale-es-scholarships-detail-db.xml`)).text();
  const frXml = await (await fetch(`${BASE}/sitemaps/locale-fr-scholarships-detail-db.xml`)).text();
  const esCount = (esXml.match(/<loc>/g) ?? []).length;
  const frCount = (frXml.match(/<loc>/g) ?? []).length;
  const sitemapBad =
    sitemapStatus !== 200 ||
    esCount !== EXPECTED ||
    frCount !== EXPECTED ||
    !indexXml.includes('locale-es-scholarships-detail-db') ||
    !indexXml.includes('locale-fr-scholarships-detail-db') ||
    [esXml, frXml].some((x) => x.includes('/en/')) ||
    ['review_required', 'draft'].some((m) => esXml.includes(m) || frXml.includes(m));

  if (sitemapStatus !== 200) issues.push(`sitemap.xml HTTP ${sitemapStatus}`);
  if (esCount !== EXPECTED) issues.push(`ES sitemap count ${esCount}`);
  if (frCount !== EXPECTED) issues.push(`FR sitemap count ${frCount}`);
  if ([esXml, frXml].some((x) => x.includes('/en/'))) issues.push('/en in detail sitemap');
  if (['review_required', 'draft'].some((m) => esXml.includes(m) || frXml.includes(m))) {
    issues.push('draft/review in sitemap');
  }

  const sampleSlugs = pickSample(slugs, 10);
  const routeSamples: { path: string; status: number }[] = [];
  const routeFails: string[] = [];
  for (const slug of sampleSlugs) {
    for (const loc of ['es', 'fr'] as const) {
      const path = `/${loc}/scholarships/${slug}`;
      const code = await status(`${BASE}${path}`);
      routeSamples.push({ path, status: code });
      if (code !== 200) routeFails.push(`${path} → ${code}`);
    }
  }

  const unseededFails: string[] = [];
  for (const slug of UNSEEDED) {
    for (const loc of ['es', 'fr'] as const) {
      const path = `/${loc}/scholarships/${slug}`;
      const code = await status(`${BASE}${path}`);
      routeSamples.push({ path, status: code });
      if (code !== 404) unseededFails.push(`${path} → ${code}`);
    }
  }

  const htmlChecks: Awaited<ReturnType<typeof checkScholarshipDetailHtml>>[] = [];
  const htmlSample = pickSample(slugs, 5);
  const enFallbackHits: string[] = [];
  for (const slug of htmlSample) {
    for (const loc of ['es', 'fr'] as const) {
      const path = `/${loc}/scholarships/${slug}`;
      const html = await checkScholarshipDetailHtml(loc, path);
      htmlChecks.push(html);
      if (!html.ok) {
        issues.push(`HTML ${path}: ${html.issues.join('; ')}`);
      }
      const res = await fetch(`${BASE}${path}`);
      const body = await res.text();
      if (EN_FALLBACK.some((m) => body.includes(m))) {
        enFallbackHits.push(path);
      }
    }
  }

  const regression = await regressionCheck();
  if (!regression.pass) {
    issues.push(...regression.fails.map((f) => `regression: ${f}`));
  }

  const allGreen =
    !sitemapBad &&
    routeFails.length === 0 &&
    unseededFails.length === 0 &&
    enFallbackHits.length === 0 &&
    regression.pass &&
    htmlChecks.every((h) => h.ok);

  const safeBatch11 = allGreen ? 'yes' : 'no';
  const nextBatchSize = allGreen ? 10 : 0;

  const report = `# Stage 5E-4 scholarship_detail monitoring (${DATE})

## Scope

Read-only production checks after Stage 5E-3 (106 pilots, batches 6–10). **No new seeds.**

## Verdict

| Question | Answer |
|----------|--------|
| **Safe to continue batch 11?** | **${safeBatch11}** |
| **Recommended next batch size** | **${nextBatchSize}** (${allGreen ? 'standard 10 scholarships / 20 rows' : 'pause until blockers resolved'}) |
| **Overall monitoring** | **${allGreen ? 'PASS' : 'FAIL'}** |

## Sitemap

| Check | Result |
|-------|--------|
| \`/sitemap.xml\` | HTTP **${sitemapStatus}** |
| Index lists ES detail-db | ${indexXml.includes('locale-es-scholarships-detail-db')} |
| Index lists FR detail-db | ${indexXml.includes('locale-fr-scholarships-detail-db')} |
| ES detail-db URLs | **${esCount}** (expected ${EXPECTED}) |
| FR detail-db URLs | **${frCount}** (expected ${EXPECTED}) |
| \`/en\` in detail XML | ${[esXml, frXml].some((x) => x.includes('/en/'))} |
| draft/review in XML | ${['review_required', 'draft'].some((m) => esXml.includes(m) || frXml.includes(m))} |

## Route sample (10 pilot slugs × ES/FR = 20 requests)

- Failures: **${routeFails.length}**
${routeFails.length ? routeFails.map((f) => `- ${f}`).join('\n') : '- none'}

Sample slugs: ${sampleSlugs.join(', ')}

## Unseeded gate (5 slugs × ES/FR)

- Failures: **${unseededFails.length}**
${unseededFails.length ? unseededFails.map((f) => `- ${f}`).join('\n') : '- none'}

Slugs: ${UNSEEDED.join(', ')}

## HTML sample (5 slugs × ES/FR)

| Path | OK | Notes |
|------|-----|-------|
${htmlChecks.map((h) => `| ${h.path} | ${h.ok ? 'yes' : 'no'} | ${h.ok ? 'canonical/hreflang/robots/overlay OK' : h.issues.join('; ')} |`).join('\n')}

## English body fallback

- Hits: **${enFallbackHits.length}**
${enFallbackHits.length ? enFallbackHits.map((p) => `- ${p}`).join('\n') : '- none detected on HTML sample'}

## Category / resource / provider / IQ regression

- **${regression.pass ? 'PASS' : 'FAIL'}**
${regression.fails.length ? regression.fails.map((f) => `- ${f}`).join('\n') : '- all checks green'}

## Railway / Cloudflare logs (5xx spike)

**Not queried live in this run** (no API token in CI script). Manual check recommended:

- Cloudflare Analytics → Errors by path containing \`/scholarships/\`
- Railway deploy logs around Stage 5E-3 deploy window (\`815633f\`, \`8973856\`)

Prior traffic audit: \`reports/cloudflare/scholarshiptop-traffic-audit-2026-05-21.md\` — no scholarship-detail-specific spike documented pre-scale.

**Assumption for verdict:** no observed 5xx in route/HTML sample (${routeFails.length + unseededFails.length} HTTP anomalies).

## Blockers

${issues.length ? issues.map((i) => `- ${i}`).join('\n') : '- none'}

## Commands re-run

\`\`\`bash
npx tsx scripts/seo/i18n-scholarship-detail-sitemap-verify.ts 106
$env:EXPECTED_DETAIL_SITEMAP='106'; npx tsx scripts/seo/i18n-stage5e-3-production-regression-smoke.ts
npx tsx scripts/seo/i18n-stage5e-4-scholarship-detail-monitoring.ts
\`\`\`
`;

  const out = join(process.cwd(), 'reports/seo', `i18n-stage5e-4-scholarship-detail-monitoring-${DATE}.md`);
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  writeFileSync(out, report, 'utf8');
  console.log('Wrote', out);
  console.log(JSON.stringify({ allGreen, safeBatch11, nextBatchSize, issues: issues.length }, null, 2));
  if (!allGreen) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
