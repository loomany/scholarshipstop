/**
 * Post-seed smoke for one scale-up batch.
 * Usage: npx tsx scripts/seo/i18n-scholarship-detail-batch-smoke.ts 1
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { scaleupBatchSlugs, type ScholarshipScaleupBatchId } from '@/lib/i18n/scholarshipPilot/scaleUpBatchSlugs';
import {
  scaleupBatchSlugsV2,
  type ScholarshipScaleupBatchV2Id
} from '@/lib/i18n/scholarshipPilot/scaleUpBatchSlugsV2';

const BASE = (process.env.SMOKE_BASE_URL ?? 'https://scholarshiptop.com').replace(/\/$/, '');
const LEGACY = Number(process.env.LEGACY_PILOT_COUNT ?? '6');
const batchNum = Number(process.argv[2] ?? '1');
const expectedEsTotal = LEGACY + batchNum * 10;
const expectedFrTotal = expectedEsTotal;

function slugsForBatch(batch: number): readonly string[] {
  if (batch >= 1 && batch <= 5) return scaleupBatchSlugs(batch as ScholarshipScaleupBatchId);
  if (batch >= 6 && batch <= 10) {
    return scaleupBatchSlugsV2((batch - 5) as ScholarshipScaleupBatchV2Id);
  }
  return [];
}

async function status(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  return res.status;
}

async function main() {
  if (!Number.isFinite(batchNum) || batchNum < 1 || batchNum > 10) {
    console.error('Usage: batch number 1-10');
    process.exit(1);
  }
  const slugs = slugsForBatch(batchNum);
  let failed = 0;

  for (const slug of slugs) {
    const en = await status(`/scholarships/${slug}`);
    const es = await status(`/es/scholarships/${slug}`);
    const fr = await status(`/fr/scholarships/${slug}`);
    if (en !== 200 || es !== 200 || fr !== 200) {
      failed++;
      console.error(`FAIL ${slug} en=${en} es=${es} fr=${fr}`);
    } else {
      console.log(`OK   ${slug}`);
    }
  }

  const unseededEs = await status('/es/scholarships/how-to-apply-for-a-scholarship-step-by-step');
  const unseededFr = await status('/fr/scholarships/how-to-apply-for-a-scholarship-step-by-step');
  if (unseededEs !== 404 || unseededFr !== 404) {
    failed++;
    console.error(`FAIL unseeded gate es=${unseededEs} fr=${unseededFr}`);
  } else {
    console.log('OK   unseeded 404');
  }

  const esXml = await (await fetch(`${BASE}/sitemaps/locale-es-scholarships-detail-db.xml`)).text();
  const frXml = await (await fetch(`${BASE}/sitemaps/locale-fr-scholarships-detail-db.xml`)).text();
  const esCount = (esXml.match(/<loc>/g) ?? []).length;
  const frCount = (frXml.match(/<loc>/g) ?? []).length;
  console.log(`ES sitemap URLs: ${esCount} (expect >= ${expectedEsTotal})`);
  console.log(`FR sitemap URLs: ${frCount} (expect >= ${expectedFrTotal})`);
  if (esCount < expectedEsTotal || frCount < expectedFrTotal) failed++;

  for (const slug of slugs) {
    if (!esXml.includes(`/es/scholarships/${slug}`)) {
      failed++;
      console.error(`FAIL ES sitemap missing ${slug}`);
    }
    if (!frXml.includes(`/fr/scholarships/${slug}`)) {
      failed++;
      console.error(`FAIL FR sitemap missing ${slug}`);
    }
  }

  if ([esXml, frXml].some((x) => x.includes('/en/') || x.includes('review_required'))) {
    failed++;
    console.error('FAIL sitemap has /en/ or review_required');
  }

  if (failed) {
    console.error(`\n${failed} failure(s)`);
    process.exit(1);
  }
  console.log('\nBatch smoke passed.');
}

main();
