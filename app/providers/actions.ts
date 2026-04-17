'use server';

import { revalidatePath } from 'next/cache';

import { enrichProviderData } from '@/lib/providers/enrichProviderDataCore';
import {
  fetchProviderOfficialUrlsBySlug,
  fetchProviderSourceUrlsBySlug
} from '@/lib/providers/providerOfficialUrl';
import { isProvidersBulkEnrichUiEnabled } from '@/lib/providers/providerHubServer';
import {
  pingGoogleIndexingDirect,
  providerIndexingUrl
} from '@/lib/seo/googleIndexingQueue';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';

export type BulkEnrichResult =
  | { ok: true; processed: number }
  | { ok: false; error: string };

/**
 * Sequentially runs AI enrichment for every `providers` row with `is_enriched = false`.
 * Gated by `NODE_ENV === 'development'` or `PROVIDERS_BULK_ENRICH_ENABLED=1`.
 */
export async function enrichAllMissingProvidersAction(): Promise<BulkEnrichResult> {
  if (!isProvidersBulkEnrichUiEnabled()) {
    return { ok: false, error: 'Bulk enrich is not enabled.' };
  }

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return { ok: false, error: 'Server is missing Supabase service role key.' };
  }

  const { data: rows, error } = await admin
    .from('providers')
    .select('id, slug, display_name, official_url')
    .eq('is_enriched', false)
    .order('created_at', { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!rows?.length) {
    revalidatePath('/providers');
    return { ok: true, processed: 0 };
  }

  const officialUrlsBySlug = await fetchProviderOfficialUrlsBySlug(
    admin,
    rows.map((row) => row.slug)
  );
  const sourceUrlsBySlug = await fetchProviderSourceUrlsBySlug(
    admin,
    rows.map((row) => row.slug)
  );

  let processed = 0;
  for (const row of rows) {
    const name = row.display_name?.trim();
    const officialUrl =
      row.official_url?.trim() || officialUrlsBySlug.get(row.slug?.trim() || '') || null;
    const sourceUrls = sourceUrlsBySlug.get(row.slug?.trim() || '') ?? [];
    if (!name) {
      processed += 1;
      continue;
    }

    const enriched = await enrichProviderData(name, {
      sourceUrls: [
        ...(officialUrl ? [officialUrl] : []),
        ...sourceUrls
      ]
    });
    const description = enriched.description?.trim() || '';
    const sources = enriched.sources.filter(Boolean);
    if (!description || sources.length === 0) {
      processed += 1;
      continue;
    }

    const { error: updateError } = await admin
      .from('providers')
      .update({
        ai_description: description,
        ...(officialUrl ? { official_url: officialUrl } : {}),
        ai_sources: sources,
        ai_faq: enriched.faq,
        state: enriched.state,
        is_enriched: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', row.id);
    if (updateError) {
      processed += 1;
      continue;
    }
    const { data: providerRow } = await admin
      .from('providers')
      .select('slug')
      .eq('id', row.id)
      .maybeSingle();
    if (providerRow?.slug?.trim()) {
      void pingGoogleIndexingDirect(
        providerIndexingUrl(providerRow.slug.trim())
      ).catch(() => {
        /* pingGoogleIndexingDirect logs errors; swallow rejection defensively */
      });
    }
    processed += 1;
  }

  revalidatePath('/providers');
  return { ok: true, processed };
}
