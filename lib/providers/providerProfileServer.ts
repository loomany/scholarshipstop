import 'server-only';

import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { enrichProviderData } from '@/lib/providers/enrichProviderData';
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

export type ProviderFaqItem = { question: string; answer: string };

export type SimilarProviderSummary = {
  slug: string;
  displayName: string;
  scholarshipCount: number;
};

export type ProviderProfilePayload = {
  id: string;
  slug: string;
  displayName: string;
  officialUrl: string | null;
  aiDescription: string | null;
  aiSources: string[];
  aiFaq: ProviderFaqItem[];
  isEnriched: boolean;
  totalScholarshipCount: number;
  scholarships: Scholarship[];
  similarProviders: SimilarProviderSummary[];
};

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

function rowToPayload(
  row: ProviderRow,
  extras: {
    totalScholarshipCount: number;
    scholarships: Scholarship[];
    similarProviders: SimilarProviderSummary[];
  }
): ProviderProfilePayload {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    officialUrl: row.official_url,
    aiDescription: row.ai_description,
    aiSources: sourcesFromJson(row.ai_sources),
    aiFaq: faqFromJson(row.ai_faq),
    isEnriched: row.is_enriched,
    totalScholarshipCount: extras.totalScholarshipCount,
    scholarships: extras.scholarships,
    similarProviders: extras.similarProviders
  };
}

export async function loadProviderProfilePage(
  rawParam: string
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

  const { data: statRow, error: statError } = await supabase
    .from('provider_scholarship_stats')
    .select('slug, display_name, scholarship_count')
    .eq('slug', slugForScholarships)
    .maybeSingle();

  if (statError || !statRow?.scholarship_count) return null;

  const totalScholarshipCount = statRow.scholarship_count;
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

  if (!providerRow) {
    providerRow = {
      id: '00000000-0000-0000-0000-000000000000',
      slug: slugForScholarships,
      display_name: fallbackName,
      official_url: null,
      ai_description: null,
      ai_sources: [],
      ai_faq: [],
      is_enriched: false,
      created_at: new Date().toISOString(),
      updated_at: null
    } as ProviderRow;
  }

  if (!providerRow.is_enriched && admin && providerRow.id !== '00000000-0000-0000-0000-000000000000') {
    const enriched = await enrichProviderData(providerRow.display_name);
    await admin
      .from('providers')
      .update({
        ai_description: enriched.description,
        ai_sources: enriched.sources,
        ai_faq: enriched.faq,
        is_enriched: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', providerRow.id);

    const { data: refreshed } = await admin
      .from('providers')
      .select('*')
      .eq('id', providerRow.id)
      .single();
    if (refreshed) providerRow = refreshed;
  }

  const { data: scholarshipRows } = await supabase
    .from('scholarships')
    .select(LIST_CARD_SELECT)
    .eq('provider_slug', slugForScholarships)
    .eq('is_active', true)
    .order('ranking_score', { ascending: false, nullsFirst: false })
    .limit(24);

  const scholarships = (scholarshipRows ?? []).map((r) =>
    mapScholarshipRow(r as ScholarshipRow)
  );

  const { data: similarRows } = await supabase
    .from('provider_scholarship_stats')
    .select('slug, display_name, scholarship_count')
    .neq('slug', slugForScholarships)
    .order('scholarship_count', { ascending: false })
    .limit(12);

  const similarProviders: SimilarProviderSummary[] = (similarRows ?? [])
    .filter((r) => r.slug && r.slug !== slugForScholarships)
    .slice(0, 4)
    .map((r) => ({
      slug: r.slug,
      displayName:
        (r.display_name && r.display_name.trim()) || r.slug,
      scholarshipCount: r.scholarship_count ?? 0
    }));

  return rowToPayload(providerRow, {
    totalScholarshipCount,
    scholarships,
    similarProviders
  });
}
