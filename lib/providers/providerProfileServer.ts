import 'server-only';

import { cache } from 'react';

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

const PROVIDER_STATS = 'provider_scholarship_stats' as unknown as 'scholarships';

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
  const fallbackName =
    (statRow.display_name && statRow.display_name.trim()) || slugForScholarships;

  if (!providerRow) {
    const { data: bySlug } = await supabase
      .from('providers')
      .select('*')
      .eq('slug', slugForScholarships)
      .maybeSingle();
    providerRow = bySlug;
  }

  const providerId: string | null = providerRow?.id ?? null;
  const displayName = providerRow?.display_name ?? fallbackName;
  const officialUrl = providerRow?.official_url ?? null;
  const aiDescription = effectiveProviderDescription(providerRow);
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

  const scholarships = (scholarshipRows ?? []).map((r) =>
    mapScholarshipRow(r as ScholarshipRow)
  );

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
      displayName:
        (r.display_name && r.display_name.trim()) || r.slug,
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
    scholarships,
    similarProviders
  };
}

/** Dedupes provider resolution + enrichment when `generateMetadata` and the page run in the same request. */
export const getCachedProviderProfilePage = cache(loadProviderProfilePage);
