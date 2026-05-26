/**
 * Railway one-shot wrapper for relaxed scholarship_detail autopilot.
 * Spawns run-relaxed-autopilot.ts once, enforces lock + max runtime, then exits.
 * Configure Railway restart policy to NEVER — non-zero exit must not auto-restart with the same start wave.
 *
 * Usage (Railway start command):
 *   npm run i18n:scholarship-autopilot:railway
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

import { DATE, loadEnvLocal } from './env';
import {
  isScholarshipAutopilotLocked,
  releaseScholarshipAutopilotLock,
  tryAcquireScholarshipAutopilotLock
} from './scholarship-autopilot-lock';
import {
  parseScholarshipAutopilotWorkerConfig,
  printWorkerConfig,
  validateScholarshipAutopilotWorkerConfig
} from './worker-config';
import {
  initWorkerProgressRun,
  loadWorkerProgressState,
  markWorkerCompleted,
  markWorkerFailed,
  upsertWorkerProgressState
} from './worker-progress-state';
import { mergeNextSafeStartWave, resolveActualStartWave } from './worker-resume';
import {
  computeWorkerNextSafeStartWave,
  resolveRunnableStartWave
} from './worker-start-wave-guard';

const RUNNER = join(process.cwd(), 'scripts/i18n/scholarship-detail-autopilot/run-relaxed-autopilot.ts');

type WorkerSummary = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  dryRun: boolean;
  requestedStartWave: number;
  actualStartWave: number;
  nextSafeStartWave: number;
  skippedWaves: number[];
  target: number;
  waveSize: number;
  stoppedReason: string;
};

function writeWorkerReport(summary: WorkerSummary) {
  const path = join(process.cwd(), 'reports/seo', `i18n-stage5e-16-railway-worker-run-${DATE}.md`);
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const body = `# Stage 5E-16 Railway worker run (${DATE})

| Field | Value |
|-------|-------|
| run_id | ${summary.runId} |
| started | ${summary.startedAt} |
| finished | ${summary.finishedAt} |
| exit_code | ${summary.exitCode ?? 'null'} |
| signal | ${summary.signal ?? 'none'} |
| timed_out | ${summary.timedOut} |
| dry_run | ${summary.dryRun} |
| requested_start_wave | ${summary.requestedStartWave} |
| actual_start_wave | ${summary.actualStartWave} |
| next_safe_start_wave | ${summary.nextSafeStartWave} |
| skipped_waves | ${summary.skippedWaves.length ? summary.skippedWaves.join(', ') : 'none'} |
| target | ${summary.target} |
| wave_size | ${summary.waveSize} |
| result | ${summary.stoppedReason} |
`;
  writeFileSync(path, body, 'utf8');
  console.log('[worker] wrote', path);
}

function runAutopilotChild(
  config: ReturnType<typeof parseScholarshipAutopilotWorkerConfig>,
  maxRuntimeMs: number
): Promise<{ exitCode: number | null; signal: NodeJS.Signals | null; timedOut: boolean }> {
  const startWave = config.actualStartWave || config.startWave || 161;
  const args = [
    'tsx',
    RUNNER,
    `--start-wave=${startWave}`,
    `--target=${config.target}`,
    `--wave-size=${config.waveSize}`,
    `--max-waves=${config.maxWaves}`
  ];
  if (config.dryRun) args.push('--dry-run-only');

  return new Promise((resolve) => {
    const child = spawn('npx', args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        I18N_WORKER_RUN_ID: config.runId,
        I18N_WORKER_ACTUAL_START_WAVE: String(startWave),
        SMOKE_BASE_URL: config.smokeBaseUrl,
        SITE_URL: config.siteUrl
      },
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      console.warn('[worker] max runtime exceeded, sending SIGTERM');
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!child.killed) child.kill('SIGKILL');
      }, 30_000);
    }, maxRuntimeMs);

    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      resolve({ exitCode: code, signal, timedOut });
    });
  });
}

async function main() {
  loadEnvLocal();
  const startedAt = new Date().toISOString();
  const config = parseScholarshipAutopilotWorkerConfig();
  printWorkerConfig(config);

  const issues = validateScholarshipAutopilotWorkerConfig(config);
  if (issues.length) {
    console.error('[worker] config invalid:', issues.join('; '));
    process.exit(2);
  }

  if (config.requireLock) {
    const held = await isScholarshipAutopilotLocked();
    if (held.locked === true) {
      console.log('[worker] lock already held before start', held);
      process.exit(config.lockExitZeroOnHeld ? 0 : 3);
    }
  }

  let lockAcquired = false;
  let requestedStartWave = config.startWave;
  let actualStartWave = config.startWave;
  let nextSafeStartWave = config.startWave;
  let skippedWaves: number[] = [];
  let stoppedReason = 'not_started';

  try {
    if (config.requireLock) {
      const lock = await tryAcquireScholarshipAutopilotLock(config.runId);
      if (!lock.acquired) {
        if (lock.reason === 'held') {
          process.exit(config.lockExitZeroOnHeld ? 0 : 3);
        }
        console.error('[worker] lock failed:', lock.message);
        process.exit(4);
      }
      lockAcquired = true;
    }

    const progress = await loadWorkerProgressState();
    if (!progress.available && progress.message) {
      console.warn('[worker] progress state unavailable:', progress.message);
    }

    const minWave = config.productionMode && config.startWave >= 1 ? Math.min(config.startWave, 181) : 181;
    const dbNextSafe = await computeWorkerNextSafeStartWave(minWave);
    nextSafeStartWave = mergeNextSafeStartWave(progress.row?.next_wave, dbNextSafe);
    console.log('[worker] resume', {
      requestedStartWave: config.startWave,
      stateNextWave: progress.row?.next_wave ?? null,
      dbNextSafe,
      nextSafeStartWave,
      resumeMode: config.resumeMode
    });

    if (config.productionMode && config.startWave >= 1) {
      const resolved = resolveActualStartWave({
        requestedStartWave: config.startWave,
        nextSafeStartWave,
        resumeMode: config.resumeMode
      });
      if (!resolved.ok) {
        stoppedReason = `strict_resume_mismatch: requested ${resolved.requestedStartWave} != next safe ${resolved.nextSafeStartWave}`;
        console.error(`[worker] ${stoppedReason}`);
        await markWorkerFailed({ error: stoppedReason, runId: config.runId });
        process.exit(0);
      }
      if (resolved.adjusted) {
        console.warn(
          `[worker] I18N_WORKER_START_WAVE=${resolved.requestedStartWave} is behind next safe wave ${resolved.nextSafeStartWave}; ` +
            `continuing from ${resolved.actualStartWave} (I18N_WORKER_RESUME_MODE=${config.resumeMode})`
        );
      }
      actualStartWave = resolved.actualStartWave;

      const runnable = await resolveRunnableStartWave(actualStartWave, {
        forceStartWave: config.forceStartWave,
        dryRun: config.dryRun,
        expectedScholarships: config.waveSize
      });
      if (!runnable.ok) {
        stoppedReason = runnable.message;
        console.error('[worker] start wave guard:', stoppedReason);
        await markWorkerFailed({
          error: stoppedReason,
          currentWave: runnable.wave,
          runId: config.runId
        });
        process.exit(1);
      }
      actualStartWave = runnable.startWave;
      skippedWaves = runnable.skippedWaves;
      if (skippedWaves.length) {
        console.log('[worker] skipped completed waves:', skippedWaves.join(', '));
      }
    }

    config.actualStartWave = actualStartWave;
    await initWorkerProgressRun(config, actualStartWave);
    if (skippedWaves.length) {
      const lastSkipped = skippedWaves[skippedWaves.length - 1]!;
      await upsertWorkerProgressState({
        last_accepted_wave: lastSkipped,
        next_wave: actualStartWave,
        current_wave: actualStartWave
      });
    }

    const maxRuntimeMs = config.maxRuntimeMinutes * 60 * 1000;
    let exitCode = 1;
    let signal: NodeJS.Signals | null = null;
    let timedOut = false;

    const result = await runAutopilotChild(config, maxRuntimeMs);
    exitCode = result.exitCode ?? 1;
    signal = result.signal;
    timedOut = result.timedOut;
    if (timedOut) exitCode = 124;

    if (exitCode === 0) {
      const after = await loadWorkerProgressState();
      await markWorkerCompleted({
        runId: config.runId,
        lastAcceptedWave: after.row?.last_accepted_wave ?? undefined,
        nextWave: after.row?.next_wave ?? actualStartWave,
        targetCompleted: after.row?.target_completed,
        sitemapEs: after.row?.last_sitemap_es ?? undefined,
        sitemapFr: after.row?.last_sitemap_fr ?? undefined
      });
      stoppedReason = timedOut ? 'max_runtime_exceeded' : 'completed';
    } else {
      stoppedReason = timedOut ? 'max_runtime_exceeded' : `child_exit_${exitCode}`;
      const after = await loadWorkerProgressState();
      await markWorkerFailed({
        error: stoppedReason,
        currentWave: after.row?.current_wave ?? actualStartWave,
        runId: config.runId
      });
    }

    const summary: WorkerSummary = {
      runId: config.runId,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode,
      signal,
      timedOut,
      dryRun: config.dryRun,
      requestedStartWave,
      actualStartWave,
      nextSafeStartWave,
      skippedWaves,
      target: config.target,
      waveSize: config.waveSize,
      stoppedReason
    };

    writeWorkerReport(summary);
    console.log('[worker] done', summary);
    process.exit(exitCode);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    stoppedReason = `fatal: ${message}`;
    console.error('[worker] fatal', e);
    await markWorkerFailed({ error: message, currentWave: actualStartWave, runId: config.runId });
    process.exit(1);
  } finally {
    if (lockAcquired) {
      await releaseScholarshipAutopilotLock(config.runId);
    }
  }
}

main().catch((e) => {
  console.error('[worker] fatal', e);
  process.exit(1);
});
