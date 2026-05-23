/**
 * Stage 5E-9 relaxed scholarship_detail autopilot (waves 21+).
 * Usage:
 *   npx tsx scripts/i18n/scholarship-detail-autopilot/run-relaxed-autopilot.ts --target=500 --start-wave=21
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

import { DATE, isDryRun, loadEnvLocal } from './env';
import { generateWaveOverlays } from './generate-overlays';
import { publishWave } from './publish-wave';
import {
  countSitemapEligibleEsScholarshipDetails,
  countSitemapEligibleFrScholarshipDetails
} from './load-persisted-wave';
import { auditTieredPool, selectTieredCandidates, writeTieredPoolCsv } from './select-candidates-tiered';
import { smokeWave, verifyDbWave, writeSmokeReport } from './smoke-wave';
import { validateWave, writeValidationReport } from './validate-overlays';
import type { AutopilotCandidate } from './types';

function relaxedMachineModel(waveNum: number) {
  return `stage5e-scholarship-autopilot-relaxed-wave-${waveNum}`;
}

function reportPrefix(waveNum: number) {
  return `i18n-stage5e-9-relaxed-wave-${waveNum}`;
}

function parseArgs() {
  const target = Math.min(
    1000,
    Number(process.argv.find((a) => a.startsWith('--target='))?.split('=')[1] ?? '500')
  );
  const waveSizeArg = Number(process.argv.find((a) => a.startsWith('--wave-size='))?.split('=')[1] ?? '0');
  const maxWaves = Number(process.argv.find((a) => a.startsWith('--max-waves='))?.split('=')[1] ?? '999');
  const startWave = Number(process.argv.find((a) => a.startsWith('--start-wave='))?.split('=')[1] ?? '21');
  const dryRunOnly = process.argv.includes('--dry-run-only');
  return { target, waveSizeArg, maxWaves, startWave, dryRunOnly };
}

function pickWaveSize(candidates: AutopilotCandidate[], defaultSize: number): number {
  if (!candidates.length) return defaultSize;
  const tierB = candidates.filter((c) => c.tier === 'B').length / candidates.length;
  return tierB > 0.4 ? 25 : defaultSize;
}

function runRegression() {
  console.log('[relaxed] regression: tsc + i18n tests');
  execSync('npx tsc --noEmit', { stdio: 'inherit', cwd: process.cwd() });
  execSync('npx tsx --test lib/i18n/__tests__/*.test.ts', { stdio: 'inherit', cwd: process.cwd() });
}

async function writeBaseline() {
  loadEnvLocal();
  const es = await countSitemapEligibleEsScholarshipDetails();
  const fr = await countSitemapEligibleFrScholarshipDetails();
  return { es, fr };
}

async function main() {
  const { target, waveSizeArg, maxWaves, startWave, dryRunOnly } = parseArgs();
  const defaultWaveSize = Math.min(50, waveSizeArg || 50);

  console.log('[relaxed] start', { target, startWave, dryRun: isDryRun() });

  const startCounts = await writeBaseline();
  console.log('[relaxed] start sitemap-eligible', startCounts);

  const audit = await auditTieredPool();
  const csvPath = join(
    process.cwd(),
    'reports/seo',
    `i18n-stage5e-9-scholarship-candidate-pool-expanded-${DATE}.csv`
  );
  writeTieredPoolCsv(audit.all, csvPath);
  console.log('[relaxed] tier counts', audit.tierCounts, 'publishable', audit.publishable.length);

  const allCandidates = await selectTieredCandidates(target + 100, defaultWaveSize);
  const publishableCount = audit.publishable.length;
  const effectiveTarget = Math.min(target, publishableCount);

  const summary = {
    wavesAttempted: 0,
    wavesAccepted: 0,
    scholarshipsAdded: 0,
    rowsAdded: 0,
    stoppedReason: '',
    openAiCost: 0,
    tierCounts: audit.tierCounts,
    publishablePool: publishableCount,
    startEs: startCounts.es,
    startFr: startCounts.fr
  };

  let currentEs = startCounts.es;
  let currentFr = startCounts.fr;
  let candidateOffset = 0;

  while (summary.scholarshipsAdded < effectiveTarget && summary.wavesAttempted < maxWaves) {
    const waveNum = startWave + summary.wavesAttempted;
    const remaining = effectiveTarget - summary.scholarshipsAdded;
    const bucketPreview = allCandidates.slice(candidateOffset, candidateOffset + defaultWaveSize);
    const waveSize = Math.min(
      pickWaveSize(bucketPreview, defaultWaveSize),
      remaining,
      50
    );
    const waveCandidates = allCandidates.slice(candidateOffset, candidateOffset + waveSize);
    if (!waveCandidates.length) {
      summary.stoppedReason = 'publishable pool exhausted';
      break;
    }
    candidateOffset += waveCandidates.length;
    summary.wavesAttempted++;

    const model = relaxedMachineModel(waveNum);
    const prefix = reportPrefix(waveNum);
    console.log(
      `\n[relaxed] === wave ${waveNum} (${waveCandidates.length} scholarships, tiers A=${waveCandidates.filter((c) => c.tier === 'A').length} B=${waveCandidates.filter((c) => c.tier === 'B').length}) ===`
    );

    let generated;
    try {
      generated = await generateWaveOverlays(waveCandidates, waveNum, { machineModel: model });
    } catch (e) {
      summary.stoppedReason = `wave ${waveNum} generate failed: ${e}`;
      break;
    }

    const validation = validateWave(generated, waveCandidates);
    writeValidationReport(waveNum, validation, validation.hardFails.length ? waveCandidates.map((c) => c.slug) : []);

    if (validation.failRate > 0.15) {
      summary.stoppedReason = `wave ${waveNum} validation fail rate ${(validation.failRate * 100).toFixed(1)}% > 15%`;
      break;
    }
    if (!validation.passed) {
      summary.stoppedReason = `wave ${waveNum} validation failed (${validation.hardFails.length} hard fails)`;
      break;
    }

    if (dryRunOnly) {
      summary.wavesAccepted++;
      summary.scholarshipsAdded += waveCandidates.length;
      continue;
    }

    let publishResult;
    try {
      publishResult = await publishWave(waveNum, generated, waveCandidates.length, { reportPrefix: prefix });
    } catch (e) {
      summary.stoppedReason = `wave ${waveNum} publish failed: ${e}`;
      break;
    }

    const dbIssues = await verifyDbWave(waveNum, waveCandidates.length * 2, model);
    if (dbIssues.length) {
      summary.stoppedReason = `wave ${waveNum} DB verify: ${dbIssues.join('; ')}`;
      break;
    }

    currentEs = await countSitemapEligibleEsScholarshipDetails();
    currentFr = await countSitemapEligibleFrScholarshipDetails();
    const smoke = await smokeWave(waveNum, waveCandidates, currentEs, currentFr);
    writeSmokeReport(waveNum, waveCandidates, smoke, publishResult.upserted, {
      reportPrefix: prefix,
      label: 'Relaxed autopilot'
    });

    if (!smoke.passed) {
      summary.stoppedReason = `wave ${waveNum} smoke failed: ${smoke.issues.slice(0, 5).join('; ')}`;
      break;
    }

    summary.wavesAccepted++;
    summary.scholarshipsAdded += waveCandidates.length;
    summary.rowsAdded += publishResult.upserted;
    console.log(`[relaxed] wave ${waveNum} ACCEPTED (ES ~${currentEs} FR ~${currentFr})`);

    if (summary.wavesAccepted % 2 === 0 && !isDryRun()) {
      try {
        runRegression();
      } catch {
        summary.stoppedReason = `regression failed after wave ${waveNum}`;
        break;
      }
    }
  }

  if (!summary.stoppedReason) summary.stoppedReason = 'completed';

  const finalEs = await countSitemapEligibleEsScholarshipDetails();
  const finalFr = await countSitemapEligibleFrScholarshipDetails();

  const masterPath = join(
    process.cwd(),
    'reports/seo',
    `i18n-stage5e-9-scholarship-relaxed-autopilot-master-report-${DATE}.md`
  );
  const handoffPath = join(
    process.cwd(),
    'reports/seo',
    `i18n-stage5e-9-scholarship-relaxed-autopilot-chatgpt-handoff-${DATE}.md`
  );

  const master = `# Stage 5E-9 relaxed scholarship_detail autopilot — master report (${DATE})

## Summary

| Metric | Value |
|--------|-------|
| Start ES/FR sitemap | ${summary.startEs} / ${summary.startFr} |
| Final ES/FR sitemap | ${finalEs} / ${finalFr} |
| Target scholarships | ${target} |
| Scholarships added | ${summary.scholarshipsAdded} |
| Rows added | ${summary.rowsAdded} |
| Waves attempted | ${summary.wavesAttempted} |
| Waves accepted | ${summary.wavesAccepted} |
| OpenAI cost | $${summary.openAiCost} |
| Stop reason | ${summary.stoppedReason} |

## Tier audit (untranslated indexable)

| Tier | Count |
|------|-------|
| A | ${summary.tierCounts.A} |
| B | ${summary.tierCounts.B} |
| C | ${summary.tierCounts.C} |
| D | ${summary.tierCounts.D} |
| Publishable A+B | ${summary.publishablePool} |

## Rollback per wave

\`\`\`sql
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model = 'stage5e-scholarship-autopilot-relaxed-wave-{N}';
\`\`\`

## Candidate pool CSV

\`${csvPath}\`
`;

  const handoff = `# Stage 5E-9 relaxed autopilot handoff (${DATE})

Copy for ChatGPT:

- Start: ${summary.startEs}/${summary.startFr} ES/FR sitemap-eligible scholarship_detail pages
- Added: ${summary.scholarshipsAdded} scholarships (${summary.rowsAdded} rows), waves ${summary.wavesAccepted}/${summary.wavesAttempted}
- Final: ${finalEs}/${finalFr} ES/FR sitemap counts
- Tier A/B pool remaining after run: ~${Math.max(0, summary.publishablePool - summary.scholarshipsAdded)}
- OpenAI: $0
- Stop: ${summary.stoppedReason}
- machine_model prefix: \`stage5e-scholarship-autopilot-relaxed-wave-N\`
`;

  writeFileSync(masterPath, master, 'utf8');
  writeFileSync(handoffPath, handoff, 'utf8');
  console.log('\n[relaxed] done', summary, { finalEs, finalFr });
  console.log('Wrote', masterPath, handoffPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
