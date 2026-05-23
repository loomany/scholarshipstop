/**
 * Generate lib/i18n/scholarshipPilot/scaleUpBatchSlugs.ts from candidates CSV.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const csv = readFileSync(
  join(process.cwd(), 'reports/seo/i18n-10hour-scholarship-detail-candidates-2026-05-22.csv'),
  'utf8'
);
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

let out = `/** Auto-generated from i18n-10hour-scholarship-detail-candidates-2026-05-22.csv */\n\n`;
for (let b = 1; b <= 5; b++) {
  const slugs = byBatch.get(b) ?? [];
  const constName = `SCHOLARSHIP_SCALEUP_BATCH_${b}_SLUGS`;
  out += `export const ${constName} = [\n`;
  for (const s of slugs) {
    out += `  '${s.replace(/'/g, "\\'")}',\n`;
  }
  out += `] as const;\n\n`;
}
out += `export const SCHOLARSHIP_SCALEUP_BATCH_SLUGS = [\n`;
for (let b = 1; b <= 5; b++) {
  out += `  ...SCHOLARSHIP_SCALEUP_BATCH_${b}_SLUGS,\n`;
}
out += `] as const;\n\n`;
out += `export type ScholarshipScaleupBatchId = 1 | 2 | 3 | 4 | 5;\n\n`;
out += `export function scaleupBatchSlugs(batch: ScholarshipScaleupBatchId): readonly string[] {\n`;
out += `  switch (batch) {\n`;
for (let b = 1; b <= 5; b++) {
  out += `    case ${b}: return SCHOLARSHIP_SCALEUP_BATCH_${b}_SLUGS;\n`;
}
out += `    default: return [];\n`;
out += `  }\n}\n`;

const path = join(process.cwd(), 'lib/i18n/scholarshipPilot/scaleUpBatchSlugs.ts');
writeFileSync(path, out, 'utf8');
console.log('Wrote', path, Object.fromEntries([...byBatch].map(([k, v]) => [k, v.length])));
