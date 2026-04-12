import 'server-only';

import type { Database, Json } from '@/types_db';
import { US_STATE_NAME_TO_CODE } from '@/lib/constants/usStates';
import {
  LIST_CARD_SELECT,
  mapScholarshipRow,
  type ScholarshipRow
} from '@/lib/scholarships/supabase';
import { SEO_ROUTE_STATE_SLUG_TO_LABEL } from '@/lib/scholarships/seoTags/routeSegmentMaps';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import type { ProviderFaqItem } from '@/lib/providers/providerProfileTypes';
import { parseProviderAiFaqJson } from '@/lib/providers/providerProfileServer';
import { createPublicClient } from '@/utils/supabase/public';

type ProviderHubListingView = Database['public']['Views']['provider_hub_listing']['Row'];

export type UniversityHubRow = {
  slug: string;
  displayName: string;
  stateCode: string;
  stateSlug: string;
  stateName: string;
  scholarshipCount: number;
  aiDescription: string | null;
};

type ProviderHubListingRow = ProviderHubListingView;

/**
 * Maps SEO state URL segment (e.g. `texas`) to USPS code (`TX`). Excludes `nationwide`.
 */
export function seoStateSlugToUspsCode(stateSlug: string): string | null {
  const key = stateSlug.trim().toLowerCase();
  const label = SEO_ROUTE_STATE_SLUG_TO_LABEL[key];
  if (!label || label === 'Nationwide') return null;
  const code = US_STATE_NAME_TO_CODE[label];
  return code ?? null;
}

function displayNameFromRow(row: ProviderHubListingRow): string {
  const d = row.display_name?.trim();
  return d || row.slug;
}

/**
 * Resolves a provider hub row when state + university segments match provider_hub_listing
 * (slug + USPS state). Used to distinguish university SEO pages from legacy two-segment scholarship listings.
 */
export async function fetchUniversityHubRow(
  stateSlug: string,
  universitySlug: string
): Promise<UniversityHubRow | null> {
  const stateCode = seoStateSlugToUspsCode(stateSlug);
  if (!stateCode) return null;

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('provider_hub_listing')
    .select('slug, display_name, scholarship_count, state, ai_description')
    .eq('slug', universitySlug.trim())
    .eq('state', stateCode)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as ProviderHubListingRow;
  if (!row.slug?.trim()) return null;

  const label = SEO_ROUTE_STATE_SLUG_TO_LABEL[stateSlug.trim().toLowerCase()];
  if (!label) return null;

  return {
    slug: row.slug.trim(),
    displayName: displayNameFromRow(row),
    stateCode,
    stateSlug: stateSlug.trim().toLowerCase(),
    stateName: label,
    scholarshipCount: Math.max(0, Number(row.scholarship_count) || 0),
    aiDescription: row.ai_description?.trim() || null
  };
}

export type UniversityHubScholarshipsResult = {
  scholarships: Scholarship[];
  error: string | null;
};

const HUB_PAGE_LIMIT = 48;

/**
 * Active scholarships for a provider (university) slug — server-only, bounded select list.
 */
export async function fetchScholarshipsForUniversitySlug(
  universitySlug: string
): Promise<UniversityHubScholarshipsResult> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('scholarships')
    .select(LIST_CARD_SELECT)
    .eq('provider_slug', universitySlug)
    .eq('is_active', true)
    .order('ranking_score', { ascending: false, nullsFirst: false })
    .limit(HUB_PAGE_LIMIT);

  if (error) {
    return {
      scholarships: [],
      error: error.message || 'Unable to load scholarships.'
    };
  }

  const rows = (data ?? []) as unknown as ScholarshipRow[];
  return {
    scholarships: rows.map((r) => mapScholarshipRow(r)),
    error: null
  };
}

/** Curated FAQ from `providers.ai_faq` when the provider row exists. */
export async function fetchProviderAiFaqBySlug(
  providerSlug: string
): Promise<ProviderFaqItem[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from('providers')
    .select('ai_faq')
    .eq('slug', providerSlug.trim())
    .maybeSingle();

  const row = data as { ai_faq: Json | null } | null;
  return parseProviderAiFaqJson(row?.ai_faq ?? null);
}

export type RelatedUniversityLink = {
  slug: string;
  displayName: string;
  scholarshipCount: number;
};

/**
 * Other providers in the same state (for internal linking).
 */
export async function fetchRelatedUniversitiesInState(
  stateCode: string,
  excludeSlug: string,
  limit = 12
): Promise<RelatedUniversityLink[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('provider_hub_listing')
    .select('slug, display_name, scholarship_count')
    .eq('state', stateCode)
    .neq('slug', excludeSlug)
    .order('scholarship_count', { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];

  return (data as ProviderHubListingRow[])
    .filter((r) => r.slug?.trim())
    .map((r) => ({
      slug: r.slug.trim(),
      displayName: displayNameFromRow(r),
      scholarshipCount: Math.max(0, Number(r.scholarship_count) || 0)
    }));
}
