import 'server-only';

import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import {
  generateSeoHubWithOpenAi,
  parseCostJson,
  type SeoHubCostOfLivingJson
} from '@/lib/seo/seoHubContentAi';
import { createPublicClient } from '@/utils/supabase/public';
import type { Database, Json } from '@/types_db';

export type { SeoHubCostOfLivingJson };

export type SeoHubContentLoaded = {
  title: string | null;
  h1: string | null;
  meta_description: string | null;
  content_html: string | null;
  cost_of_living_json: SeoHubCostOfLivingJson;
  updated_at: string;
  fromCache: boolean;
};

const FRESH_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Cached SEO hub body for a canonical /scholarships/* path (state hubs).
 * Skips OpenAI when a row exists and is newer than 30 days.
 */
export async function loadOrGenerateSeoHubContent(
  canonicalPath: string,
  options: {
    stateName: string;
    topicLabel?: string | null;
    degreeLabel?: string | null;
    year: number;
  }
): Promise<SeoHubContentLoaded | null> {
  const pathKey = canonicalPath.trim().replace(/^\/+/, '').toLowerCase();
  if (!pathKey) return null;

  const supabase = createPublicClient();
  if (!supabase) return null;

  const { data: existing, error: readErr } = await supabase
    .from('seo_hub_content')
    .select(
      'title, h1, meta_description, content_html, cost_of_living_json, updated_at'
    )
    .eq('canonical_path', pathKey)
    .maybeSingle();

  if (readErr) return null;

  const now = Date.now();
  if (existing?.updated_at) {
    const ts = new Date(existing.updated_at).getTime();
    if (!Number.isNaN(ts) && now - ts < FRESH_MS) {
      return {
        title: existing.title,
        h1: existing.h1 ?? null,
        meta_description: existing.meta_description ?? null,
        content_html: existing.content_html,
        cost_of_living_json: parseCostJson(
          existing.cost_of_living_json as Json
        ),
        updated_at: existing.updated_at,
        fromCache: true
      };
    }
  }

  const generated = await generateSeoHubWithOpenAi({
    stateName: options.stateName,
    topicLabel: options.topicLabel ?? null,
    degreeLabel: options.degreeLabel ?? null,
    year: options.year
  });

  if (!generated) {
    if (existing) {
      return {
        title: existing.title,
        h1: existing.h1 ?? null,
        meta_description: existing.meta_description ?? null,
        content_html: existing.content_html,
        cost_of_living_json: parseCostJson(
          existing.cost_of_living_json as Json
        ),
        updated_at: existing.updated_at ?? new Date().toISOString(),
        fromCache: true
      };
    }
    return null;
  }

  const admin = createServiceRoleSupabaseClient();
  if (!admin) return null;

  const row: Database['public']['Tables']['seo_hub_content']['Insert'] = {
    canonical_path: pathKey,
    title: generated.title,
    h1: generated.h1 ?? null,
    meta_description: generated.meta_description ?? null,
    content_html: generated.content_html,
    cost_of_living_json: generated.cost_of_living as unknown as Json
  };

  const { data: upserted, error: upErr } = await admin
    .from('seo_hub_content')
    .upsert(row, { onConflict: 'canonical_path' })
    .select(
      'title, h1, meta_description, content_html, cost_of_living_json, updated_at'
    )
    .single();

  if (upErr || !upserted) return null;

  return {
    title: upserted.title,
    h1: upserted.h1 ?? null,
    meta_description: upserted.meta_description ?? null,
    content_html: upserted.content_html,
    cost_of_living_json: parseCostJson(upserted.cost_of_living_json as Json),
    updated_at: upserted.updated_at,
    fromCache: false
  };
}

/**
 * Always calls OpenAI and upserts (ignores 30-day cache). For one-off scripts / pilot launches.
 */
export async function forceGenerateAndUpsertSeoHubContent(
  canonicalPath: string,
  options: {
    stateName: string;
    topicLabel?: string | null;
    degreeLabel?: string | null;
    year: number;
  }
): Promise<SeoHubContentLoaded | null> {
  const pathKey = canonicalPath.trim().replace(/^\/+/, '').toLowerCase();
  if (!pathKey) return null;

  const generated = await generateSeoHubWithOpenAi({
    stateName: options.stateName,
    topicLabel: options.topicLabel ?? null,
    degreeLabel: options.degreeLabel ?? null,
    year: options.year
  });
  if (!generated) return null;

  const admin = createServiceRoleSupabaseClient();
  if (!admin) return null;

  const row: Database['public']['Tables']['seo_hub_content']['Insert'] = {
    canonical_path: pathKey,
    title: generated.title,
    h1: generated.h1 ?? null,
    meta_description: generated.meta_description ?? null,
    content_html: generated.content_html,
    cost_of_living_json: generated.cost_of_living as unknown as Json
  };

  const { data: upserted, error: upErr } = await admin
    .from('seo_hub_content')
    .upsert(row, { onConflict: 'canonical_path' })
    .select(
      'title, h1, meta_description, content_html, cost_of_living_json, updated_at'
    )
    .single();

  if (upErr || !upserted) return null;

  return {
    title: upserted.title,
    h1: upserted.h1 ?? null,
    meta_description: upserted.meta_description ?? null,
    content_html: upserted.content_html,
    cost_of_living_json: parseCostJson(upserted.cost_of_living_json as Json),
    updated_at: upserted.updated_at,
    fromCache: false
  };
}
