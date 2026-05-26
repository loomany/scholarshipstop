/**
 * DB-backed scholarship_detail autopilot worker progress (resume after Railway restart).
 */
import { createClient } from '@supabase/supabase-js';

import { loadEnvLocal } from './env';
import type { ScholarshipAutopilotWorkerConfig } from './worker-config';

export const WORKER_PROGRESS_LOCK_KEY = 'scholarship_detail_autopilot';

export type WorkerProgressStatus = 'idle' | 'running' | 'failed' | 'completed';

export type WorkerProgressRow = {
  lock_key: string;
  active_run_id: string | null;
  requested_start_wave: number | null;
  current_wave: number | null;
  last_accepted_wave: number | null;
  next_wave: number | null;
  target_requested: number | null;
  target_completed: number;
  wave_size: number | null;
  last_sitemap_es: number | null;
  last_sitemap_fr: number | null;
  status: WorkerProgressStatus;
  last_error: string | null;
  heartbeat_at: string | null;
  updated_at: string;
};

function supabaseAdmin() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  return createClient(url, key);
}

function tableMissing(message: string | undefined): boolean {
  const m = (message ?? '').toLowerCase();
  return m.includes('does not exist') || m.includes('could not find the table') || m.includes('pgrst205');
}

export async function loadWorkerProgressState(): Promise<{
  row: WorkerProgressRow | null;
  available: boolean;
  message?: string;
}> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('i18n_scholarship_worker_progress')
    .select('*')
    .eq('lock_key', WORKER_PROGRESS_LOCK_KEY)
    .maybeSingle();
  if (error) {
    if (tableMissing(error.message)) {
      return { row: null, available: false, message: 'progress table not deployed' };
    }
    return { row: null, available: false, message: error.message };
  }
  if (!data) return { row: null, available: true };
  return { row: data as WorkerProgressRow, available: true };
}

export async function upsertWorkerProgressState(
  patch: Partial<Omit<WorkerProgressRow, 'lock_key' | 'updated_at'>>
): Promise<{ ok: boolean; message?: string }> {
  const db = supabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await db.from('i18n_scholarship_worker_progress').upsert(
    {
      lock_key: WORKER_PROGRESS_LOCK_KEY,
      updated_at: now,
      heartbeat_at: patch.heartbeat_at ?? now,
      ...patch
    },
    { onConflict: 'lock_key' }
  );
  if (error) {
    if (tableMissing(error.message)) {
      return { ok: false, message: 'progress table not deployed' };
    }
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export async function initWorkerProgressRun(
  config: ScholarshipAutopilotWorkerConfig,
  actualStartWave: number
): Promise<void> {
  await upsertWorkerProgressState({
    active_run_id: config.runId,
    requested_start_wave: config.startWave,
    current_wave: actualStartWave,
    last_accepted_wave: null,
    next_wave: actualStartWave,
    target_requested: config.target,
    target_completed: 0,
    wave_size: config.waveSize,
    status: 'running',
    last_error: null
  });
}

export async function markWorkerWaveAccepted(input: {
  wave: number;
  netNew: number;
  sitemapEs: number;
  sitemapFr: number;
  runId?: string;
}): Promise<void> {
  const loaded = await loadWorkerProgressState();
  const prevCompleted = loaded.row?.target_completed ?? 0;
  await upsertWorkerProgressState({
    active_run_id: input.runId ?? loaded.row?.active_run_id ?? undefined,
    current_wave: input.wave,
    last_accepted_wave: input.wave,
    next_wave: input.wave + 1,
    target_completed: prevCompleted + input.netNew,
    last_sitemap_es: input.sitemapEs,
    last_sitemap_fr: input.sitemapFr,
    status: 'running',
    last_error: null
  });
}

export async function markWorkerFailed(input: {
  error: string;
  currentWave?: number;
  runId?: string;
}): Promise<void> {
  await upsertWorkerProgressState({
    active_run_id: input.runId,
    current_wave: input.currentWave,
    status: 'failed',
    last_error: input.error.slice(0, 4000)
  });
}

export async function markWorkerCompleted(input: {
  runId?: string;
  lastAcceptedWave?: number;
  nextWave?: number;
  targetCompleted?: number;
  sitemapEs?: number;
  sitemapFr?: number;
}): Promise<void> {
  const loaded = await loadWorkerProgressState();
  const row = loaded.row;
  await upsertWorkerProgressState({
    active_run_id: input.runId ?? row?.active_run_id ?? undefined,
    current_wave: input.lastAcceptedWave ?? row?.last_accepted_wave ?? row?.current_wave,
    last_accepted_wave: input.lastAcceptedWave ?? row?.last_accepted_wave,
    next_wave:
      input.nextWave ??
      (input.lastAcceptedWave != null ? input.lastAcceptedWave + 1 : row?.next_wave),
    target_completed: input.targetCompleted ?? row?.target_completed ?? 0,
    last_sitemap_es: input.sitemapEs ?? row?.last_sitemap_es,
    last_sitemap_fr: input.sitemapFr ?? row?.last_sitemap_fr,
    status: 'completed',
    last_error: null
  });
}

export async function touchWorkerHeartbeat(runId?: string): Promise<void> {
  await upsertWorkerProgressState({
    active_run_id: runId,
    heartbeat_at: new Date().toISOString()
  });
}
