/**
 * Relaxed scholarship_detail autopilot (waves 21+ / 31+ with net-new guard).
 * Usage:
 *   npx tsx scripts/i18n/scholarship-detail-autopilot/run-relaxed-autopilot.ts --start-wave=31 --target=500 --wave-size=50
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

import { createClient } from '@supabase/supabase-js';

import { DATE, BASE, isDryRun, loadEnvLocal } from './env';
import { fetchTranslatedScholarshipDetailSourceIds } from './fetch-translated-source-ids';
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

function reportStage(startWave: number): string {
  if (startWave >= 81) return 'stage5e-14';
  if (startWave >= 41) return 'stage5e-12';
  if (startWave >= 31) return 'stage5e-11';
  return 'stage5e-9';
}

function reportPrefix(waveNum: number, stage: string) {
  return `i18n-${stage}-relaxed-wave-${waveNum}`;
}

function parseArgs() {
  const target = Math.min(
    10000,
    Number(process.argv.find((a) => a.startsWith('--target='))?.split('=')[1] ?? '500')
  );
  const waveSizeArg = Number(process.argv.find((a) => a.startsWith('--wave-size='))?.split('=')[1] ?? '0');
  const maxWaves = Number(process.argv.find((a) => a.startsWith('--max-waves='))?.split('=')[1] ?? '999');
  const startWave = Number(process.argv.find((a) => a.startsWith('--start-wave='))?.split('=')[1] ?? '21');
  const dryRunOnly = process.argv.includes('--dry-run-only');
  const requireFullWave = !process.argv.includes('--allow-partial-wave');
  return { target, waveSizeArg, maxWaves, startWave, dryRunOnly, requireFullWave };
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

function checkpointReportPath(startWave: number, endWave: number): string {
  if (startWave >= 81) {
    return join(
      process.cwd(),
      'reports/seo',
      `i18n-stage5e-14-waves-${startWave}-${endWave}-checkpoint-${DATE}.md`
    );
  }
  return join(
    process.cwd(),
    'reports/seo',
    `i18n-12hour-scholarship-autopilot-waves-${startWave}-${endWave}-checkpoint-${DATE}.md`
  );
}

async function writeCheckpoint(
  startWave: number,
  endWave: number,
  startEs: number,
  startFr: number,
  netNewSoFar: number
) {
  const es = await countSitemapEligibleEsScholarshipDetails();
  const fr = await countSitemapEligibleFrScholarshipDetails();
  const expectedEs = startEs + netNewSoFar;
  const expectedFr = startFr + netNewSoFar;
  const issues: string[] = [];
  if (es !== expectedEs) issues.push(`ES ${es} != expected ${expectedEs}`);
  if (fr !== expectedFr) issues.push(`FR ${fr} != expected ${expectedFr}`);
  if ((await fetch(`${BASE}/sitemap.xml`, { redirect: 'manual' })).status !== 200) {
    issues.push('sitemap index not 200');
  }

  let buildOk = true;
  try {
    execSync('npm run build', { stdio: 'pipe', cwd: process.cwd() });
    execSync('npx tsc --noEmit', { stdio: 'pipe', cwd: process.cwd() });
    execSync('npx tsx --test lib/i18n/__tests__/*.test.ts', { stdio: 'pipe', cwd: process.cwd() });
  } catch {
    buildOk = false;
    issues.push('build/tsc/tests failed');
  }

  const passed = !issues.length && buildOk;
  const title =
    startWave >= 81
      ? `Stage 5E-14 checkpoint waves ${startWave}–${endWave}`
      : `12-hour checkpoint waves ${startWave}–${endWave}`;
  const body = `# ${title} (${DATE})

| Metric | Value |
|--------|-------|
| Net-new scholarships (block) | ${netNewSoFar} |
| ES sitemap | ${es} (expected ${expectedEs}) |
| FR sitemap | ${fr} (expected ${expectedFr}) |
| Build/tsc/tests | ${buildOk ? 'pass' : 'FAIL'} |

## Verdict: **${passed ? 'PASS' : 'FAIL'}**

${issues.length ? issues.map((i) => `- ${i}`).join('\n') : '- no issues'}
`;
  const path = checkpointReportPath(startWave, endWave);
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  writeFileSync(path, body, 'utf8');
  console.log('[relaxed] checkpoint', path, passed ? 'PASS' : 'FAIL');
  if (!passed) throw new Error(`checkpoint ${startWave}-${endWave} failed: ${issues.join('; ')}`);
}

async function main() {
  const { target, waveSizeArg, maxWaves, startWave, dryRunOnly, requireFullWave } = parseArgs();
  const defaultWaveSize = Math.min(50, waveSizeArg || 50);
  const stage = reportStage(startWave);
  const netNewGuard = startWave >= 31;

  loadEnvLocal();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('[relaxed] start', { target, startWave, stage, netNewGuard, dryRun: isDryRun() });

  const startEs = await countSitemapEligibleEsScholarshipDetails();
  const startFr = await countSitemapEligibleFrScholarshipDetails();
  console.log('[relaxed] start sitemap-eligible', { es: startEs, fr: startFr });

  const audit = await auditTieredPool();
  const csvPath = join(
    process.cwd(),
    'reports/seo',
    `i18n-${stage}-scholarship-candidate-pool-expanded-${DATE}.csv`
  );
  writeTieredPoolCsv(audit.all, csvPath);
  console.log('[relaxed] tier counts', audit.tierCounts, 'publishable', audit.publishable.length);

  const allCandidates = await selectTieredCandidates(target + 100, defaultWaveSize);
  const publishableCount = audit.publishable.length;
  const effectiveTarget = Math.min(target, publishableCount);

  const summary = {
    wavesAttempted: 0,
    wavesAccepted: 0,
    scholarshipsAttempted: 0,
    netNewScholarships: 0,
    rowsAdded: 0,
    stoppedReason: '',
    openAiCost: 0,
    tierCounts: audit.tierCounts,
    publishablePool: publishableCount,
    startEs,
    startFr,
    waveNetNew: [] as { wave: number; netNew: number; esDelta: number; frDelta: number }[]
  };

  let currentEs = startEs;
  let currentFr = startFr;
  let candidateOffset = 0;

  while (summary.netNewScholarships < effectiveTarget && summary.wavesAttempted < maxWaves) {
    const waveNum = startWave + summary.wavesAttempted;
    const remaining = effectiveTarget - summary.netNewScholarships;
    const bucketPreview = allCandidates.slice(candidateOffset, candidateOffset + defaultWaveSize);
    const waveSize = Math.min(pickWaveSize(bucketPreview, defaultWaveSize), remaining, 50);
    const waveCandidates = allCandidates.slice(candidateOffset, candidateOffset + waveSize);
    if (!waveCandidates.length) {
      summary.stoppedReason = 'publishable pool exhausted';
      break;
    }

    const translatedBefore = await fetchTranslatedScholarshipDetailSourceIds(db);
    const dupes = waveCandidates.filter((c) => translatedBefore.has(c.scholarship_uuid));
    if (dupes.length) {
      summary.stoppedReason = `wave ${waveNum}: ${dupes.length} candidates already translated (${dupes.slice(0, 3).map((d) => d.slug).join(', ')})`;
      break;
    }
    const slugDupes = new Set(waveCandidates.map((c) => c.slug));
    if (slugDupes.size !== waveCandidates.length) {
      summary.stoppedReason = `wave ${waveNum}: duplicate slugs in candidate batch`;
      break;
    }
    if (requireFullWave && waveCandidates.length !== defaultWaveSize && remaining >= defaultWaveSize) {
      summary.stoppedReason = `wave ${waveNum}: expected ${defaultWaveSize} net-new candidates, got ${waveCandidates.length}`;
      break;
    }
  const invalidTier = waveCandidates.filter((c) => c.tier === 'C' || c.tier === 'D');
    if (invalidTier.length) {
      summary.stoppedReason = `wave ${waveNum}: Tier C/D in batch`;
      break;
    }

    candidateOffset += waveCandidates.length;
    summary.wavesAttempted++;

    const model = relaxedMachineModel(waveNum);
    const prefix = reportPrefix(waveNum, stage);
    const esBefore = currentEs;
    const frBefore = currentFr;
    const idsBefore = translatedBefore.size;

    console.log(
      `\n[relaxed] === wave ${waveNum} (${waveCandidates.length} net-new candidates, A=${waveCandidates.filter((c) => c.tier === 'A').length} B=${waveCandidates.filter((c) => c.tier === 'B').length}) ===`
    );

    let generated;
    try {
      generated = await generateWaveOverlays(waveCandidates, waveNum, { machineModel: model });
    } catch (e) {
      summary.stoppedReason = `wave ${waveNum} generate failed: ${e}`;
      break;
    }

    if (generated.rows.length !== waveCandidates.length * 2) {
      summary.stoppedReason = `wave ${waveNum} dry-run rows ${generated.rows.length} != ${waveCandidates.length * 2}`;
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
      summary.scholarshipsAttempted += waveCandidates.length;
      summary.netNewScholarships += waveCandidates.length;
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

    const translatedAfter = await fetchTranslatedScholarshipDetailSourceIds(db);
    const netNewIds = translatedAfter.size - idsBefore;
    if (netNewIds !== waveCandidates.length) {
      summary.stoppedReason = `wave ${waveNum}: net-new source_ids ${netNewIds} != ${waveCandidates.length}`;
      break;
    }

    currentEs = await countSitemapEligibleEsScholarshipDetails();
    currentFr = await countSitemapEligibleFrScholarshipDetails();
    const esDelta = currentEs - esBefore;
    const frDelta = currentFr - frBefore;

    if (netNewGuard && (esDelta !== waveCandidates.length || frDelta !== waveCandidates.length)) {
      summary.stoppedReason = `wave ${waveNum}: sitemap delta ES=${esDelta} FR=${frDelta} expected ${waveCandidates.length}`;
      break;
    }

    const smoke = await smokeWave(waveNum, waveCandidates, currentEs, currentFr);
    writeSmokeReport(waveNum, waveCandidates, smoke, publishResult.upserted, {
      reportPrefix: prefix,
      label: 'Relaxed autopilot',
      netNew: waveCandidates.length,
      esDelta,
      frDelta
    });

    if (!smoke.passed) {
      summary.stoppedReason = `wave ${waveNum} smoke failed: ${smoke.issues.slice(0, 5).join('; ')}`;
      break;
    }

    summary.wavesAccepted++;
    summary.scholarshipsAttempted += waveCandidates.length;
    summary.netNewScholarships += waveCandidates.length;
    summary.rowsAdded += publishResult.upserted;
    summary.waveNetNew.push({ wave: waveNum, netNew: waveCandidates.length, esDelta, frDelta });
    console.log(
      `[relaxed] wave ${waveNum} ACCEPTED net-new=${waveCandidates.length} ES ${esBefore}->${currentEs} FR ${frBefore}->${currentFr}`
    );

    if (summary.wavesAccepted % 2 === 0 && !isDryRun()) {
      try {
        runRegression();
      } catch {
        summary.stoppedReason = `regression failed after wave ${waveNum}`;
        break;
      }
    }

    if (
      startWave >= 41 &&
      summary.wavesAccepted > 0 &&
      summary.wavesAccepted % 10 === 0 &&
      !isDryRun()
    ) {
      const blockEnd = startWave + summary.wavesAccepted - 1;
      const blockStart = blockEnd - 9;
      try {
        await writeCheckpoint(
          blockStart,
          blockEnd,
          summary.startEs,
          summary.startFr,
          summary.netNewScholarships
        );
      } catch (e) {
        summary.stoppedReason = String(e);
        break;
      }
    }
  }

  if (!summary.stoppedReason) summary.stoppedReason = 'completed';

  const finalEs = await countSitemapEligibleEsScholarshipDetails();
  const finalFr = await countSitemapEligibleFrScholarshipDetails();

  const masterName =
    startWave >= 81
      ? `i18n-stage5e-14-large-scholarship-autopilot-master-report-${DATE}.md`
      : startWave >= 41
        ? `i18n-12hour-scholarship-autopilot-master-report-2026-05-24.md`
        : startWave >= 31
          ? `i18n-stage5e-11-relaxed-autopilot-wave31-plus-master-report-${DATE}.md`
          : `i18n-stage5e-9-scholarship-relaxed-autopilot-master-report-${DATE}.md`;
  const handoffName =
    startWave >= 81
      ? `i18n-stage5e-14-large-scholarship-autopilot-chatgpt-handoff-${DATE}.md`
      : startWave >= 41
        ? `i18n-12hour-scholarship-autopilot-chatgpt-handoff-2026-05-24.md`
        : startWave >= 31
          ? `i18n-stage5e-11-relaxed-autopilot-wave31-plus-chatgpt-handoff-${DATE}.md`
          : `i18n-stage5e-9-scholarship-relaxed-autopilot-chatgpt-handoff-${DATE}.md`;

  const masterPath = join(process.cwd(), 'reports/seo', masterName);
  const handoffPath = join(process.cwd(), 'reports/seo', handoffName);

  const master = `# ${stage.toUpperCase()} relaxed scholarship_detail autopilot — master report (${DATE})

## Summary

| Metric | Value |
|--------|-------|
| Start ES/FR sitemap | ${summary.startEs} / ${summary.startFr} |
| Final ES/FR sitemap | ${finalEs} / ${finalFr} |
| Sitemap net-new ES/FR | ${finalEs - summary.startEs} / ${finalFr - summary.startFr} |
| Target net-new scholarships | ${target} |
| Net-new scholarships | ${summary.netNewScholarships} |
| Rows added | ${summary.rowsAdded} |
| Waves attempted | ${summary.wavesAttempted} |
| Waves accepted | ${summary.wavesAccepted} |
| OpenAI cost | $${summary.openAiCost} |
| Stop reason | ${summary.stoppedReason} |

## Per-wave net-new

${summary.waveNetNew.map((w) => `- Wave ${w.wave}: net-new=${w.netNew}, ES+${w.esDelta}, FR+${w.frDelta}`).join('\n') || '- none'}

## Tier audit

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
`;

  const handoff = `# ${stage} relaxed autopilot handoff (${DATE})

Copy for ChatGPT:

- Start sitemap: ${summary.startEs}/${summary.startFr} ES/FR
- Final sitemap: ${finalEs}/${finalFr} ES/FR
- Net-new scholarships: ${summary.netNewScholarships} (${summary.rowsAdded} rows)
- Waves: ${summary.wavesAccepted}/${summary.wavesAttempted}
- OpenAI: $0
- Stop: ${summary.stoppedReason}
- Remaining Tier A pool: ~${Math.max(0, summary.publishablePool - summary.netNewScholarships)}
`;

  writeFileSync(masterPath, master, 'utf8');
  writeFileSync(handoffPath, handoff, 'utf8');
  console.log('\n[relaxed] done', summary, { finalEs, finalFr });
  console.log('Wrote', masterPath, handoffPath);

  if (summary.stoppedReason !== 'completed' && summary.stoppedReason !== 'target reached') {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
