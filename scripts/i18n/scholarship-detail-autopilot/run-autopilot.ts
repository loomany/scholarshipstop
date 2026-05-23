/**
 * Scholarship detail autopilot orchestrator.
 * Usage:
 *   npx tsx scripts/i18n/scholarship-detail-autopilot/run-autopilot.ts --target=500 --wave-size=50
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

import { createClient } from '@supabase/supabase-js';

import { DATE, isDryRun, loadEnvLocal } from './env';
import { generateWaveOverlays } from './generate-overlays';
import { publishWave } from './publish-wave';
import { loadPersistedWaveSlugs, slugsToSmokeCandidates } from './load-persisted-wave';
import { selectCandidates } from './select-candidates';
import { smokeWave, verifyDbWave, writeSmokeReport } from './smoke-wave';
import { validateWave, writeValidationReport } from './validate-overlays';
import type { AutopilotCandidate } from './types';

const STARTING_SCHOLARSHIPS = 116;

function parseArgs() {
  const target = Math.min(
    1000,
    Number(process.argv.find((a) => a.startsWith('--target='))?.split('=')[1] ?? '500')
  );
  const waveSize = Math.min(
    50,
    Number(process.argv.find((a) => a.startsWith('--wave-size='))?.split('=')[1] ?? '50')
  );
  const maxWaves = Number(process.argv.find((a) => a.startsWith('--max-waves='))?.split('=')[1] ?? '999');
  const startWave = Number(process.argv.find((a) => a.startsWith('--start-wave='))?.split('=')[1] ?? '1');
  const dryRunOnly = process.argv.includes('--dry-run-only');
  const smokeOnlyWave = Number(process.argv.find((a) => a.startsWith('--smoke-only-wave='))?.split('=')[1] ?? '0');
  return { target, waveSize, maxWaves, startWave, dryRunOnly, smokeOnlyWave };
}

async function writeBaseline() {
  loadEnvLocal();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await db
    .from('content_translations')
    .select('locale, status, quality_score, machine_model')
    .eq('source_type', 'scholarship_detail');

  const rows = data ?? [];
  const es = rows.filter((r) => r.locale === 'es').length;
  const fr = rows.filter((r) => r.locale === 'fr').length;

  const body = `# Stage 5E-6 autopilot baseline (${DATE})

## scholarship_detail

- total rows: ${rows.length}
- ES: ${es}
- FR: ${fr}
- published: ${rows.filter((r) => r.status === 'published').length}
- quality < 85: ${rows.filter((r) => (r.quality_score ?? 0) < 85).length}

## machine_models

\`\`\`json
${JSON.stringify(
  Object.fromEntries(
    [...new Set(rows.map((r) => r.machine_model).filter(Boolean))].map((m) => [
      m,
      rows.filter((r) => r.machine_model === m).length
    ])
  ),
  null,
  2
)}
\`\`\`
`;
  const path = join(process.cwd(), 'reports/seo', `i18n-stage5e-6-autopilot-baseline-${DATE}.md`);
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  writeFileSync(path, body, 'utf8');
  console.log('Wrote', path);
  return { es, fr };
}

function runRegression() {
  console.log('[autopilot] regression: tsc + i18n tests');
  execSync('npx tsc --noEmit', { stdio: 'inherit', cwd: process.cwd() });
  execSync('npx tsx --test lib/i18n/__tests__/*.test.ts', { stdio: 'inherit', cwd: process.cwd() });
}

async function main() {
  const { target, waveSize, maxWaves, startWave, dryRunOnly, smokeOnlyWave } = parseArgs();
  console.log('[autopilot] start', { target, waveSize, dryRunOnly, dryRun: isDryRun() });

  const baseline = await writeBaseline();

  if (smokeOnlyWave > 0) {
    const { slugs, source, audit } = await loadPersistedWaveSlugs(smokeOnlyWave);
    console.log('[autopilot] smoke-only persisted wave', {
      wave: smokeOnlyWave,
      slugSource: source,
      slugCount: slugs.length,
      dbRows: audit.total,
      machineModel: audit.machineModel
    });
    if (!slugs.length) {
      console.error('No persisted slugs for wave', smokeOnlyWave);
      process.exit(1);
    }
    const waveCandidates = slugsToSmokeCandidates(slugs, smokeOnlyWave);
    const expectedTotal = STARTING_SCHOLARSHIPS + (smokeOnlyWave - 1) * waveSize + slugs.length;
    const smoke = await smokeWave(smokeOnlyWave, waveCandidates, expectedTotal);
    writeSmokeReport(smokeOnlyWave, waveCandidates, smoke, slugs.length * 2);
    console.log(smoke.passed ? 'Smoke OK' : smoke.issues);
    process.exit(smoke.passed ? 0 : 1);
  }

  const allCandidates = await selectCandidates(target, waveSize);
  const maxWave = Math.min(Math.ceil(target / waveSize), maxWaves);

  const summary: {
    wavesAttempted: number;
    wavesAccepted: number;
    scholarshipsAdded: number;
    rowsAdded: number;
    stoppedReason: string;
    openAiCost: number;
  } = {
    wavesAttempted: 0,
    wavesAccepted: 0,
    scholarshipsAdded: 0,
    rowsAdded: 0,
    stoppedReason: '',
    openAiCost: 0
  };

  let currentTotal = baseline.es + (startWave - 1) * waveSize;

  for (let waveNum = startWave; waveNum <= maxWave; waveNum++) {
    const waveCandidates = allCandidates.filter((c) => c.wave === waveNum);
    if (!waveCandidates.length) break;

    summary.wavesAttempted++;
    console.log(`\n[autopilot] === wave ${waveNum} (${waveCandidates.length} scholarships) ===`);

    let generated;
    try {
      generated = await generateWaveOverlays(waveCandidates, waveNum);
    } catch (e) {
      summary.stoppedReason = `wave ${waveNum} generate failed: ${e}`;
      break;
    }

    const validation = validateWave(generated, waveCandidates);
    writeValidationReport(
      waveNum,
      validation,
      validation.hardFails.length ? waveCandidates.map((c) => c.slug) : []
    );

    if (!validation.passed) {
      summary.stoppedReason = `wave ${waveNum} validation failed (${validation.hardFails.length} hard fails)`;
      break;
    }

    if (dryRunOnly) {
      console.log(`[autopilot] wave ${waveNum} dry-run validation OK`);
      summary.wavesAccepted++;
      continue;
    }

    let publishResult;
    try {
      publishResult = await publishWave(waveNum, generated, waveCandidates.length);
    } catch (e) {
      summary.stoppedReason = `wave ${waveNum} publish failed: ${e}`;
      break;
    }

    if (publishResult.dryRun) {
      console.log(`[autopilot] wave ${waveNum} dry-run publish OK (${generated.rows.length} rows)`);
      summary.wavesAccepted++;
      continue;
    }

    const dbIssues = await verifyDbWave(waveNum, waveCandidates.length * 2);
    if (dbIssues.length) {
      summary.stoppedReason = `wave ${waveNum} DB verify: ${dbIssues.join('; ')}`;
      break;
    }

    currentTotal += waveCandidates.length;
    const smoke = await smokeWave(waveNum, waveCandidates, currentTotal);
    writeSmokeReport(waveNum, waveCandidates, smoke, publishResult.upserted);

    if (!smoke.passed) {
      summary.stoppedReason = `wave ${waveNum} smoke failed: ${smoke.issues.slice(0, 5).join('; ')}`;
      break;
    }

    summary.wavesAccepted++;
    summary.scholarshipsAdded += waveCandidates.length;
    summary.rowsAdded += publishResult.upserted;
    console.log(`[autopilot] wave ${waveNum} ACCEPTED (total scholarships ~${currentTotal})`);

    if (waveNum % 2 === 0 && !isDryRun()) {
      try {
        runRegression();
      } catch {
        summary.stoppedReason = `regression failed after wave ${waveNum}`;
        break;
      }
    }

    if (summary.scholarshipsAdded >= target) {
      summary.stoppedReason = 'target reached';
      break;
    }
  }

  if (!summary.stoppedReason) summary.stoppedReason = 'completed';

  const masterPath = join(
    process.cwd(),
    'reports/seo',
    `i18n-stage5e-6-autopilot-master-report-${DATE}.md`
  );
  const handoffPath = join(
    process.cwd(),
    'reports/seo',
    `i18n-stage5e-6-autopilot-chatgpt-handoff-${DATE}.md`
  );

  const finalEs = baseline.es + summary.scholarshipsAdded;
  const master = `# Stage 5E-6 scholarship detail autopilot — master report (${DATE})

## Summary

| Metric | Value |
|--------|-------|
| Starting scholarships | ${STARTING_SCHOLARSHIPS} |
| Target | ${target} |
| Scholarships added | ${summary.scholarshipsAdded} |
| Rows added | ${summary.rowsAdded} |
| Waves attempted | ${summary.wavesAttempted} |
| Waves accepted | ${summary.wavesAccepted} |
| Final ES/FR (approx) | ${finalEs} each |
| OpenAI cost | $${summary.openAiCost} |
| Stop reason | ${summary.stoppedReason} |

## Rollback per wave

\`\`\`sql
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model = 'stage5e-scholarship-autopilot-wave-{N}';
\`\`\`

## Recommendation

- Continue +500: ${summary.wavesAccepted >= 10 && summary.stoppedReason.includes('target') ? 'yes' : 'evaluate'}
- Safe for batch 12+ manual: after deploy verify
`;
  writeFileSync(masterPath, master, 'utf8');
  writeFileSync(
    handoffPath,
    `# Autopilot handoff ${DATE}\n\nAdded ${summary.scholarshipsAdded} scholarships (${summary.rowsAdded} rows). Waves ${summary.wavesAccepted}/${summary.wavesAttempted}. OpenAI $0.\n`,
    'utf8'
  );

  console.log('\n[autopilot] done', summary);
  console.log('Wrote', masterPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
