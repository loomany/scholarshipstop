import { randomUUID } from 'node:crypto';

export type JobCounters = {
  processed: number;
  success: number;
  failed: number;
  skipped: number;
};

type MarkerBase = {
  service: string;
  job: string;
  runId: string;
};

function escapeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function toNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function formatBase(base: MarkerBase): string {
  return `service="${escapeValue(base.service)}" job="${escapeValue(base.job)}" runId="${escapeValue(base.runId)}"`;
}

function formatCounters(counters: JobCounters): string {
  const processed = toNonNegativeInt(counters.processed);
  const success = toNonNegativeInt(counters.success);
  const failed = toNonNegativeInt(counters.failed);
  const skipped = toNonNegativeInt(counters.skipped);
  return `processed=${processed} success=${success} failed=${failed} skipped=${skipped}`;
}

export function createRunId(): string {
  return randomUUID();
}

export function emitJobStart(base: MarkerBase, timestamp = new Date().toISOString()): void {
  console.log(`JOB_START ${formatBase(base)} timestamp="${escapeValue(timestamp)}"`);
}

export function emitJobProgress(base: MarkerBase, counters: JobCounters): void {
  console.log(`JOB_PROGRESS ${formatBase(base)} ${formatCounters(counters)}`);
}

export function emitJobDone(base: MarkerBase, durationMs: number, counters: JobCounters): void {
  const duration = toNonNegativeInt(durationMs);
  console.log(`JOB_DONE ${formatBase(base)} durationMs=${duration} ${formatCounters(counters)} exit=0`);
}

/** Billing / provider cap — job stopped intentionally; use with `JOB_DONE exit=0` (not `JOB_FAILED`). */
export function emitJobSkipped(base: MarkerBase, reason: string, detail?: string): void {
  const r = escapeValue(reason);
  const d = detail != null && detail !== '' ? ` detail="${escapeValue(detail)}"` : '';
  console.log(`JOB_SKIPPED ${formatBase(base)} reason="${r}"${d}`);
}

export function emitJobFailed(base: MarkerBase, durationMs: number, counters: JobCounters, error: unknown): void {
  const duration = toNonNegativeInt(durationMs);
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    `JOB_FAILED ${formatBase(base)} durationMs=${duration} ${formatCounters(counters)} error="${escapeValue(message)}"`
  );
}
