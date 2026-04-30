import { createClient } from '@supabase/supabase-js';

import {
  generateProviderIdentityCandidate,
  type ProviderIdentityCandidate
} from '../lib/providers/providerIdentityCandidate';

type ScholarshipCandidateRow = {
  id: string;
  slug: string | null;
  title: string | null;
  source: string | null;
  official_source_name: string | null;
  provider_name: string | null;
  provider_slug: string | null;
  provider_url: string | null;
  provider_mission: string | null;
};

type CandidateReportRow = {
  scholarship_id: string;
  scholarship_slug: string | null;
  title: string | null;
  candidate_provider_name: string;
  candidate_provider_slug: string;
  provider_url: string | null;
  provider_mission_excerpt: string | null;
  confidence: ProviderIdentityCandidate['confidence'];
  reason: string;
  source: string | null;
};

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function argValue(name: string): string | null {
  const prefix = `${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() || null : null;
}

function env(name: string): string {
  return process.env[name]?.trim() ?? '';
}

function missionExcerpt(value: string | null): string | null {
  const normalized = value?.trim().replace(/\s+/g, ' ');
  if (!normalized) return null;
  return normalized.length > 180 ? `${normalized.slice(0, 177).trimEnd()}...` : normalized;
}

async function fetchRows(
  supabase: ReturnType<typeof createClient>
): Promise<ScholarshipCandidateRow[]> {
  const rows: ScholarshipCandidateRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('scholarships')
      .select(
        [
          'id',
          'slug',
          'title',
          'source',
          'official_source_name',
          'provider_name',
          'provider_slug',
          'provider_url',
          'provider_mission'
        ].join(', ')
      )
      .eq('is_active', true)
      .eq('is_indexable', true)
      .is('provider_name', null)
      .is('provider_slug', null)
      .or('provider_url.not.is.null,provider_mission.not.is.null')
      .range(from, from + 999);

    if (error) throw error;
    rows.push(...((data ?? []) as ScholarshipCandidateRow[]));
    if (!data || data.length < 1000) return rows;
  }
}

async function main() {
  const write = hasFlag('--write');
  const onlySlug = argValue('--only-slug');
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  const supabase = createClient(url, key);
  const rows = await fetchRows(supabase);
  const candidates: CandidateReportRow[] = [];

  for (const row of rows) {
    if (onlySlug && row.slug !== onlySlug) continue;

    const candidate = generateProviderIdentityCandidate({
      providerName: row.provider_name,
      providerSlug: row.provider_slug,
      providerMission: row.provider_mission,
      source: row.source,
      officialSourceName: row.official_source_name
    });
    if (!candidate) continue;

    candidates.push({
      scholarship_id: row.id,
      scholarship_slug: row.slug,
      title: row.title,
      candidate_provider_name: candidate.providerName,
      candidate_provider_slug: candidate.providerSlug,
      provider_url: row.provider_url,
      provider_mission_excerpt: missionExcerpt(row.provider_mission),
      confidence: candidate.confidence,
      reason: candidate.reason,
      source: row.source
    });
  }

  console.log(
    JSON.stringify(
      {
        mode: write ? 'write' : 'dry-run',
        onlySlug,
        inspected: rows.length,
        candidates: candidates.length,
        rows: candidates
      },
      null,
      2
    )
  );

  if (!write || candidates.length === 0) return;

  let updated = 0;
  for (const candidate of candidates) {
    const { error } = await supabase
      .from('scholarships')
      .update({
        provider_name: candidate.candidate_provider_name,
        provider_slug: candidate.candidate_provider_slug
      })
      .eq('id', candidate.scholarship_id)
      .is('provider_name', null)
      .is('provider_slug', null);

    if (error) throw error;
    updated += 1;
  }

  console.error(
    `Updated ${updated} scholarship row(s). Run providers:enrich next to sync providers and AI enrichment.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
