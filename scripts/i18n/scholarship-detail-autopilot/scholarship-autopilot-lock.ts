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
  const { data, error } = await db.rpc('i18n_scholarship_autopilot_unlock');
  if (error) {
    console.warn('[worker-lock] release error', { runId, message: error.message });
    return;
  }
  console.log('[worker-lock] released', { runId, unlocked: data === true });
}

export async function isScholarshipAutopilotLocked(): Promise<{
  locked: boolean | null;
  message?: string;
}> {
  const db = supabaseAdmin();
  const { data, error } = await db.rpc('i18n_scholarship_autopilot_is_locked');
  if (error) {
    if (rpcMissing(error.message)) {
      return { locked: null, message: 'lock RPC not deployed' };
    }
    return { locked: null, message: error.message };
  }
  return { locked: data === true };
}
