/**
 * Pure resume / start-wave resolution for Railway scholarship worker.
 */
import type { PersistedWaveAudit } from './load-persisted-wave';

export type ResumeMode = 'auto' | 'strict';

export type ResolveActualStartWaveResult =
  | {
      ok: true;
      requestedStartWave: number;
      nextSafeStartWave: number;
      actualStartWave: number;
      adjusted: boolean;
    }
  | { ok: false; reason: 'strict_mismatch'; requestedStartWave: number; nextSafeStartWave: number };

export function parseResumeMode(raw: string | undefined): ResumeMode {
  const v = raw?.trim().toLowerCase();
  if (v === 'strict') return 'strict';
  return 'auto';
}

/** actualStartWave = max(requested, nextSafe); strict aborts when requested < nextSafe. */
export function resolveActualStartWave(input: {
  requestedStartWave: number;
  nextSafeStartWave: number;
  resumeMode: ResumeMode;
}): ResolveActualStartWaveResult {
  const { requestedStartWave, nextSafeStartWave, resumeMode } = input;
  if (resumeMode === 'strict' && requestedStartWave !== nextSafeStartWave) {
    return { ok: false, reason: 'strict_mismatch', requestedStartWave, nextSafeStartWave };
  }
  const actualStartWave = Math.max(requestedStartWave, nextSafeStartWave);
  return {
    ok: true,
    requestedStartWave,
    nextSafeStartWave,
    actualStartWave,
    adjusted: actualStartWave !== requestedStartWave
  };
}

export function mergeNextSafeStartWave(
  stateNextWave: number | null | undefined,
  dbNextSafe: number
): number {
  const fromState = stateNextWave != null && stateNextWave > 0 ? stateNextWave : 0;
  return Math.max(fromState, dbNextSafe);
}

export type RelaxedWaveClassification =
  | 'empty'
  | 'complete'
  | 'polluted_valid'
  | 'partial_broken';

export function isRelaxedWaveComplete(
  audit: Pick<
    PersistedWaveAudit,
    'total' | 'distinctSourceIds' | 'es' | 'fr' | 'qualityBelow85' | 'statuses'
  >,
  expectedScholarships?: number
): boolean {
  if (audit.total === 0) return false;
  const scholarships = audit.distinctSourceIds;
  if (scholarships <= 0) return false;
  const coherent =
    audit.total === scholarships * 2 &&
    audit.es === scholarships &&
    audit.fr === scholarships &&
    audit.qualityBelow85 === 0 &&
    (audit.statuses.published ?? 0) === audit.total;
  if (!coherent) return false;
  if (expectedScholarships != null && expectedScholarships > 0) {
    return scholarships === expectedScholarships;
  }
  return true;
}

/** Published + quality OK but wrong row counts (repeat Railway runs on same wave). */
export function isRelaxedWavePollutedValid(
  audit: Pick<
    PersistedWaveAudit,
    'total' | 'distinctSourceIds' | 'qualityBelow85' | 'statuses'
  >
): boolean {
  if (audit.total === 0 || audit.distinctSourceIds <= 0) return false;
  if (audit.qualityBelow85 > 0) return false;
  if ((audit.statuses.published ?? 0) !== audit.total) return false;
  return audit.total !== audit.distinctSourceIds * 2;
}

export function classifyRelaxedWaveAudit(
  audit: Pick<
    PersistedWaveAudit,
    'total' | 'distinctSourceIds' | 'es' | 'fr' | 'qualityBelow85' | 'statuses'
  >,
  expectedScholarships?: number
): RelaxedWaveClassification {
  if (audit.total === 0) return 'empty';
  if (isRelaxedWaveComplete(audit, expectedScholarships)) return 'complete';
  if (isRelaxedWavePollutedValid(audit)) return 'polluted_valid';
  return 'partial_broken';
}
