/**
 * Railway/cron-safe wrapper for relaxed scholarship_detail autopilot.
 * Spawns run-relaxed-autopilot.ts once, enforces lock + max runtime, then exits.
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

const RUNNER = join(process.cwd(), 'scripts/i18n/scholarship-detail-autopilot/run-relaxed-autopilot.ts');

type WorkerSummary = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  dryRun: boolean;
  startWave: number;
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
| start_wave | ${summary.startWave} |
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
  const args = [
    'tsx',
    RUNNER,
    `--start-wave=${config.startWave || 161}`,
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

  const maxRuntimeMs = config.maxRuntimeMinutes * 60 * 1000;
  let exitCode = 1;
  let signal: NodeJS.Signals | null = null;
  let timedOut = false;

  try {
    const result = await runAutopilotChild(config, maxRuntimeMs);
    exitCode = result.exitCode ?? 1;
    signal = result.signal;
    timedOut = result.timedOut;
    if (timedOut) exitCode = 124;
  } finally {
    if (lockAcquired) {
      await releaseScholarshipAutopilotLock(config.runId);
    }
  }

  const summary: WorkerSummary = {
    runId: config.runId,
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode,
    signal,
    timedOut,
    dryRun: config.dryRun,
    startWave: config.startWave,
    target: config.target,
    waveSize: config.waveSize,
    stoppedReason: timedOut
      ? 'max_runtime_exceeded'
      : exitCode === 0
        ? 'completed'
        : `child_exit_${exitCode}`
  };

  writeWorkerReport(summary);
  console.log('[worker] done', summary);
  process.exit(exitCode);
}

main().catch((e) => {
  console.error('[worker] fatal', e);
  process.exit(1);
});
