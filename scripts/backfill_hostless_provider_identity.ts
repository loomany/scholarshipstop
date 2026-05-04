/**
 * Recover provider identity for active scholarships that still have no host and no
 * provider_name/provider_slug. Uses only high-confidence local patterns.
 *
 *   dotenv -e .env.local -- npx tsx scripts/backfill_hostless_provider_identity.ts
 *   dotenv -e .env.local -- npx tsx scripts/backfill_hostless_provider_identity.ts --write
 */

import { writeFile } from 'fs/promises';

import { createClient } from '@supabase/supabase-js';

import {
  generateProviderIdentityCandidate,
  providerIdentitySlugify,
  type ProviderIdentityCandidate
} from '../lib/providers/providerIdentityCandidate';
import type { Database } from '../types_db';

const AUDIT_JSON = 'hostless_provider_identity_candidates.json';

type Row = {
  id: string;
  slug: string | null;
  title: string | null;
  source: string | null;
  official_source_name: string | null;
  provider_name: string | null;
  provider_slug: string | null;
  provider_url: string | null;
  provider_mission: string | null;
  raw_data: unknown;
  host_country_codes: unknown;
  is_active: boolean | null;
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

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  return createClient<Database>(url, key);
}

function isIso(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{2}$/.test(value.trim().toUpperCase());
}

function hasValidHost(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some(isIso);
}

function isBlank(value: string | null): boolean {
  return !value || value.trim().length === 0;
}

function missionExcerpt(value: string | null): string | null {
  const normalized = value?.trim().replace(/\s+/g, ' ');
  if (!normalized) return null;
  return normalized.length > 220 ? `${normalized.slice(0, 217).trimEnd()}...` : normalized;
}

function compactText(value: unknown): string | null {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') || null : null;
}

function rawItemDescription(row: Row): string | null {
  if (typeof row.raw_data !== 'object' || row.raw_data === null || Array.isArray(row.raw_data)) {
    return null;
  }
  const rawItem = (row.raw_data as { raw_item?: unknown }).raw_item;
  if (typeof rawItem !== 'object' || rawItem === null || Array.isArray(rawItem)) return null;
  return compactText((rawItem as { description?: unknown }).description);
}

function stripScholarshipsComLead(value: string): string {
  return value
    .replace(/^Amount:\s*.*?\s+-\s+Deadline:\s*.*?\s+-\s+/i, '')
    .trim();
}

function cleanCandidateName(value: string): string | null {
  const cleaned = value
    .replace(/\s+/g, ' ')
    .replace(/,\s*a\s+501\s*\(c\)\s*\(3\)\s+organization\b/i, '')
    .replace(/,\s*a\s+501\s*\(c\)\s*3\s+organization\b/i, '')
    .replace(/,\s*a\s+501c3\s+organization\b/i, '')
    .replace(/^[“"'‘’]+|[“"'‘’.,;:]+$/g, '')
    .replace(/^(?:the|a|an)\s+/i, '')
    .trim();
  if (!cleaned) return null;
  const lower = cleaned.toLowerCase();
  if (['we', 'our', 'this scholarship', 'applicants', 'students'].includes(lower)) return null;
  if (/\b(scholarship|grant|fellowship|award|application|program)\b/i.test(cleaned)) {
    const allowedProgramNamedProvider =
      /\bscholarship\s+(?:foundation|fund|trust)\b/i.test(cleaned) ||
      /\b(?:foundation|fund|trust)\b.*\bscholarships?\b/i.test(cleaned);
    if (!allowedProgramNamedProvider) return null;
  }
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 8) return null;
  return cleaned;
}

function candidateFromRawDescription(row: Row): ProviderIdentityCandidate | null {
  const description = rawItemDescription(row);
  if (!description) return null;
  const body = stripScholarshipsComLead(description);
  const patterns = [
    /^(.{2,120}?)\s+(?:is|are)\s+(?:proud|excited|pleased|eager|honored|delighted)\s+to\s+(?:offer|announce|introduce|provide|sponsor|award|present|have established)\b/i,
    /^(.{2,120}?)\s+(?:offers|awards|grants|provides|sponsors|administers|supports)\b/i,
    /^The\s+(.{2,120}?\b(?:Foundation|Fund|Trust|Association|Society|Club|Council|Committee|Institute|University|College|School|Organization|Organisation|Center|Centre|Inc\.?|LLC|Credit Union|Bank)\b)\s+(?:is|offers|awards|grants|provides|sponsors|administers|supports)\b/i
  ];
  for (const pattern of patterns) {
    const match = body.match(pattern);
    const name = match?.[1] ? cleanCandidateName(match[1]) : null;
    if (!name) continue;
    const slug = providerIdentitySlugify(name);
    if (!slug) continue;
    return {
      providerName: name,
      providerSlug: slug,
      confidence: 'high',
      reason: 'scholarships.com raw description begins with provider action phrase'
    };
  }
  return null;
}

async function main() {
  const write = hasFlag('--write');
  const supabase = serviceSupabase();
  const rows: Row[] = [];
  const pageSize = 200;
  let from = 0;
  for (;;) {
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
          'provider_mission',
          'raw_data',
          'host_country_codes',
          'is_active'
        ].join(',')
      )
      .eq('is_active', true)
      .is('provider_name', null)
      .is('provider_slug', null)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    for (const row of (data ?? []) as Row[]) {
      if (!hasValidHost(row.host_country_codes)) rows.push(row);
    }
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  const candidates: CandidateReportRow[] = [];
  for (const row of rows) {
    if (!isBlank(row.provider_name) || !isBlank(row.provider_slug)) continue;
    const candidate = generateProviderIdentityCandidate({
      providerName: row.provider_name,
      providerSlug: row.provider_slug,
      providerMission: row.provider_mission,
      source: row.source,
      officialSourceName: row.official_source_name
    }) ?? candidateFromRawDescription(row);
    if (!candidate || candidate.confidence !== 'high') continue;
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

  await writeFile(
    AUDIT_JSON,
    JSON.stringify(
      {
        mode: write ? 'write' : 'dry-run',
        inspected_hostless_without_provider_identity: rows.length,
        candidates: candidates.length,
        rows: candidates
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log(
    JSON.stringify(
      {
        mode: write ? 'write' : 'dry-run',
        inspected_hostless_without_provider_identity: rows.length,
        candidates: candidates.length,
        audit: AUDIT_JSON
      },
      null,
      2
    )
  );

  if (!write || candidates.length === 0) return;

  let updated = 0;
  let failed = 0;
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
    if (error) {
      failed += 1;
      console.warn(`Failed ${candidate.scholarship_id}: ${error.message}`);
    } else {
      updated += 1;
    }
  }

  console.log(JSON.stringify({ updated, failed }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
