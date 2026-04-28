import type { Database, Json } from '@/types_db';

import type { ProviderEnrichmentFaqItem } from '@/lib/providers/providerEnrichmentTypes';

type ProvidersUpdate = Database['public']['Tables']['providers']['Update'];

/**
 * Coerces LLM/parse output to a JSONB-safe string array; never null.
 */
export function normalizeEnrichmentSourcesForStorage(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === 'string' && x.trim()) {
      out.push(x.trim());
    }
  }
  return out;
}

type EnrichmentStorageWriteInput = {
  description: string;
  sources: unknown;
  faq: ProviderEnrichmentFaqItem[];
  state: string | null;
  officialUrl?: string | null;
  postQualityPassed: true;
};

/**
 * Writes enriched copy into `ai_*` fields and marks the row enriched.
 * (Schema in `types_db` matches `public.providers` — canonical `description`/`sources` appear when generated types include them.)
 */
export function buildProviderEnrichmentWritePatch(
  input: EnrichmentStorageWriteInput
): ProvidersUpdate {
  if (input.postQualityPassed !== true) {
    throw new Error(
      'buildProviderEnrichmentWritePatch: postQualityPassed must be true (refuse marking low-quality rows enriched)'
    );
  }

  const sources = normalizeEnrichmentSourcesForStorage(input.sources);
  const t = new Date().toISOString();
  return {
    ai_description: input.description,
    ai_sources: sources,
    ai_faq: input.faq as unknown as Json,
    state: input.state,
    is_enriched: true,
    updated_at: t,
    ...(input.officialUrl ? { official_url: input.officialUrl } : {})
  };
}
