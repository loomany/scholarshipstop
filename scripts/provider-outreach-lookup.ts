/**
 * Maps support_email (lowercased) → provider slug + display name from Supabase
 * (scholarships.support_email + providers.display_name).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

export type ProviderOutreachLookup = {
  displayName: string;
  slug: string;
};

function createServiceClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

/**
 * Paginate scholarships and build email → { slug, name from row }.
 * Enrich display_name from public.providers in batches.
 */
export async function loadProviderOutreachEmailMap(): Promise<
  Map<string, ProviderOutreachLookup> | null
> {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const raw = new Map<string, { slug: string; name: string }>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('scholarships')
      .select('support_email, provider_slug, provider_name')
      .not('support_email', 'is', null)
      .not('provider_slug', 'is', null)
      .neq('support_email', '')
      .neq('provider_slug', '')
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('[provider-outreach] Supabase scholarships page error', error.message);
      return null;
    }
    if (!data?.length) break;
    for (const row of data) {
      const e = row.support_email?.trim().toLowerCase();
      const slug = row.provider_slug?.trim();
      if (!e || !slug) continue;
      if (!raw.has(e)) {
        const name = (row.provider_name?.trim() || slug) as string;
        raw.set(e, { slug, name });
      }
    }
  }

  const slugs = [...new Set([...raw.values()].map((v) => v.slug))];
  const displayBySlug = new Map<string, string>();
  for (let i = 0; i < slugs.length; i += 200) {
    const chunk = slugs.slice(i, i + 200);
    const { data: provs, error: pe } = await supabase
      .from('providers')
      .select('slug, display_name')
      .in('slug', chunk);
    if (pe) {
      console.error('[provider-outreach] Supabase providers batch error', pe.message);
    }
    for (const p of provs ?? []) {
      if (p?.slug) {
        displayBySlug.set(
          p.slug,
          p.display_name?.trim() || displayBySlug.get(p.slug) || p.slug
        );
      }
    }
  }

  const out = new Map<string, ProviderOutreachLookup>();
  for (const [email, v] of raw) {
    const dn = displayBySlug.get(v.slug);
    out.set(email, {
      slug: v.slug,
      displayName: (dn && dn.length > 0 ? dn : v.name) as string
    });
  }
  return out;
}

export { createServiceClient };
