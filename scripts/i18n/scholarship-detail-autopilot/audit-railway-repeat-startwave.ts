/**
 * Read-only post-incident audit: lock, sitemap, relaxed waves 181+, route samples.
 * Usage: npx tsx scripts/i18n/scholarship-detail-autopilot/audit-railway-repeat-startwave.ts
 */
import { createClient } from '@supabase/supabase-js';

import { BASE, loadEnvLocal } from './env';
import { isScholarshipAutopilotLocked } from './scholarship-autopilot-lock';
import {
  auditRelaxedWaveInDb,
  countSitemapEligibleEsScholarshipDetails,
  countSitemapEligibleFrScholarshipDetails,
  relaxedMachineModel
} from './load-persisted-wave';
import { suggestNextSafeStartWave } from './worker-start-wave-guard';

const RELAXED_PREFIX = 'stage5e-scholarship-autopilot-relaxed-wave-';

function relaxedMachineModel(waveNum: number): string {
  return `${RELAXED_PREFIX}${waveNum}`;
}

async function fetchText(path: string): Promise<string> {
  const res = await fetch(`${BASE}${path}`);
  return res.ok ? res.text() : '';
}

async function fetchStatus(path: string): Promise<number> {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  return res.status;
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

  const lockRpc = await isScholarshipAutopilotLocked();
  const { data: lockRow, error: lockErr } = await db
    .from('i18n_scholarship_worker_lock')
    .select('lock_key, run_id, locked_at, expires_at')
    .eq('lock_key', 'scholarship_detail_autopilot')
    .maybeSingle();

  const esXml = await fetchText('/sitemaps/locale-es-scholarships-detail-db.xml');
  const frXml = await fetchText('/sitemaps/locale-fr-scholarships-detail-db.xml');
  const liveEs = (esXml.match(/<loc>/g) ?? []).length;
  const liveFr = (frXml.match(/<loc>/g) ?? []).length;
  const eligibleEs = await countSitemapEligibleEsScholarshipDetails();
  const eligibleFr = await countSitemapEligibleFrScholarshipDetails();

  const badSitemap =
    esXml.includes('/en/') ||
    frXml.includes('/en/') ||
    esXml.includes('review_required') ||
    frXml.includes('review_required') ||
    esXml.includes('/draft/') ||
    frXml.includes('/draft/');

  const waves: {
    wave: number;
    total: number;
    es: number;
    fr: number;
    distinctSourceIds: number;
    statuses: Record<string, number>;
    qualityBelow85: number;
    accepted: boolean;
  }[] = [];

  for (let wave = 181; wave <= 200; wave++) {
    const { count } = await db
      .from('content_translations')
      .select('*', { count: 'exact', head: true })
      .eq('source_type', 'scholarship_detail')
      .in('locale', ['es', 'fr'])
      .eq('machine_model', relaxedMachineModel(wave));
    if ((count ?? 0) === 0) continue;
    const audit = await auditRelaxedWaveInDb(wave);
    const scholarships = audit.distinctSourceIds;
    const accepted =
      audit.total === scholarships * 2 &&
      audit.es === scholarships &&
      audit.fr === scholarships &&
      audit.qualityBelow85 === 0 &&
      (audit.statuses.published ?? 0) === audit.total;
    waves.push({
      wave,
      total: audit.total,
      es: audit.es,
      fr: audit.fr,
      distinctSourceIds: scholarships,
      statuses: audit.statuses,
      qualityBelow85: audit.qualityBelow85,
      accepted
    });
  }

  const latestAcceptedWave = waves.filter((w) => w.accepted).reduce((m, w) => Math.max(m, w.wave), 0);
  const nextSafeWave = await suggestNextSafeStartWave(181);

  const routeSamples: {
    slug: string;
    en: number;
    es: number;
    fr: number;
    unseededEs?: number;
    unseededFr?: number;
  }[] = [];

  const sampleWaves = waves.filter((w) => w.wave >= 181).slice(-3);
  for (const w of sampleWaves) {
    const model = relaxedMachineModel(w.wave);
    const { data: slugRows } = await db
      .from('content_translations')
      .select('source_id, translated_slug, locale')
      .eq('source_type', 'scholarship_detail')
      .eq('machine_model', model)
      .eq('locale', 'es')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(3);

    for (const row of slugRows ?? []) {
      const slug = String(row.translated_slug ?? '').trim();
      if (!slug) continue;
      const enPath = `/scholarships/${slug}`;
      const esPath = `/es/becas/${slug}`;
      const frPath = `/fr/bourses/${slug}`;
      const enStatus = await fetchStatus(enPath);
      const esStatus = await fetchStatus(esPath);
      const frStatus = await fetchStatus(frPath);
      routeSamples.push({ slug, en: enStatus, es: esStatus, fr: frStatus });
    }
  }

  const unseededSlug = 'zzzz-nonexistent-scholarship-autopilot-audit-2026';
  const unseededEs = await fetchStatus(`/es/becas/${unseededSlug}`);
  const unseededFr = await fetchStatus(`/fr/bourses/${unseededSlug}`);

  const startWave183 = waves.find((w) => w.wave === 183);
  const wave183ExpectedRows = 300;

  console.log(
    JSON.stringify(
      {
        auditedAt: new Date().toISOString(),
        lock: {
          rpcHeld: lockRpc.locked,
          rpcMessage: lockRpc.message,
          row: lockErr ? { error: lockErr.message } : lockRow,
          rowActive:
            lockRow?.expires_at && new Date(lockRow.expires_at).getTime() > Date.now()
        },
        sitemap: {
          liveEs,
          liveFr,
          eligibleEs,
          eligibleFr,
          badSitemapContent: badSitemap,
          hasEnInXml: esXml.includes('/en/') || frXml.includes('/en/')
        },
        relaxedWaves181Plus: waves,
        wave183DistinctScholarships: startWave183?.distinctSourceIds,
        latestAcceptedWave,
        nextSafeWave,
        wave183: startWave183
          ? {
              ...startWave183,
              verifyWouldFail: startWave183.total !== wave183ExpectedRows,
              note:
                startWave183.total > wave183ExpectedRows
                  ? 'likely repeated startWave=183 runs (accumulated machine_model rows)'
                  : undefined
            }
          : null,
        routeSamples,
        unseeded404: { es: unseededEs, fr: unseededFr }
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
