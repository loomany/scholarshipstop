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
  countRelaxedWaveRows,
  countSitemapEligibleEsScholarshipDetails,
  countSitemapEligibleFrScholarshipDetails
} from './load-persisted-wave';
import { markWorkerFailed, markWorkerWaveAccepted, touchWorkerHeartbeat } from './worker-progress-state';
import { classifyRelaxedWaveInDb } from './worker-start-wave-guard';
import { auditTieredPool, selectTieredCandidates, writeTieredPoolCsv } from './select-candidates-tiered';
import { smokeWave, verifyDbWave, writeSmokeReport } from './smoke-wave';
import { validateWave, writeValidationReport } from './validate-overlays';
import type { AutopilotCandidate } from './types';

function relaxedMachineModel(waveNum: number) {
  return `stage5e-scholarship-autopilot-relaxed-wave-${waveNum}`;
}

function reportStage(startWave: number): string {
  if (startWave >= 161) return 'stage5e-15';
  if (startWave >= 81) return 'stage5e-14';
  if (startWave >= 41) return 'stage5e-12';
  if (startWave >= 31) return 'stage5e-11';
  return 'stage5e-9';
}

function reportPrefix(waveNum: number, stage: string, proofWave161 = false) {
  if (proofWave161 && waveNum === 161) return 'i18n-stage5e-15-wave-161-proof';
  return `i18n-${stage}-relaxed-wave-${waveNum}`;
}

function workerRunId(): string | undefined {
  return process.env.I18N_WORKER_RUN_ID?.trim() || undefined;
}

function forceStartWave(): boolean {
  return process.env.I18N_WORKER_FORCE_START_WAVE?.trim() === '1';
}

function parseArgs() {
  const envStart = process.env.I18N_WORKER_ACTUAL_START_WAVE?.trim();
  const cliStart = process.argv.find((a) => a.startsWith('--start-wave='))?.split('=')[1];
  const startWave = Number(envStart || cliStart || '21');
  const targetCap = startWave >= 161 ? 20000 : 10000;
  const target = Math.min(
    targetCap,
    Number(process.argv.find((a) => a.startsWith('--target='))?.split('=')[1] ?? '500')
  );
  const waveSizeArg = Number(process.argv.find((a) => a.startsWith('--wave-size='))?.split('=')[1] ?? '0');
  const maxWaves = Number(process.argv.find((a) => a.startsWith('--max-waves='))?.split('=')[1] ?? '999');
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

async function countSitemapWithRetry(label: string, attempts = 8): Promise<{ es: number; fr: number }> {
  let last = { es: 0, fr: 0 };
  for (let i = 0; i < attempts; i++) {
    const es = await countSitemapEligibleEsScholarshipDetails();
    const fr = await countSitemapEligibleFrScholarshipDetails();
    last = { es, fr };
    if (es > 0 && fr > 0) return last;
    console.warn(`[relaxed] ${label}: transient sitemap count es=${es} fr=${fr}, retry ${i + 1}/${attempts}`);
    await new Promise((r) => setTimeout(r, 5000 * (i + 1)));
  }
  return last;
}

function checkpointReportPath(stage: string, startWave: number, endWave: number): string {
  if (stage === 'stage5e-15') {
    return join(
      process.cwd(),
      'reports/seo',
      `i18n-stage5e-15-waves-${startWave}-${endWave}-checkpoint-${DATE}.md`
    );
  }
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
  stage: string,
  startWave: number,
  endWave: number,
  startEs: number,
  startFr: number,
  netNewSoFar: number,
  options?: { extendedProduction?: boolean }
) {
  const afterCp = await countSitemapWithRetry('checkpoint');
  const es = afterCp.es;
  const fr = afterCp.fr;
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

  if (options?.extendedProduction && stage === 'stage5e-15') {
    loadEnvLocal();
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: samples } = await db
      .from('content_translations')
      .select('translated_slug')
      .eq('source_type', 'scholarship_detail')
      .eq('locale', 'es')
      .eq('status', 'published')
      .limit(50);
    for (const row of samples ?? []) {
      const slug = String(row.translated_slug ?? '').trim();
      if (!slug) continue;
      for (const p of [`/scholarships/${slug}`, `/es/scholarships/${slug}`, `/fr/scholarships/${slug}`]) {
        const st = (await fetch(`${BASE}${p}`, { redirect: 'manual' })).status;
        if (st !== 200) issues.push(`sample ${p} ${st}`);
      }
    }
    for (let i = 0; i < 15; i++) {
      const slug = `unseeded-5e15-cp-${endWave}-${i}`;
      for (const loc of ['es', 'fr']) {
        const st = (await fetch(`${BASE}/${loc}/scholarships/${slug}`, { redirect: 'manual' })).status;
        if (st !== 404) issues.push(`unseeded ${loc} ${slug} ${st}`);
      }
    }
    if ((await fetch(`${BASE}/es/scholarships/category/stem`)).status !== 200) issues.push('category ES');
    if ((await fetch(`${BASE}/es/resources/how-to-apply-for-scholarships`)).status !== 200) {
      issues.push('resource ES');
    }
    if ((await fetch(`${BASE}/es/providers/loyola-university-chicago`)).status !== 200) {
      issues.push('provider ES');
    }
  }

  const passed = !issues.length && buildOk;
  const title =
    stage === 'stage5e-15'
      ? `Stage 5E-15 checkpoint waves ${startWave}–${endWave}`
      : startWave >= 81
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
  const path = checkpointReportPath(stage, startWave, endWave);
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  writeFileSync(path, body, 'utf8');
  console.log('[relaxed] checkpoint', path, passed ? 'PASS' : 'FAIL');
  if (!passed) throw new Error(`checkpoint ${startWave}-${endWave} failed: ${issues.join('; ')}`);
}

async function main() {
  const { target, waveSizeArg, maxWaves, startWave, dryRunOnly, requireFullWave } = parseArgs();
  const stage = reportStage(startWave);
  const defaultWaveSize = waveSizeArg > 0 ? waveSizeArg : 50;
  const maxWaveSizeCap = stage === 'stage5e-15' ? defaultWaveSize : Math.min(50, defaultWaveSize);
  const proofWave161 = stage === 'stage5e-15' && startWave === 161 && target <= 150;
  const netNewGuard = startWave >= 31;
  const logPath = join(
    process.cwd(),
    'reports/seo',
    stage === 'stage5e-15'
      ? `i18n-stage5e-15-wave150-autopilot-run-log-${DATE}.txt`
      : startWave >= 81
        ? `i18n-stage5e-14-large-autopilot-run-log-${DATE}.txt`
        : `i18n-relaxed-autopilot-run-log-${DATE}.txt`
  );

  loadEnvLocal();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('[relaxed] start', {
    target,
    startWave,
    stage,
    defaultWaveSize,
    maxWaveSizeCap,
    netNewGuard,
    logPath,
    dryRun: isDryRun()
  });

  const startCounts = await countSitemapWithRetry('start');
  const startEs = startCounts.es;
  const startFr = startCounts.fr;
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
    const tierAdjusted =
      stage === 'stage5e-15' ? defaultWaveSize : pickWaveSize(bucketPreview, defaultWaveSize);
    const waveSize = Math.min(tierAdjusted, remaining, maxWaveSizeCap);
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
    const preExistingRows = await countRelaxedWaveRows(waveNum);
    if (preExistingRows > 0 && !forceStartWave()) {
      const { classification } = await classifyRelaxedWaveInDb(waveNum, waveCandidates.length);
      if (classification === 'complete' || classification === 'polluted_valid') {
        console.log(
          `[relaxed] wave ${waveNum} skipped (${classification}, ${preExistingRows} rows already in DB)`
        );
        summary.wavesAccepted++;
        if (workerRunId()) {
          const afterCounts = await countSitemapWithRetry(`wave ${waveNum} skip-existing`);
          await markWorkerWaveAccepted({
            wave: waveNum,
            netNew: 0,
            sitemapEs: afterCounts.es,
            sitemapFr: afterCounts.fr,
            runId: workerRunId()
          });
        }
        continue;
      }
      summary.stoppedReason = `wave ${waveNum}: ${preExistingRows} existing rows (${classification}); manual audit required`;
      if (workerRunId()) {
        await markWorkerFailed({
          error: summary.stoppedReason,
          currentWave: waveNum,
          runId: workerRunId()
        });
      }
      break;
    }
    if (preExistingRows > 0 && forceStartWave()) {
      console.warn(`[relaxed] wave ${waveNum}: FORCE rerun with ${preExistingRows} existing rows`);
    }

    if (workerRunId()) {
      await touchWorkerHeartbeat(workerRunId());
    }
    const prefix = reportPrefix(waveNum, stage, proofWave161);
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

    const sourceIds = waveCandidates.map((c) => c.scholarship_uuid);
    const dbIssues = await verifyDbWave(
      waveNum,
      waveCandidates.length * 2,
      model,
      sourceIds
    );
    if (dbIssues.length) {
      summary.stoppedReason = `wave ${waveNum} DB verify: ${dbIssues.join('; ')}`;
      if (workerRunId()) {
        await markWorkerFailed({
          error: summary.stoppedReason,
          currentWave: waveNum,
          runId: workerRunId()
        });
      }
      break;
    }

    const translatedAfter = await fetchTranslatedScholarshipDetailSourceIds(db);
    const netNewIds = translatedAfter.size - idsBefore;
    if (netNewIds !== waveCandidates.length) {
      summary.stoppedReason = `wave ${waveNum}: net-new source_ids ${netNewIds} != ${waveCandidates.length}`;
      break;
    }

    const afterCounts = await countSitemapWithRetry(`wave ${waveNum} post-publish`);
    currentEs = afterCounts.es;
    currentFr = afterCounts.fr;
    const esDelta = currentEs - esBefore;
    const frDelta = currentFr - frBefore;

    if (
      netNewGuard &&
      (esDelta !== waveCandidates.length ||
        frDelta !== waveCandidates.length ||
        currentEs <= 0 ||
        currentFr <= 0)
    ) {
      summary.stoppedReason = `wave ${waveNum}: sitemap delta ES=${esDelta} FR=${frDelta} expected ${waveCandidates.length} (es=${currentEs} fr=${currentFr})`;
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

    if (workerRunId()) {
      await markWorkerWaveAccepted({
        wave: waveNum,
        netNew: waveCandidates.length,
        sitemapEs: currentEs,
        sitemapFr: currentFr,
        runId: workerRunId()
      });
    }

    if (stage !== 'stage5e-15' && summary.wavesAccepted % 2 === 0 && !isDryRun()) {
      try {
        runRegression();
      } catch {
        summary.stoppedReason = `regression failed after wave ${waveNum}`;
        break;
      }
    }

    if (stage === 'stage5e-15' && summary.wavesAccepted > 0 && summary.wavesAccepted % 5 === 0 && !isDryRun()) {
      const blockEnd = startWave + summary.wavesAccepted - 1;
      const blockStart = blockEnd - 4;
      try {
        runRegression();
        await writeCheckpoint(
          stage,
          blockStart,
          blockEnd,
          summary.startEs,
          summary.startFr,
          summary.netNewScholarships,
          { extendedProduction: summary.wavesAccepted % 10 === 0 }
        );
      } catch (e) {
        summary.stoppedReason = String(e);
        break;
      }
    } else if (
      startWave >= 41 &&
      startWave < 161 &&
      summary.wavesAccepted > 0 &&
      summary.wavesAccepted % 10 === 0 &&
      !isDryRun()
    ) {
      const blockEnd = startWave + summary.wavesAccepted - 1;
      const blockStart = blockEnd - 9;
      try {
        await writeCheckpoint(
          stage,
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

  const finalCounts = await countSitemapWithRetry('final');
  const finalEs = finalCounts.es;
  const finalFr = finalCounts.fr;

  const masterName =
    stage === 'stage5e-15'
      ? `i18n-stage5e-15-wave150-scholarship-autopilot-master-report-${DATE}.md`
      : startWave >= 81
      ? `i18n-stage5e-14-large-scholarship-autopilot-master-report-${DATE}.md`
      : startWave >= 41
        ? `i18n-12hour-scholarship-autopilot-master-report-2026-05-24.md`
        : startWave >= 31
          ? `i18n-stage5e-11-relaxed-autopilot-wave31-plus-master-report-${DATE}.md`
          : `i18n-stage5e-9-scholarship-relaxed-autopilot-master-report-${DATE}.md`;
  const handoffName =
    stage === 'stage5e-15'
      ? `i18n-stage5e-15-wave150-scholarship-autopilot-chatgpt-handoff-${DATE}.md`
      : startWave >= 81
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
