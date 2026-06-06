import 'server-only';

import { unstable_cache } from 'next/cache';

import { US_STATE_CODE_TO_NAME } from '@/lib/constants/usStates';
import type { ProviderHubRow } from '@/lib/providers/providerHubTypes';
import type { ProvidersHubCountryBucket } from '@/lib/providers/providersHubCountryFilter';
import { cleanScholarshipGeneratedText } from '@/lib/scholarships/scholarshipSeoSanitizers';
import { createPublicClient } from '@/utils/supabase/public';

export type { ProviderHubRow } from '@/lib/providers/providerHubTypes';

const PROVIDER_HUB_LISTING =
  'provider_hub_listing' as unknown as 'scholarships';

function sanitizeSearchToken(raw: string): string {
  return raw.replace(/[,*%]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeStateFilter(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const code = raw.trim().toUpperCase();
  if (code.length !== 2) return undefined;
  if (!US_STATE_CODE_TO_NAME[code]) return undefined;
  return code;
}

export type ProviderHubFetchResult = {
  rows: ProviderHubRow[];
  total: number;
};

type ProviderHubEnrichmentRow = {
  slug: string;
  official_url: string | null;
  is_enriched: boolean | null;
  updated_at: string | null;
};

const fetchProviderHubListingCached = unstable_cache(
  async (
    token: string,
    stateCode: string,
    country: ProvidersHubCountryBucket,
    page: number,
    pageSize: number
  ): Promise<ProviderHubFetchResult> => {
    const supabase = createPublicClient();
    if (!supabase) return { rows: [], total: 0 };

    const from = (page - 1) * pageSize;
    let dataQuery = supabase
      .from(PROVIDER_HUB_LISTING)
      .select('slug, display_name, scholarship_count, state, ai_description', {
        count: 'exact'
      })
      .order('scholarship_count', { ascending: false })
      .range(from, from + pageSize - 1);

    if (country === 'us') {
      dataQuery = dataQuery.not('state', 'is', null);
    } else if (country === 'other') {
      dataQuery = dataQuery.is('state', null);
    }
    if (stateCode && country !== 'other') {
      dataQuery = dataQuery.filter('state', 'eq', stateCode);
    }
    if (token.length > 0) {
      const pattern = `%${token}%`;
      dataQuery = dataQuery.or(
        `display_name.ilike.${pattern},slug.ilike.${pattern}`
      );
    }

    const { data, count, error } = await dataQuery;
    if (error) {
      return { rows: [], total: 0 };
    }

    const rows = ((data ?? []) as unknown as ProviderHubRow[])
      .filter((r) => Boolean(r.slug?.trim()))
      .map((row) => ({
        ...row,
        ai_description:
          cleanScholarshipGeneratedText(row.ai_description) ?? null
      }));

    const slugs = [
      ...new Set(rows.map((row) => row.slug.trim()).filter(Boolean))
    ];
    if (slugs.length === 0) return { rows, total: count ?? 0 };

    const { data: providerRows } = await supabase
      .from('providers')
      .select('slug, official_url, is_enriched, updated_at')
      .in('slug', slugs);

    const bySlug = new Map(
      ((providerRows ?? []) as ProviderHubEnrichmentRow[]).map((row) => [
        row.slug,
        row
      ])
    );

    return {
      rows: rows.map((row) => {
        const provider = bySlug.get(row.slug.trim());
        return provider
          ? {
              ...row,
              official_url: provider.official_url,
              is_enriched: provider.is_enriched,
              updated_at: provider.updated_at
            }
          : row;
      }),
      total: count ?? 0
    };
  },
  ['provider-hub-listing-v4'],
  { revalidate: 300 }
);

export async function fetchProviderHubListing(options: {
  qRaw: string | undefined;
  stateRaw: string | undefined;
  country?: ProvidersHubCountryBucket;
  page?: number;
  pageSize?: number;
}): Promise<ProviderHubFetchResult> {
  const token = sanitizeSearchToken(options.qRaw ?? '');
  const stateCode = normalizeStateFilter(options.stateRaw);
  const country = options.country ?? 'all';
  const pageSize = options.pageSize ?? 9;
  const page = Math.max(1, Math.floor(options.page ?? 1) || 1);
  return fetchProviderHubListingCached(
    token,
    stateCode ?? '',
    country,
    page,
    pageSize
  );
}

export async function countUnenrichedProviders(): Promise<number> {
  const supabase = createPublicClient();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from('providers')
    .select('id', { count: 'exact', head: true })
    .eq('is_enriched', false);

  if (error) return 0;
  return count ?? 0;
}

export function isProvidersBulkEnrichUiEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.PROVIDERS_BULK_ENRICH_ENABLED === '1'
  );
}

export function parseProvidersHubStateParam(
  raw: string | string[] | undefined
): string | undefined {
  const s = typeof raw === 'string' ? raw : raw?.[0];
  return normalizeStateFilter(s);
}
