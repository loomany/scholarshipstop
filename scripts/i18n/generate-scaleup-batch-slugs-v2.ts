/**
 * Generate scaleUpBatchSlugsV2.ts from next-candidates CSV (batches 6-10).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const csvPath =
  process.argv[2] ??
  join(process.cwd(), 'reports/seo/i18n-stage5e-scholarship-detail-next-candidates-2026-05-23.csv');

const csv = readFileSync(csvPath, 'utf8');
const byBatch = new Map<number, string[]>();
for (const line of csv.split(/\r?\n/).slice(1)) {
  if (!line.trim()) continue;
  const m = line.match(/^"(\d+)","([^"]+)"/);
  if (!m) continue;
  const batch = Number(m[1]);
  const slug = m[2]!.trim().toLowerCase();
  const list = byBatch.get(batch) ?? [];
  list.push(slug);
  byBatch.set(batch, list);
}

let out = `/** Auto-generated from ${csvPath.replace(/\\/g, '/').split('/').pop()} */\n\n`;
for (let b = 6; b <= 10; b++) {
  const slugs = byBatch.get(b) ?? [];
  const idx = b - 5;
  const constName = `SCHOLARSHIP_SCALEUP_BATCH_${idx}_SLUGS`;
  out += `/** Scale-up batch ${b} */\nexport const ${constName} = [\n`;
  for (const s of slugs) {
    out += `  '${s.replace(/'/g, "\\'")}',\n`;
  }
  out += `] as const;\n\n`;
}
out += `export const SCHOLARSHIP_SCALEUP_BATCH_V2_SLUGS = [\n`;
for (let b = 6; b <= 10; b++) {
  out += `  ...SCHOLARSHIP_SCALEUP_BATCH_${b - 5}_SLUGS,\n`;
}
out += `] as const;\n\n`;
out += `export type ScholarshipScaleupBatchV2Id = 1 | 2 | 3 | 4 | 5;\n\n`;
out += `/** @param batch Local index 1-5 maps to global batches 6-10 */\n`;
out += `export function scaleupBatchSlugsV2(batch: ScholarshipScaleupBatchV2Id): readonly string[] {\n`;
out += `  switch (batch) {\n`;
for (let i = 1; i <= 5; i++) {
  out += `    case ${i}: return SCHOLARSHIP_SCALEUP_BATCH_${i}_SLUGS;\n`;
}
out += `    default: return [];\n`;
out += `  }\n}\n\n`;
out += `export function globalBatchNumber(v2: ScholarshipScaleupBatchV2Id): number {\n  return v2 + 5;\n}\n`;

const path = join(process.cwd(), 'lib/i18n/scholarshipPilot/scaleUpBatchSlugsV2.ts');
writeFileSync(path, out, 'utf8');
console.log('Wrote', path, Object.fromEntries([...byBatch].map(([k, v]) => [k, v.length])));
