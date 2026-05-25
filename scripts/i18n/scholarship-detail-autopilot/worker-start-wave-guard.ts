/**
 * Prevents accidental repeat of the same relaxed start wave on Railway restarts.
 */
import { auditRelaxedWaveInDb, countRelaxedWaveRows, relaxedMachineModel } from './load-persisted-wave';

export type StartWaveGuardResult =
  | { ok: true }
  | { ok: false; reason: 'existing_rows' | 'audit_failed'; message: string; existingRows: number };

export async function assertSafeStartWave(
  startWave: number,
  options: { forceStartWave: boolean; dryRun: boolean }
): Promise<StartWaveGuardResult> {
  if (options.dryRun || startWave < 1) return { ok: true };

  const existingRows = await countRelaxedWaveRows(startWave);
  if (existingRows > 0 && !options.forceStartWave) {
    return {
      ok: false,
      reason: 'existing_rows',
      existingRows,
      message:
        `start wave ${startWave} already has ${existingRows} DB rows for ${relaxedMachineModel(startWave)}. ` +
        'Set I18N_WORKER_START_WAVE to the next safe wave or I18N_WORKER_FORCE_START_WAVE=1 to rerun.'
    };
  }

  if (existingRows > 0 && options.forceStartWave) {
    const audit = await auditRelaxedWaveInDb(startWave);
    const scholarships = audit.distinctSourceIds;
    const coherent =
      audit.total === scholarships * 2 &&
      audit.es === scholarships &&
      audit.fr === scholarships &&
      audit.qualityBelow85 === 0 &&
      (audit.statuses.published ?? 0) === audit.total;
    if (!coherent) {
      return {
        ok: false,
        reason: 'audit_failed',
        existingRows,
        message: `force rerun blocked: wave ${startWave} rows are inconsistent (total=${audit.total}, scholarships=${scholarships}, es=${audit.es}, fr=${audit.fr})`
      };
    }
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
