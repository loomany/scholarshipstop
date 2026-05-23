/**
 * Generate scaleUpBatch11Slugs.ts from batch-11 candidates CSV.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const csvPath =
  process.argv[2] ??
  join(process.cwd(), 'reports/seo/i18n-stage5e-scholarship-detail-batch-11-candidates-2026-05-23.csv');

const slugs: string[] = [];
for (const line of readFileSync(csvPath, 'utf8').split(/\r?\n/).slice(1)) {
  if (!line.trim()) continue;
  const m = line.match(/^"11","([^"]+)"/);
  if (m) slugs.push(m[1]!.trim().toLowerCase());
}

if (slugs.length !== 10) {
  console.error(`Expected 10 slugs, got ${slugs.length}`);
  process.exit(1);
}

let out = `/** Auto-generated from ${csvPath.replace(/\\/g, '/').split('/').pop()} */\n\n`;
out += `export const SCHOLARSHIP_SCALEUP_BATCH_11_SLUGS = [\n`;
for (const s of slugs) {
  out += `  '${s.replace(/'/g, "\\'")}',\n`;
}
out += `] as const;\n\n`;
out += `export function scaleupBatch11Slugs(): readonly string[] {\n`;
out += `  return SCHOLARSHIP_SCALEUP_BATCH_11_SLUGS;\n`;
out += `}\n`;

const path = join(process.cwd(), 'lib/i18n/scholarshipPilot/scaleUpBatch11Slugs.ts');
writeFileSync(path, out, 'utf8');
console.log('Wrote', path, slugs.length);
