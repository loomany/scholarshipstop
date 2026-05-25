/**
 * Postgres advisory lock for scholarship_detail autopilot (single runner).
 * Requires migration 20260524180000_i18n_scholarship_autopilot_advisory_lock.sql.
 */
import { createClient } from '@supabase/supabase-js';

import { loadEnvLocal } from './env';

export type AutopilotLockResult =
  | { acquired: true; runId: string }
  | { acquired: false; reason: 'held' | 'rpc_missing' | 'error'; message: string };

function supabaseAdmin() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  return createClient(url, key);
}

function rpcMissing(message: string | undefined): boolean {
  const m = (message ?? '').toLowerCase();
  return (
    m.includes('could not find the function') ||
    m.includes('function') && m.includes('does not exist') ||
    m.includes('pgrst202')
  );
}

export async function tryAcquireScholarshipAutopilotLock(runId: string): Promise<AutopilotLockResult> {
  const db = supabaseAdmin();
  const { data, error } = await db.rpc('i18n_scholarship_autopilot_try_lock', { p_run_id: runId });
  if (error) {
    if (rpcMissing(error.message)) {
      return {
        acquired: false,
        reason: 'rpc_missing',
        message:
          'Lock RPC not deployed. Apply migration 20260524180000_i18n_scholarship_autopilot_advisory_lock.sql or set I18N_WORKER_REQUIRE_LOCK=0'
      };
    }
    return { acquired: false, reason: 'error', message: error.message };
  }
  if (data === true) {
    console.log('[worker-lock] acquired', { runId });
    return { acquired: true, runId };
  }
  console.log('[worker-lock] denied (already held)', { runId });
  return { acquired: false, reason: 'held', message: 'scholarship_detail_autopilot advisory lock is held' };
}

export async function releaseScholarshipAutopilotLock(runId: string): Promise<void> {
  const db = supabaseAdmin();
  const { data, error } = await db.rpc('i18n_scholarship_autopilot_unlock_run', { p_run_id: runId });
  if (error) {
    const fallback = await db.rpc('i18n_scholarship_autopilot_unlock');
    if (fallback.error) {
      console.warn('[worker-lock] release error', { runId, message: error.message });
      return;
    }
    console.log('[worker-lock] released (fallback unlock)', { runId, unlocked: fallback.data === true });
    return;
  }
  console.log('[worker-lock] released', { runId, unlocked: data === true });
}

export type AutopilotLockStatus = {
  locked: boolean | null;
  message?: string;
  runId?: string;
  lockedAt?: string;
  expiresAt?: string;
};

export async function getScholarshipAutopilotLockRow(): Promise<{
  row: { run_id: string; locked_at: string; expires_at: string } | null;
  error?: string;
}> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('i18n_scholarship_worker_lock')
    .select('run_id, locked_at, expires_at')
    .eq('lock_key', 'scholarship_detail_autopilot')
    .maybeSingle();
  if (error) return { row: null, error: error.message };
  if (!data) return { row: null };
  const expiresAt = String(data.expires_at ?? '');
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    return { row: null };
  }
  return {
    row: {
      run_id: String(data.run_id ?? ''),
      locked_at: String(data.locked_at ?? ''),
      expires_at: expiresAt
    }
  };
}

export async function isScholarshipAutopilotLocked(): Promise<AutopilotLockStatus> {
  const db = supabaseAdmin();
  const { data, error } = await db.rpc('i18n_scholarship_autopilot_is_locked');
  if (error) {
    if (rpcMissing(error.message)) {
      return { locked: null, message: 'lock RPC not deployed' };
    }
    return { locked: null, message: error.message };
  }
  const status: AutopilotLockStatus = { locked: data === true };
  if (data === true) {
    const row = await getScholarshipAutopilotLockRow();
    if (row.row) {
      status.runId = row.row.run_id;
      status.lockedAt = row.row.locked_at;
      status.expiresAt = row.row.expires_at;
    }
  }
  return status;
}
