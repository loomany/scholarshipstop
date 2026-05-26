/**
 * Prevents accidental repeat of the same relaxed start wave on Railway restarts.
 */
import {
  auditRelaxedWaveInDb,
  countRelaxedWaveRows,
  relaxedMachineModel,
  type PersistedWaveAudit
} from './load-persisted-wave';
import {
  classifyRelaxedWaveAudit,
  isRelaxedWaveComplete,
  type RelaxedWaveClassification
} from './worker-resume';

export type { RelaxedWaveClassification };

export type StartWaveGuardResult =
  | { ok: true }
  | { ok: false; reason: 'existing_rows' | 'audit_failed' | 'partial_wave'; message: string; existingRows: number };

export type RunnableStartWaveResult =
  | { ok: true; startWave: number; skippedWaves: number[] }
  | { ok: false; reason: 'partial_wave' | 'audit_failed'; message: string; wave: number };

export async function classifyRelaxedWaveInDb(
  wave: number,
  expectedScholarships?: number
): Promise<{ classification: RelaxedWaveClassification; audit: PersistedWaveAudit; existingRows: number }> {
  const existingRows = await countRelaxedWaveRows(wave);
  if (existingRows === 0) {
    const audit = await auditRelaxedWaveInDb(wave);
    return { classification: 'empty', audit, existingRows: 0 };
  }
  const audit = await auditRelaxedWaveInDb(wave);
  return {
    classification: classifyRelaxedWaveAudit(audit, expectedScholarships),
    audit,
    existingRows
  };
}

/** Advance past waves that already have DB rows (complete or polluted-valid). */
export async function resolveRunnableStartWave(
  startWave: number,
  options: {
    forceStartWave: boolean;
    dryRun: boolean;
    expectedScholarships?: number;
    maxSkips?: number;
  }
): Promise<RunnableStartWaveResult> {
  if (options.dryRun || startWave < 1) {
    return { ok: true, startWave, skippedWaves: [] };
  }
  const maxSkips = options.maxSkips ?? 50;
  const skippedWaves: number[] = [];
  let wave = startWave;

  for (let i = 0; i < maxSkips; i++) {
    const { classification, existingRows } = await classifyRelaxedWaveInDb(wave, options.expectedScholarships);
    if (classification === 'empty') {
      return { ok: true, startWave: wave, skippedWaves };
    }
    if (classification === 'partial_broken') {
      return {
        ok: false,
        reason: 'partial_wave',
        wave,
        message:
          `wave ${wave} has ${existingRows} partial/broken rows under ${relaxedMachineModel(wave)}. ` +
          'Manual audit required; do not append more rows.'
      };
    }
    if (classification === 'complete' || classification === 'polluted_valid') {
      console.log(
        `[worker-guard] wave ${wave} already ${classification} (${existingRows} rows) — advancing to ${wave + 1}`
      );
      skippedWaves.push(wave);
      wave += 1;
      continue;
    }
    if (options.forceStartWave) {
      const audit = await auditRelaxedWaveInDb(wave);
      if (!isRelaxedWaveComplete(audit, options.expectedScholarships)) {
        return {
          ok: false,
          reason: 'audit_failed',
          wave,
          message: `force rerun blocked: wave ${wave} rows are not coherent for forced rerun`
        };
      }
      return { ok: true, startWave: wave, skippedWaves };
    }
    return {
      ok: false,
      reason: 'partial_wave',
      wave,
      message: `wave ${wave} has unexpected classification ${classification}`
    };
  }

  return {
    ok: false,
    reason: 'partial_wave',
    wave,
    message: `exceeded max wave skips (${maxSkips}) from start ${startWave}`
  };
}

export async function assertSafeStartWave(
  startWave: number,
  options: { forceStartWave: boolean; dryRun: boolean; expectedScholarships?: number }
): Promise<StartWaveGuardResult> {
  if (options.dryRun || startWave < 1) return { ok: true };

  const { classification, existingRows, audit } = await classifyRelaxedWaveInDb(
    startWave,
    options.expectedScholarships
  );

  if (classification === 'empty') return { ok: true };

  if (classification === 'complete' || classification === 'polluted_valid') {
    return {
      ok: false,
      reason: 'existing_rows',
      existingRows,
      message:
        `start wave ${startWave} already has ${existingRows} accepted rows (${classification}). ` +
        `Resume from wave ${startWave + 1} (set I18N_WORKER_START_WAVE or rely on I18N_WORKER_RESUME_MODE=auto).`
    };
  }

  if (!options.forceStartWave) {
    return {
      ok: false,
      reason: 'partial_wave',
      existingRows,
      message:
        `start wave ${startWave} has ${existingRows} partial/broken DB rows for ${relaxedMachineModel(startWave)}. ` +
        'Manual audit required before rerun.'
    };
  }

  if (!isRelaxedWaveComplete(audit, options.expectedScholarships)) {
    return {
      ok: false,
      reason: 'audit_failed',
      existingRows,
      message: `force rerun blocked: wave ${startWave} rows are inconsistent (total=${audit.total}, scholarships=${audit.distinctSourceIds})`
    };
  }

  return { ok: true };
}

/** Highest relaxed wave that looks fully accepted (published, balanced es/fr, no quality gaps). */
export async function findLatestAcceptedRelaxedWave(
  minWave = 1,
  maxWaveScan = 250
): Promise<number> {
  let latest = 0;
  for (let wave = minWave; wave <= maxWaveScan; wave++) {
    const audit = await auditRelaxedWaveInDb(wave);
    if (audit.total === 0) continue;
    const scholarships = audit.distinctSourceIds;
    const ok =
      scholarships > 0 &&
      audit.total === scholarships * 2 &&
      audit.es === scholarships &&
      audit.fr === scholarships &&
      audit.qualityBelow85 === 0 &&
      (audit.statuses.published ?? 0) === audit.total;
    if (ok) latest = Math.max(latest, wave);
  }
  return latest;
}

export async function suggestNextSafeStartWave(minWave = 181): Promise<number> {
  const latest = await findLatestAcceptedRelaxedWave(minWave);
  return latest > 0 ? latest + 1 : minWave;
}

export async function computeWorkerNextSafeStartWave(minWave = 181): Promise<number> {
  return suggestNextSafeStartWave(minWave);
}
