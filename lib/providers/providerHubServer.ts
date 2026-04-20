import 'server-only';

import { US_STATE_CODE_TO_NAME } from '@/lib/constants/usStates';
import type { ProviderHubRow } from '@/lib/providers/providerHubTypes';
import { createClient } from '@/utils/supabase/server';

export type { ProviderHubRow } from '@/lib/providers/providerHubTypes';

const PROVIDER_HUB_LISTING =
  'provider_hub_listing' as unknown as 'scholarships';

function sanitizeSearchToken(raw: string): string {
  return raw
    .replace(/[,*%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

export async function fetchProviderHubListing(options: {
  qRaw: string | undefined;
  stateRaw: string | undefined;
  page?: number;
  pageSize?: number;
}): Promise<ProviderHubFetchResult> {
  const supabase = createClient();
  const token = sanitizeSearchToken(options.qRaw ?? '');
  const stateCode = normalizeStateFilter(options.stateRaw);
  const pageSize = options.pageSize ?? 9;
  const page = Math.max(1, Math.floor(options.page ?? 1) || 1);
  const from = (page - 1) * pageSize;

  let countQuery = supabase
    .from(PROVIDER_HUB_LISTING)
    .select('slug', { count: 'exact', head: true });

  if (stateCode) {
    countQuery = countQuery.eq('state', stateCode);
  }
  if (token.length > 0) {
    const pattern = `%${token}%`;
    countQuery = countQuery.or(
      `display_name.ilike.${pattern},slug.ilike.${pattern}`
    );
  }

  const { count, error: countErr } = await countQuery;
  if (countErr) {
    return { rows: [], total: 0 };
  }

  const total = count ?? 0;

  let dataQuery = supabase
    .from(PROVIDER_HUB_LISTING)
    .select('slug, display_name, scholarship_count, state, ai_description')
    .order('scholarship_count', { ascending: false })
    .range(from, from + pageSize - 1);

  if (stateCode) {
    dataQuery = dataQuery.eq('state', stateCode);
  }
  if (token.length > 0) {
    const pattern = `%${token}%`;
    dataQuery = dataQuery.or(
      `display_name.ilike.${pattern},slug.ilike.${pattern}`
    );
  }

  const { data, error } = await dataQuery;
  if (error) {
    return { rows: [], total: 0 };
  }

  const rows = ((data ?? []) as ProviderHubRow[]).filter((r) =>
    Boolean(r.slug?.trim())
  );

  return { rows, total };
}

export async function countUnenrichedProviders(): Promise<number> {
  const supabase = createClient();
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
