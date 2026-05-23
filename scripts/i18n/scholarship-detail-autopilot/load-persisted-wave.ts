/**
 * Load exact persisted wave rows from DB or publish CSV (never regenerates candidates).
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { DATE, loadEnvLocal } from './env';
import type { AutopilotCandidate } from './types';

const MACHINE_PREFIX = 'stage5e-scholarship-autopilot-wave-';

type TranslationRow = {
  source_id: string;
  locale: string;
  status: string | null;
  quality_score: number | null;
  machine_model: string | null;
};

export type PersistedWaveAudit = {
  total: number;
  es: number;
  fr: number;
  distinctSourceIds: number;
  distinctSlugs: string[];
  statuses: Record<string, number>;
  qualityScores: Record<string, number>;
  qualityBelow85: number;
  machineModel: string;
};

export function waveRowsCsvPath(waveNum: number): string {
  return join(
    process.cwd(),
    'reports/seo',
    `i18n-stage5e-6-autopilot-wave-${waveNum}-rows-${DATE}.csv`
  );
}

function parseWaveCsvSlugs(csvPath: string): string[] {
  const slugs = new Set<string>();
  for (const line of readFileSync(csvPath, 'utf8').split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const m = line.match(/^"scholarship_detail","[^"]+","([^"]+)"/);
    if (m) slugs.add(m[1]!.trim().toLowerCase());
  }
  return [...slugs];
}

function resolveWaveCsvPath(waveNum: number): string | null {
  let csvPath = waveRowsCsvPath(waveNum);
  if (existsSync(csvPath)) return csvPath;
  const dir = join(process.cwd(), 'reports/seo');
  const alt = readdirSync(dir)
    .filter((f) => f.startsWith(`i18n-stage5e-6-autopilot-wave-${waveNum}-rows-`) && f.endsWith('.csv'))
    .sort()
    .pop();
  return alt ? join(dir, alt) : null;
}

async function slugsFromScholarshipIds(
  db: ReturnType<typeof createClient>,
  sourceIds: string[]
): Promise<string[]> {
  if (!sourceIds.length) return [];
  const slugs = new Set<string>();
  const chunk = 40;
  for (let i = 0; i < sourceIds.length; i += chunk) {
    const slice = sourceIds.slice(i, i + chunk);
    const { data, error } = await db.from('scholarships').select('id, slug').in('id', slice);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const slug = String(row.slug ?? '').trim().toLowerCase();
      if (slug) slugs.add(slug);
    }
  }
  return [...slugs];
}

export async function auditWaveInDb(waveNum: number): Promise<PersistedWaveAudit> {
  loadEnvLocal();
  const machineModel = `${MACHINE_PREFIX}${waveNum}`;
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await db
    .from('content_translations')
    .select('source_id, locale, status, quality_score, machine_model')
    .eq('source_type', 'scholarship_detail')
    .in('locale', ['es', 'fr'])
    .eq('machine_model', machineModel);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as TranslationRow[];
  const sourceIds = [...new Set(rows.map((r) => String(r.source_id).trim()).filter(Boolean))];
  const distinctSlugs = await slugsFromScholarshipIds(db, sourceIds);

  const statuses: Record<string, number> = {};
  const qualityScores: Record<string, number> = {};
  for (const r of rows) {
    const s = String(r.status ?? 'unknown');
    statuses[s] = (statuses[s] ?? 0) + 1;
    const q = String(r.quality_score ?? 'null');
    qualityScores[q] = (qualityScores[q] ?? 0) + 1;
  }

  return {
    total: rows.length,
    es: rows.filter((r) => r.locale === 'es').length,
    fr: rows.filter((r) => r.locale === 'fr').length,
    distinctSourceIds: sourceIds.length,
    distinctSlugs,
    statuses,
    qualityScores,
    qualityBelow85: rows.filter((r) => (r.quality_score ?? 0) < 85).length,
    machineModel
  };
}

/** Prefer scholarship slugs from DB rows; fall back to publish CSV source_slug column. */
export async function loadPersistedWaveSlugs(waveNum: number): Promise<{
  slugs: string[];
  source: 'db' | 'csv';
  audit: PersistedWaveAudit;
}> {
  const audit = await auditWaveInDb(waveNum);

  if (audit.distinctSlugs.length > 0) {
    return { slugs: audit.distinctSlugs, source: 'db', audit };
  }

  const csvPath = resolveWaveCsvPath(waveNum);
  if (!csvPath) {
    throw new Error(`No DB scholarship slugs and missing CSV for wave ${waveNum}`);
  }

  return {
    slugs: parseWaveCsvSlugs(csvPath),
    source: 'csv',
    audit
  };
}

async function listSitemapEligibleByLocale(): Promise<{ es: number; fr: number }> {
  const { listPublishedScholarshipDetailTranslations } = await import(
    '@/lib/i18n/scholarshipPilot/listPublishedScholarshipDetailTranslations'
  );
  const listed = await listPublishedScholarshipDetailTranslations();
  return {
    es: new Set(listed.filter((r) => r.locale === 'es').map((r) => r.scholarshipSlug)).size,
    fr: new Set(listed.filter((r) => r.locale === 'fr').map((r) => r.scholarshipSlug)).size
  };
}

export async function countSitemapEligibleEsScholarshipDetails(): Promise<number> {
  const counts = await listSitemapEligibleByLocale();
  return counts.es;
}

export async function countSitemapEligibleFrScholarshipDetails(): Promise<number> {
  const counts = await listSitemapEligibleByLocale();
  return counts.fr;
}

export async function countPublishedEsScholarshipDetails(): Promise<number> {
  loadEnvLocal();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { count, error } = await db
    .from('content_translations')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'scholarship_detail')
    .eq('locale', 'es')
    .eq('status', 'published');
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export function slugsToSmokeCandidates(slugs: string[], waveNum: number): AutopilotCandidate[] {
  return slugs.map((slug, i) => ({
    rank: i + 1,
    wave: waveNum,
    slug,
    scholarship_uuid: '',
    title: slug,
    provider: '',
    amount: '',
    deadline: '',
    category: '',
    source_url_present: true,
    en_url: `https://scholarshiptop.com/scholarships/${slug}`,
    indexable_en: true,
    completeness_score: 0,
    risk_score: 0,
    include_yes_no: 'yes',
    skip_reason: ''
  }));
}
