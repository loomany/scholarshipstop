import 'server-only';

import { cache } from 'react';
import { unstable_cache } from 'next/cache';

import { PROVIDER_PROFILE_SCHOLARSHIPS_PAGE_SIZE } from '@/lib/providers/providerProfilePagination';
import type {
  ProviderFaqItem,
  ProviderProfilePayload,
  SimilarProviderSummary
} from '@/lib/providers/providerProfileTypes';
import {
  LIST_CARD_SELECT,
  mapScholarshipRow,
  type ScholarshipRow
} from '@/lib/scholarships/supabase';
import { compareScholarshipsByDeadlineState } from '@/lib/scholarships/scholarshipDeadlineState';
import { filterOutCompetitorAggregatorUrls } from '@/lib/providers/enrichProviderDataCore';
import type { Database, Json } from '@/types_db';
import { createPublicClient } from '@/utils/supabase/public';

const UUID_PARAM_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type { ProviderFaqItem, ProviderProfilePayload, SimilarProviderSummary };

function normalizeProviderAiDescription(
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeProviderText(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/\s+/g, ' ');
  return normalized ? normalized : null;
}

function isLikelyProviderDisplayName(value: string | null | undefined): value is string {
  const normalized = normalizeProviderText(value);
  if (!normalized) return false;
  if (normalized.length > 120) return false;
  if (normalized.split(/\s+/).length > 14) return false;
  if (/[.!?]\s/.test(normalized) || /[•:]/.test(normalized)) return false;
  return true;
}

function hostLabelFromUrl(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = parsed.hostname.replace(/^www\./i, '');
    return host || null;
  } catch {
    return null;
  }
}

function titleCaseSlug(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function providerDisplayNameFallback(slug: string, officialUrl: string | null): string {
  const host = hostLabelFromUrl(officialUrl);
  if (isLikelyProviderDisplayName(host)) return host;

  const fromSlug = titleCaseSlug(slug);
  return isLikelyProviderDisplayName(fromSlug) ? fromSlug : 'Scholarship provider';
}

function resolveProviderDisplayName({
  providerDisplayName,
  statDisplayName,
  slug,
  officialUrl
}: {
  providerDisplayName: string | null | undefined;
  statDisplayName: string | null | undefined;
  slug: string;
  officialUrl: string | null | undefined;
}): string {
  const candidates = [providerDisplayName, statDisplayName];
  for (const candidate of candidates) {
    if (isLikelyProviderDisplayName(candidate)) {
      return normalizeProviderText(candidate)!;
    }
  }
  return providerDisplayNameFallback(slug, officialUrl ?? null);
}

function displayNameDescriptionFallback(
  providerDisplayName: string | null | undefined,
  statDisplayName: string | null | undefined
): string | null {
  for (const candidate of [providerDisplayName, statDisplayName]) {
    const normalized = normalizeProviderText(candidate);
    if (normalized && !isLikelyProviderDisplayName(normalized)) {
      return normalized;
    }
  }
  return null;
}

function faqFromJson(value: Json | null | undefined): ProviderFaqItem[] {
  if (!value || !Array.isArray(value)) return [];
  const out: ProviderFaqItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const q =
      (typeof o.question === 'string' && o.question.trim()) ||
      (typeof o.q === 'string' && o.q.trim()) ||
      '';
    const a =
      (typeof o.answer === 'string' && o.answer.trim()) ||
      (typeof o.a === 'string' && o.a.trim()) ||
      '';
    if (q && a) out.push({ question: q, answer: a });
  }
  return out;
}

/** Shared parser for `providers.ai_faq` (e.g. university hub + profile). */
export function parseProviderAiFaqJson(
  value: Json | null | undefined
): ProviderFaqItem[] {
  return faqFromJson(value);
}

function sourcesFromJson(value: Json | null | undefined): string[] {
  if (!value || !Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

type ProviderRow = Database['public']['Tables']['providers']['Row'];

/** Canonical columns may exist in DB before `types_db` is regenerated (optional dual-read). */
type ProviderRowWithCanonicalFields = ProviderRow & {
  description?: string | null;
  sources?: Json | null;
};

/** Prefer canonical `description`, then legacy `ai_description`. */
function effectiveProviderDescription(row: ProviderRow | null | undefined): string | null {
  if (!row) return null;
  const extended = row as ProviderRowWithCanonicalFields;
  const primary = normalizeProviderAiDescription(extended.description);
  if (primary) return primary;
  return normalizeProviderAiDescription(extended.ai_description);
}

/** Prefer non-empty canonical `sources`, then legacy `ai_sources`. */
function effectiveProviderSources(row: ProviderRow | null | undefined): string[] {
  if (!row) return [];
  const extended = row as ProviderRowWithCanonicalFields;
  const fromCanonical = sourcesFromJson(extended.sources ?? undefined);
  if (fromCanonical.length > 0) return fromCanonical;
  return sourcesFromJson(extended.ai_sources);
}

type ProviderScholarshipStatRow = {
  slug: string;
  display_name: string | null;
  scholarship_count: number;
};

type ProviderScholarshipAggregateRow = {
  award_amount_numeric_sort: number | string | null;
  updated_at: string | null;
};

type ProviderProfileAggregate = {
  totalAwardAmount: number | null;
  knownAwardAmountCount: number;
  lastScholarshipUpdatedAt: string | null;
};

type ProviderProfileAggregateRpcRow = {
  total_award_amount: number | string | null;
  known_award_amount_count: number | string | null;
  last_scholarship_updated_at: string | null;
};

const PROVIDER_STATS = 'provider_scholarship_stats' as unknown as 'scholarships';

function numberFromDb(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function fetchProviderProfileAggregateFallback(
  supabase: NonNullable<ReturnType<typeof createPublicClient>>,
  providerSlug: string
): Promise<ProviderProfileAggregate> {
  const { data: aggregateRowsRaw } = await supabase
    .from('scholarships')
    .select('award_amount_numeric_sort, updated_at')
    .eq('provider_slug', providerSlug)
    .eq('is_active', true)
    .range(0, 9999);

  const aggregateRows = (aggregateRowsRaw ?? []) as ProviderScholarshipAggregateRow[];
  let totalAwardAmount = 0;
  let knownAwardAmountCount = 0;
  let lastScholarshipUpdatedAt: string | null = null;

  for (const row of aggregateRows) {
    const award = numberFromDb(row.award_amount_numeric_sort);
    if (award != null && award > 0) {
      totalAwardAmount += award;
      knownAwardAmountCount += 1;
    }

    const updated = row.updated_at?.trim();
    if (
      updated &&
      (!lastScholarshipUpdatedAt ||
        new Date(updated).getTime() > new Date(lastScholarshipUpdatedAt).getTime())
    ) {
      lastScholarshipUpdatedAt = updated;
    }
  }

  return {
    totalAwardAmount: knownAwardAmountCount > 0 ? totalAwardAmount : null,
    knownAwardAmountCount,
    lastScholarshipUpdatedAt
  };
}

async function fetchProviderProfileAggregate(
  supabase: NonNullable<ReturnType<typeof createPublicClient>>,
  providerSlug: string
): Promise<ProviderProfileAggregate> {
  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        fn: 'provider_profile_scholarship_aggregate',
        args: { p_provider_slug: string }
      ) => Promise<{
        data: ProviderProfileAggregateRpcRow[] | ProviderProfileAggregateRpcRow | null;
        error: { message?: string } | null;
      }>;
    }
  ).rpc('provider_profile_scholarship_aggregate', {
    p_provider_slug: providerSlug
  });
  if (error) {
    return fetchProviderProfileAggregateFallback(supabase, providerSlug);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      totalAwardAmount: null,
      knownAwardAmountCount: 0,
      lastScholarshipUpdatedAt: null
    };
  }

  const totalAwardAmount = numberFromDb(row.total_award_amount);
  const knownAwardAmountCount = numberFromDb(row.known_award_amount_count) ?? 0;

  return {
    totalAwardAmount:
      knownAwardAmountCount > 0 && totalAwardAmount != null
        ? totalAwardAmount
        : null,
    knownAwardAmountCount,
    lastScholarshipUpdatedAt: row.last_scholarship_updated_at ?? null
  };
}

export const resolveProviderProfileSlug = cache(
  async (rawParam: string): Promise<string | null> => {
    const param = decodeURIComponent(rawParam || '').trim();
    if (!param) return null;
    if (!UUID_PARAM_RE.test(param)) return param;

    const supabase = createPublicClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from('providers')
      .select('slug')
      .eq('id', param)
      .maybeSingle();

    return data?.slug?.trim() || null;
  }
);

export async function loadProviderProfilePage(
  rawParam: string,
  scholarshipsPage: number = 1
): Promise<ProviderProfilePayload | null> {
  const param = decodeURIComponent(rawParam || '').trim();
  if (!param) return null;

  const supabase = createPublicClient();
  if (!supabase) return null;

  const byUuid = UUID_PARAM_RE.test(param);
  let providerRow: ProviderRow | null = null;

  if (byUuid) {
    const { data } = await supabase
      .from('providers')
      .select('*')
      .eq('id', param)
      .maybeSingle();
    providerRow = data;
  }

  const slugForScholarships = providerRow?.slug ?? (byUuid ? null : param);
  if (!slugForScholarships) return null;

  const { data: statRowRaw, error: statError } = await supabase
    .from(PROVIDER_STATS)
    .select('slug, display_name, scholarship_count')
    .eq('slug', slugForScholarships)
    .maybeSingle();

  const statRow = statRowRaw as unknown as ProviderScholarshipStatRow | null;

  if (statError || !statRow) return null;

  const totalScholarshipCount = Number(statRow.scholarship_count) || 0;

  if (!providerRow) {
    const { data: bySlug } = await supabase
      .from('providers')
      .select('*')
      .eq('slug', slugForScholarships)
      .maybeSingle();
    providerRow = bySlug;
  }

  const providerId: string | null = providerRow?.id ?? null;
  const officialUrl = providerRow?.official_url ?? null;
  const displayName = resolveProviderDisplayName({
    providerDisplayName: providerRow?.display_name,
    statDisplayName: statRow.display_name,
    slug: slugForScholarships,
    officialUrl
  });
  const aiDescription =
    effectiveProviderDescription(providerRow) ??
    displayNameDescriptionFallback(providerRow?.display_name, statRow.display_name);
  /** Display-only — omit competitor aggregators even if legacy rows still store them in JSON. */
  const aiSources = filterOutCompetitorAggregatorUrls(
    effectiveProviderSources(providerRow)
  );
  const aiFaq = providerRow ? parseProviderAiFaqJson(providerRow.ai_faq) : [];
  const isEnriched = providerRow?.is_enriched ?? false;

  const page = Math.max(1, Math.floor(scholarshipsPage) || 1);
  const pageSize = PROVIDER_PROFILE_SCHOLARSHIPS_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  const { data: scholarshipRows } =
    totalScholarshipCount > 0
      ? await supabase
          .from('scholarships')
          .select(LIST_CARD_SELECT)
          .eq('provider_slug', slugForScholarships)
          .eq('is_active', true)
          .order('ranking_score', { ascending: false, nullsFirst: false })
          .range(offset, offset + pageSize - 1)
      : { data: [] as ScholarshipRow[] };

  const scholarships = (scholarshipRows ?? [])
    .map((r) => mapScholarshipRow(r as ScholarshipRow))
    .sort(compareScholarshipsByDeadlineState);

  const aggregate =
    totalScholarshipCount > 0
      ? await fetchProviderProfileAggregate(supabase, slugForScholarships)
      : {
          totalAwardAmount: null,
          knownAwardAmountCount: 0,
          lastScholarshipUpdatedAt: null
        };
  const lastUpdatedAt =
    aggregate.lastScholarshipUpdatedAt &&
    (!providerRow?.updated_at ||
      new Date(aggregate.lastScholarshipUpdatedAt).getTime() >
        new Date(providerRow.updated_at).getTime())
      ? aggregate.lastScholarshipUpdatedAt
      : providerRow?.updated_at ?? null;

  const { data: similarRowsRaw } = await supabase
    .from(PROVIDER_STATS)
    .select('slug, display_name, scholarship_count')
    .neq('slug', slugForScholarships)
    .order('scholarship_count', { ascending: false })
    .limit(12);

  const similarRows = (similarRowsRaw ?? []) as unknown as ProviderScholarshipStatRow[];

  const similarProviders: SimilarProviderSummary[] = similarRows
    .filter((r) => r.slug && r.slug !== slugForScholarships)
    .slice(0, 4)
    .map((r) => ({
      slug: r.slug,
      displayName: resolveProviderDisplayName({
        providerDisplayName: null,
        statDisplayName: r.display_name,
        slug: r.slug,
        officialUrl: null
      }),
      scholarshipCount: r.scholarship_count ?? 0
    }));

  return {
    providerId,
    slug: slugForScholarships,
    displayName,
    officialUrl,
    aiDescription,
    aiSources,
    aiFaq,
    isEnriched,
    totalScholarshipCount,
    totalAwardAmount: aggregate.totalAwardAmount,
    knownAwardAmountCount: aggregate.knownAwardAmountCount,
    lastUpdatedAt,
    scholarships,
    similarProviders
  };
}

const getProviderProfilePageCachedAcrossRequests = unstable_cache(
  loadProviderProfilePage,
  ['provider-profile-page-v2'],
  { revalidate: 60 }
);

/** Dedupes provider resolution + enrichment for metadata/page and keeps public profiles warm briefly. */
export const getCachedProviderProfilePage = cache(
  getProviderProfilePageCachedAcrossRequests
);
