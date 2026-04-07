import 'server-only';

import { cache } from 'react';

import { enrichProviderData } from '@/lib/providers/enrichProviderData';
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
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import type { Database, Json } from '@/types_db';
import { createClient } from '@/utils/supabase/server';

const UUID_PARAM_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type { ProviderFaqItem, ProviderProfilePayload, SimilarProviderSummary };

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

function sourcesFromJson(value: Json | null | undefined): string[] {
  if (!value || !Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

type ProviderScholarshipStatRow = {
  slug: string;
  display_name: string | null;
  scholarship_count: number;
};

/** PostgREST view — typings omit `Views` in this repo's Supabase client; keep row shape explicit. */
const PROVIDER_STATS = 'provider_scholarship_stats' as unknown as 'scholarships';

function pickDisplayName(names: (string | null | undefined)[], fallback: string): string {
  const counts = new Map<string, number>();
  for (const n of names) {
    const t = n?.trim();
    if (!t) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  let best = fallback;
  let bestN = 0;
  for (const [name, c] of counts) {
    if (c > bestN) {
      best = name;
      bestN = c;
    }
  }
  return best;
}

type ProviderRow = Database['public']['Tables']['providers']['Row'];

export async function loadProviderProfilePage(
  rawParam: string,
  scholarshipsPage: number = 1
): Promise<ProviderProfilePayload | null> {
  const param = decodeURIComponent(rawParam || '').trim();
  if (!param) return null;

  const supabase = createClient();
  const admin = createServiceRoleSupabaseClient();

  const byUuid = UUID_PARAM_RE.test(param);
  let providerRow: ProviderRow | null = null;

  if (byUuid && admin) {
    const { data } = await admin
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

  const statRow = statRowRaw as ProviderScholarshipStatRow | null;

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

  if (!providerRow && admin) {
    const { data: sample } = await admin
      .from('scholarships')
      .select('provider_name, provider_url')
      .eq('provider_slug', slugForScholarships)
      .eq('is_active', true)
      .limit(80);

    const displayName = pickDisplayName(
      (sample ?? []).map((r) => r.provider_name),
      fallbackName
    );
    const officialUrl =
      (sample ?? []).map((r) => r.provider_url?.trim()).find(Boolean) ?? null;

    const { data: inserted, error: insErr } = await admin
      .from('providers')
      .insert({
        slug: slugForScholarships,
        display_name: displayName,
        official_url: officialUrl,
        is_enriched: false,
        ai_sources: [],
        ai_faq: []
      })
      .select('*')
      .single();

    if (!insErr && inserted) providerRow = inserted;
  }

  let providerId: string | null = providerRow?.id ?? null;
  let displayName = providerRow?.display_name ?? fallbackName;
  let officialUrl = providerRow?.official_url ?? null;
  let aiDescription = providerRow?.ai_description ?? null;
  let aiSources = providerRow ? sourcesFromJson(providerRow.ai_sources) : [];
  let aiFaq = providerRow ? faqFromJson(providerRow.ai_faq) : [];
  let isEnriched = providerRow?.is_enriched ?? false;

  if (providerId && admin && !isEnriched) {
    const enriched = await enrichProviderData(displayName);
    await admin
      .from('providers')
      .update({
        ai_description: enriched.description,
        ai_sources: enriched.sources,
        ai_faq: enriched.faq,
        state: enriched.state,
        is_enriched: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', providerId);

    const { data: refreshed } = await admin
      .from('providers')
      .select('*')
      .eq('id', providerId)
      .single();
    if (refreshed) {
      aiDescription = refreshed.ai_description;
      aiSources = sourcesFromJson(refreshed.ai_sources);
      aiFaq = faqFromJson(refreshed.ai_faq);
      isEnriched = refreshed.is_enriched;
      displayName = refreshed.display_name;
      officialUrl = refreshed.official_url;
    }
  }

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

  const similarRows = (similarRowsRaw ?? []) as ProviderScholarshipStatRow[];

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
