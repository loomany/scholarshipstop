/**
 * Route + sitemap smoke for one batch; writes markdown report.
 * Usage: npx tsx scripts/seo/i18n-scholarship-detail-batch-smoke-report.ts 3
 * Env: SMOKE_BASE_URL, REPORT_DATE=2026-05-23, LEGACY_PILOT_COUNT=6
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { scaleupBatchSlugs, type ScholarshipScaleupBatchId } from '@/lib/i18n/scholarshipPilot/scaleUpBatchSlugs';
import { scaleupBatch11Slugs } from '@/lib/i18n/scholarshipPilot/scaleUpBatch11Slugs';
import { scaleupBatchSlugsV2 } from '@/lib/i18n/scholarshipPilot/scaleUpBatchSlugsV2';

const BASE = (process.env.SMOKE_BASE_URL ?? 'https://scholarshiptop.com').replace(/\/$/, '');
const DATE = process.env.REPORT_DATE ?? '2026-05-23';
const LEGACY = Number(process.env.LEGACY_PILOT_COUNT ?? '6');

const UNSEEDED = [
  'how-to-apply-for-a-scholarship-step-by-step',
  'fake-pilot-slug-not-in-allowlist-xyz'
];

function slugsForBatch(batch: number): readonly string[] {
  if (batch <= 5) return scaleupBatchSlugs(batch as ScholarshipScaleupBatchId);
  if (batch === 11) return scaleupBatch11Slugs();
  if (batch >= 6 && batch <= 10) return scaleupBatchSlugsV2((batch - 5) as 1 | 2 | 3 | 4 | 5);
  return [];
}

function expectedSitemapTotal(batch: number): number {
  return LEGACY + batch * 10;
}

async function status(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  return res.status;
}

async function main() {
  const batchNum = Number(process.argv[2]);
  if (!Number.isFinite(batchNum) || batchNum < 1 || batchNum > 11) {
    console.error('Usage: batch number 1-11');
    process.exit(1);
  }

  const slugs = slugsForBatch(batchNum);
  if (slugs.length !== 10) {
    console.error(`Batch ${batchNum} must have 10 slugs, got ${slugs.length}`);
    process.exit(1);
  }

  const expectedTotal = expectedSitemapTotal(batchNum);
  const machineModel = `stage5e-scholarship-manual-batch-${batchNum}`;
  const lines: string[] = [];
  let failed = 0;

  lines.push(`# Stage 5E scholarship detail batch ${batchNum} — seed & smoke (${DATE})\n`);
  lines.push(`- machine_model: \`${machineModel}\``);
  lines.push(`- Expected cumulative sitemap URLs per locale: **${expectedTotal}**\n`);

  lines.push('## Route smoke (batch slugs)\n');
  lines.push('| slug | EN | ES | FR |');
  lines.push('|------|----|----|-----|');

  for (const slug of slugs) {
    const en = await status(`/scholarships/${slug}`);
    const es = await status(`/es/scholarships/${slug}`);
    const fr = await status(`/fr/scholarships/${slug}`);
    const ok = en === 200 && es === 200 && fr === 200;
    if (!ok) failed++;
    lines.push(`| \`${slug.slice(0, 48)}…\` | ${en} | ${es} | ${fr} |`);
  }

  lines.push('\n## Unseeded gate\n');
  for (const slug of UNSEEDED) {
    const es = await status(`/es/scholarships/${slug}`);
    const fr = await status(`/fr/scholarships/${slug}`);
    const ok = es === 404 && fr === 404;
    if (!ok) failed++;
    lines.push(`- \`${slug}\`: ES=${es} FR=${fr} ${ok ? 'OK' : 'FAIL'}`);
  }

  const esXml = await (await fetch(`${BASE}/sitemaps/locale-es-scholarships-detail-db.xml`)).text();
  const frXml = await (await fetch(`${BASE}/sitemaps/locale-fr-scholarships-detail-db.xml`)).text();
  const esCount = (esXml.match(/<loc>/g) ?? []).length;
  const frCount = (frXml.match(/<loc>/g) ?? []).length;

  lines.push('\n## Sitemap\n');
  lines.push(`- ES URLs: ${esCount} (expect >= ${expectedTotal})`);
  lines.push(`- FR URLs: ${frCount} (expect >= ${expectedTotal})`);

  if (esCount < expectedTotal || frCount < expectedTotal) failed++;
  for (const slug of slugs) {
    if (!esXml.includes(`/es/scholarships/${slug}`)) {
      failed++;
      lines.push(`- FAIL ES sitemap missing ${slug}`);
    }
    if (!frXml.includes(`/fr/scholarships/${slug}`)) {
      failed++;
      lines.push(`- FAIL FR sitemap missing ${slug}`);
    }
  }
  if ([esXml, frXml].some((x) => x.includes('/en/') || x.includes('review_required'))) {
    failed++;
    lines.push('- FAIL /en or review_required in sitemap');
  }

  lines.push(`\n## Verdict: ${failed === 0 ? '**PASS**' : `**FAIL** (${failed} issues)`}\n`);

  const reportPath = join(
    process.cwd(),
    'reports/seo',
    `i18n-stage5e-scholarship-detail-batch-${batchNum}-seed-smoke-${DATE}.md`
  );
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  writeFileSync(reportPath, lines.join('\n'), 'utf8');
  console.log('Wrote', reportPath);
  if (failed) process.exit(1);
  console.log('Batch smoke passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
