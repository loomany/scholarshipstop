import { createClient } from '@supabase/supabase-js';

import {
  extractProviderNameFromProviderMission,
  providerIdentitySlugify
} from '../lib/providers/providerIdentityCandidate';

type ScholarshipRow = {
  provider_name: string | null;
  provider_slug: string | null;
  provider_mission: string | null;
};

function env(name: string): string {
  return process.env[name]?.trim() ?? '';
}

async function main() {
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  const supabase = createClient(url, key);
  const rows: ScholarshipRow[] = [];

  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('scholarships')
      .select('provider_name, provider_slug, provider_mission')
      .eq('is_active', true)
      .eq('is_indexable', true)
      .eq('source', 'scholarship_america')
      .not('provider_name', 'is', null)
      .not('provider_slug', 'is', null)
      .not('provider_mission', 'is', null)
      .range(from, from + 999);

    if (error) throw error;
    rows.push(...((data ?? []) as ScholarshipRow[]));
    if (!data || data.length < 1000) break;
  }

  const missionDerived = new Map<string, string>();
  for (const row of rows) {
    const extracted = extractProviderNameFromProviderMission(row.provider_mission);
    const slug = row.provider_slug?.trim();
    const name = row.provider_name?.trim() || extracted;
    if (!extracted || !slug || !name) continue;
    if (providerIdentitySlugify(extracted) !== slug) continue;
    missionDerived.set(slug, name);
  }

  const slugs = [...missionDerived.keys()].sort();
  const existing = new Set<string>();
  for (let i = 0; i < slugs.length; i += 50) {
    const chunk = slugs.slice(i, i + 50);
    const { data, error } = await supabase
      .from('providers')
      .select('slug')
      .in('slug', chunk);
    if (error) throw error;
    for (const row of data ?? []) {
      if (row.slug) existing.add(row.slug);
    }
  }

  const missingRows = slugs
    .filter((slug) => !existing.has(slug))
    .map((slug) => ({
      slug,
      display_name: missionDerived.get(slug) ?? slug.replace(/-/g, ' ')
    }));

  let created: { slug: string; display_name: string; is_enriched: boolean }[] = [];
  if (missingRows.length > 0) {
    const { data, error } = await supabase
      .from('providers')
      .upsert(missingRows, { onConflict: 'slug', ignoreDuplicates: true })
      .select('slug, display_name, is_enriched');
    if (error) throw error;
    created = (data ?? []) as typeof created;
  }

  console.log(
    JSON.stringify(
      {
        missionDerivedSlugs: slugs.length,
        created: created.length,
        createdSlugs: created.map((row) => row.slug).sort()
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
