import 'server-only';

import type { Database } from '@/types_db';
import {
  normalizeUsStateToCanonical,
  US_STATE_NAME_TO_CODE
} from '@/lib/constants/usStates';
import { createPublicClient } from '@/utils/supabase/public';

type ProviderHubListingRow =
  Database['public']['Views']['provider_hub_listing']['Row'];

export type UniversityAutocompleteSuggestion = {
  slug: string;
  label: string;
  stateCode: string | null;
  scholarshipCount: number;
};

function cleanSearchQuery(raw: string): string {
  return raw.replace(/[%_,]/g, ' ').trim().replace(/\s+/g, ' ');
}

function normalizeStateToCode(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  const canonical = normalizeUsStateToCanonical(trimmed);
  return canonical ? US_STATE_NAME_TO_CODE[canonical] ?? null : null;
}

function displayNameFromRow(row: ProviderHubListingRow): string {
  const display = row.display_name?.trim();
  return display || row.slug;
}

export async function fetchUniversityAutocompleteSuggestions(args: {
  query: string;
  stateInput?: string | null;
  limit?: number;
}): Promise<UniversityAutocompleteSuggestion[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  const query = cleanSearchQuery(args.query);
  if (query.length < 2) return [];

  const limit = Math.min(10, Math.max(1, Math.floor(args.limit ?? 8)));
  const stateCode = normalizeStateToCode(args.stateInput);
  const pattern = `%${query}%`;

  let req = supabase
    .from('provider_hub_listing')
    .select('slug, display_name, scholarship_count, state')
    .or(`display_name.ilike.${pattern},slug.ilike.${pattern}`)
    .order('scholarship_count', { ascending: false })
    .limit(limit * 3);

  if (stateCode) {
    req = req.eq('state', stateCode);
  }

  const { data, error } = await req;
  if (error || !data?.length) return [];

  const seen = new Set<string>();
  const out: UniversityAutocompleteSuggestion[] = [];
  for (const row of data as ProviderHubListingRow[]) {
    const slug = row.slug?.trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({
      slug,
      label: displayNameFromRow(row),
      stateCode: row.state?.trim() || null,
      scholarshipCount: Math.max(0, Number(row.scholarship_count) || 0)
    });
    if (out.length >= limit) break;
  }

  return out;
}
