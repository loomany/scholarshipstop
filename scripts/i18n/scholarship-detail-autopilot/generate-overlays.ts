import {
  scholarshipRowToPilotFacts,
  type ScholarshipDbFactRow
} from '@/lib/i18n/scholarshipPilot/fetchScholarshipPilotFacts';
import {
  buildScholarshipDetailPilotSeedRowsForSlugs,
  type ScholarshipDetailPilotSeedRow
} from '@/lib/i18n/scholarshipPilot/scholarshipPilotTranslationsData';
import { validateScholarshipPilotSeedRows } from '@/lib/i18n/scholarshipPilot/validateScholarshipPilotSeedRows';
import { createClient } from '@supabase/supabase-js';

import { loadEnvLocal } from './env';
import type { AutopilotCandidate } from './types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type GeneratedWave = {
  rows: ScholarshipDetailPilotSeedRow[];
  factsBySlug: Map<string, ReturnType<typeof scholarshipRowToPilotFacts>>;
  validationErrors: string[];
  machineModel: string;
};

export async function generateWaveOverlays(
  candidates: AutopilotCandidate[],
  waveNum: number,
  options?: { machineModel?: string; publishedAt?: string }
): Promise<GeneratedWave> {
  loadEnvLocal();
  const slugs = candidates.map((c) => c.slug);
  const machineModel = options?.machineModel ?? `stage5e-scholarship-autopilot-wave-${waveNum}`;
  const hour = 10 + (waveNum % 14);
  const publishedAt = options?.publishedAt ?? `2026-05-23T${String(hour).padStart(2, '0')}:30:00.000Z`;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: schRows, error } = await admin
    .from('scholarships')
    .select(
      'id, slug, updated_at, title, provider_name, award_amount_text, award_amount_min, award_amount_max, currency, deadline_text, deadline_date'
    )
    .in('slug', slugs);

  if (error) throw new Error(error.message);

  const slugToMeta = new Map<string, { id: string; updated_at: string | null }>();
  const factsBySlug = new Map<string, ReturnType<typeof scholarshipRowToPilotFacts>>();

  for (const row of schRows ?? []) {
    const slug = String(row.slug ?? '').trim().toLowerCase();
    const id = String(row.id ?? '').trim();
    if (!slug || !id) continue;
    slugToMeta.set(slug, { id, updated_at: row.updated_at ?? null });
    factsBySlug.set(slug, scholarshipRowToPilotFacts(row as ScholarshipDbFactRow));
  }

  const missing = slugs.filter((s) => !slugToMeta.has(s));
  if (missing.length) {
    throw new Error(`Missing slugs in DB: ${missing.join(', ')}`);
  }

  const rows = buildScholarshipDetailPilotSeedRowsForSlugs(
    slugToMeta,
    slugs,
    factsBySlug,
    machineModel,
    publishedAt
  );

  const validationErrors = validateScholarshipPilotSeedRows(rows, factsBySlug);

  for (const row of rows) {
    if (row.source_type !== 'scholarship_detail') {
      validationErrors.push(`${row.source_slug}: wrong source_type`);
    }
    if (row.status !== 'published') {
      validationErrors.push(`${row.source_slug} ${row.locale}: not published`);
    }
    if ((row.quality_score ?? 0) < 85) {
      validationErrors.push(`${row.source_slug} ${row.locale}: quality < 85`);
    }
    if (!UUID_RE.test(row.source_id)) {
      validationErrors.push(`${row.source_slug}: invalid UUID`);
    }
    if (!row.translated_title?.trim()) {
      validationErrors.push(`${row.source_slug} ${row.locale}: empty translated_title`);
    }
  }

  return { rows, factsBySlug, validationErrors, machineModel };
}
