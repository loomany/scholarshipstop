/**
 * Production DB audit for one autopilot wave.
 * Usage: npx tsx scripts/i18n/scholarship-detail-autopilot/verify-wave-db.ts 1
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { DATE } from './env';
import { auditWaveInDb, loadPersistedWaveSlugs } from './load-persisted-wave';

async function main() {
  const wave = Number(process.argv[2] ?? '1');
  const audit = await auditWaveInDb(wave);
  const loaded = await loadPersistedWaveSlugs(wave);

  const report = {
    wave,
    machine_model: audit.machineModel,
    total: audit.total,
    es: audit.es,
    fr: audit.fr,
    distinctSourceIds: audit.distinctSourceIds,
    distinctSlugs: loaded.slugs.length,
    slugSource: loaded.source,
    statuses: audit.statuses,
    qualityScores: audit.qualityScores,
    qualityBelow85: audit.qualityBelow85,
    slugs: loaded.slugs
  };

  console.log(JSON.stringify({ ...report, slugs: `${report.slugs.length} slugs` }, null, 2));

  const md = `# Wave ${wave} DB audit (${DATE})

- machine_model: \`${audit.machineModel}\`
- total rows: **${audit.total}**
- ES: **${audit.es}**
- FR: **${audit.fr}**
- distinct source_id: **${audit.distinctSourceIds}**
- distinct slugs (${loaded.source}): **${loaded.slugs.length}**
- quality < 85: **${audit.qualityBelow85}**
- statuses: ${JSON.stringify(audit.statuses)}
- quality_score distribution: ${JSON.stringify(audit.qualityScores)}

## Slugs

${loaded.slugs.map((s) => `- \`${s}\``).join('\n')}
`;

  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const path = join(process.cwd(), 'reports/seo', `i18n-stage5e-6-autopilot-wave-${wave}-db-audit-${DATE}.md`);
  writeFileSync(path, md, 'utf8');
  console.log('Wrote', path);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
