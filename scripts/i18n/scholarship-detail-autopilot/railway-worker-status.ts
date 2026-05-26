/**
 * Read-only status for scholarship_detail autopilot / Railway worker.
 */
import { createClient } from '@supabase/supabase-js';

import { BASE, loadEnvLocal } from './env';
import { getScholarshipAutopilotLockRow, isScholarshipAutopilotLocked } from './scholarship-autopilot-lock';
import { loadWorkerProgressState } from './worker-progress-state';
import { mergeNextSafeStartWave } from './worker-resume';
import { suggestNextSafeStartWave } from './worker-start-wave-guard';
import {
  countSitemapEligibleEsScholarshipDetails,
  countSitemapEligibleFrScholarshipDetails
} from './load-persisted-wave';

async function fetchText(path: string): Promise<string> {
  const res = await fetch(`${BASE}${path}`);
  return res.ok ? res.text() : '';
}

async function latestRelaxedWave(db: ReturnType<typeof createClient>): Promise<number | null> {
  const { data, error } = await db
    .from('content_translations')
    .select('machine_model')
    .eq('source_type', 'scholarship_detail')
    .like('machine_model', 'stage5e-scholarship-autopilot-relaxed-wave-%')
    .order('published_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  let max = 0;
  for (const row of data ?? []) {
    const m = String(row.machine_model ?? '').match(/relaxed-wave-(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max > 0 ? max : null;
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error('Missing Supabase env');
    process.exit(2);
  }
  const db = createClient(url, key);

  const esXml = await fetchText('/sitemaps/locale-es-scholarships-detail-db.xml');
  const frXml = await fetchText('/sitemaps/locale-fr-scholarships-detail-db.xml');
  const liveEs = (esXml.match(/<loc>/g) ?? []).length;
  const liveFr = (frXml.match(/<loc>/g) ?? []).length;
  const eligibleEs = await countSitemapEligibleEsScholarshipDetails();
  const eligibleFr = await countSitemapEligibleFrScholarshipDetails();
  const lock = await isScholarshipAutopilotLocked();
  const lockRow = await getScholarshipAutopilotLockRow();
  const dbNextSafe = await suggestNextSafeStartWave(181);
  const progress = await loadWorkerProgressState();
  const nextSafeStartWave = mergeNextSafeStartWave(progress.row?.next_wave, dbNextSafe);
  const latestWave = await latestRelaxedWave(db);

  const { count: publishedRows } = await db
    .from('content_translations')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'scholarship_detail')
    .in('locale', ['es', 'fr'])
    .eq('status', 'published');

  const badSitemap =
    esXml.includes('/en/') ||
    frXml.includes('/en/') ||
    esXml.includes('review_required') ||
    frXml.includes('review_required') ||
    esXml.includes('/draft/') ||
    frXml.includes('/draft/');

  console.log(
    JSON.stringify(
      {
        sitemapIndex: (await fetch(`${BASE}/sitemap.xml`)).status,
        liveEs,
        liveFr,
        eligibleEs,
        eligibleFr,
        publishedEsFrRows: publishedRows,
        latestRelaxedWave: latestWave,
        advisoryLockHeld: lock.locked,
        lockRunId: lock.runId ?? lockRow.row?.run_id,
        lockExpiresAt: lock.expiresAt ?? lockRow.row?.expires_at,
        lockLockedAt: lock.lockedAt ?? lockRow.row?.locked_at,
        lockMessage: lock.message,
        dbNextSafeStartWave: dbNextSafe,
        nextSafeStartWave,
        workerProgress: progress.available
          ? {
              initialized: Boolean(progress.row),
              available: true,
              status: progress.row?.status ?? 'idle',
              nextWave: progress.row?.next_wave ?? null,
              lastAcceptedWave: progress.row?.last_accepted_wave ?? null,
              currentWave: progress.row?.current_wave ?? null,
              lastError: progress.row?.last_error ?? null,
              heartbeatAt: progress.row?.heartbeat_at ?? null,
              updatedAt: progress.row?.updated_at ?? null
            }
          : { available: false, message: progress.message },
        badSitemapContent: badSitemap
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
