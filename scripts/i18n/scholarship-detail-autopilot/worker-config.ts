/**
 * Railway worker env config for scholarship_detail autopilot.
 */
import { randomUUID } from 'node:crypto';

import { parseResumeMode, type ResumeMode } from './worker-resume';

export type ScholarshipAutopilotWorkerConfig = {
  runId: string;
  dryRun: boolean;
  productionMode: boolean;
  /** Env I18N_WORKER_START_WAVE — minimum / requested wave, not authoritative after restart. */
  startWave: number;
  /** Resolved at runtime: max(requested, nextSafeFromStateDb). */
  actualStartWave: number;
  resumeMode: ResumeMode;
  target: number;
  waveSize: number;
  maxRuntimeMinutes: number;
  maxWaves: number;
  requireLock: boolean;
  lockExitZeroOnHeld: boolean;
  /** Allow re-running a start wave that already has relaxed machine_model rows in DB. */
  forceStartWave: boolean;
  smokeBaseUrl: string;
  siteUrl: string;
  supabaseUrlPresent: boolean;
  serviceRolePresent: boolean;
};

function envFlag(name: string): boolean {
  return process.env[name]?.trim() === '1';
}

function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]?.trim();
  const n = raw ? Number(raw) : fallback;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export function hasProductionGuards(): boolean {
  return (
    envFlag('I18N_SCHOLARSHIP_AUTOPILOT') &&
    envFlag('I18N_PILOT_ALLOW_DB_WRITES') &&
    envFlag('I18N_PILOT_ALLOW_PRODUCTION')
  );
}

export function parseScholarshipAutopilotWorkerConfig(): ScholarshipAutopilotWorkerConfig {
  const dryRunExplicit = process.env.I18N_WORKER_DRY_RUN?.trim();
  const dryRun =
    dryRunExplicit === '1' ? true : dryRunExplicit === '0' ? false : !hasProductionGuards();

  const productionMode = !dryRun && hasProductionGuards();
  const startWave = envInt('I18N_WORKER_START_WAVE', 0, 0, 9999);
  const target = envInt('I18N_WORKER_TARGET', 500, 0, 20000);
  const waveSize = envInt('I18N_WORKER_WAVE_SIZE', 50, 1, 200);
  const maxRuntimeMinutes = envInt('I18N_WORKER_MAX_RUNTIME_MINUTES', 600, 5, 720);
  const maxWaves = envInt('I18N_WORKER_MAX_WAVES', 999, 1, 999);

  const resumeMode = parseResumeMode(process.env.I18N_WORKER_RESUME_MODE);

  return {
    runId: process.env.I18N_WORKER_RUN_ID?.trim() || randomUUID(),
    dryRun,
    productionMode,
    startWave,
    actualStartWave: startWave,
    resumeMode,
    target,
    waveSize,
    maxRuntimeMinutes,
    maxWaves,
    requireLock: process.env.I18N_WORKER_REQUIRE_LOCK?.trim() !== '0',
    lockExitZeroOnHeld: process.env.I18N_WORKER_LOCK_EXIT_ZERO_ON_HELD?.trim() === '1',
    forceStartWave: process.env.I18N_WORKER_FORCE_START_WAVE?.trim() === '1',
    smokeBaseUrl: (process.env.SMOKE_BASE_URL ?? process.env.SITE_URL ?? 'https://scholarshiptop.com').replace(
      /\/$/,
      ''
    ),
    siteUrl: (process.env.SITE_URL ?? 'https://scholarshiptop.com').replace(/\/$/, ''),
    supabaseUrlPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    serviceRolePresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
  };
}

export function validateScholarshipAutopilotWorkerConfig(
  config: ScholarshipAutopilotWorkerConfig
): string[] {
  const issues: string[] = [];
  if (!config.supabaseUrlPresent) issues.push('NEXT_PUBLIC_SUPABASE_URL missing');
  if (!config.serviceRolePresent) issues.push('SUPABASE_SERVICE_ROLE_KEY missing');
  if (!config.dryRun && !hasProductionGuards()) {
    issues.push(
      'production guards missing (I18N_SCHOLARSHIP_AUTOPILOT, I18N_PILOT_ALLOW_DB_WRITES, I18N_PILOT_ALLOW_PRODUCTION)'
    );
  }
  if (config.productionMode && config.startWave < 1) {
    issues.push('I18N_WORKER_START_WAVE must be >= 1 for production runs');
  }
  if (config.target < 1 && !config.dryRun) {
    issues.push('I18N_WORKER_TARGET must be >= 1 unless dry-run');
  }
  return issues;
}

export function printWorkerConfig(config: ScholarshipAutopilotWorkerConfig): void {
  console.log('[worker] config', {
    runId: config.runId,
    dryRun: config.dryRun,
    productionMode: config.productionMode,
    startWave: config.startWave,
    actualStartWave: config.actualStartWave,
    resumeMode: config.resumeMode,
    target: config.target,
    waveSize: config.waveSize,
    maxRuntimeMinutes: config.maxRuntimeMinutes,
    maxWaves: config.maxWaves,
    requireLock: config.requireLock,
    forceStartWave: config.forceStartWave,
    smokeBaseUrl: config.smokeBaseUrl,
    siteUrl: config.siteUrl,
    supabaseUrlPresent: config.supabaseUrlPresent,
    serviceRolePresent: config.serviceRolePresent
  });
}
