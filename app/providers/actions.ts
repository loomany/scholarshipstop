'use server';

import { revalidatePath } from 'next/cache';

import { enrichProviderData } from '@/lib/providers/enrichProviderDataCore';
import { isProvidersBulkEnrichUiEnabled } from '@/lib/providers/providerHubServer';
import { enqueueGoogleIndexingUrls, providerIndexingUrl } from '@/lib/seo/googleIndexingQueue';
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
    .select('id, display_name')
    .eq('is_enriched', false)
    .order('created_at', { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!rows?.length) {
    revalidatePath('/providers');
    return { ok: true, processed: 0 };
  }

  let processed = 0;
  for (const row of rows) {
    const name = row.display_name?.trim();
    if (!name) {
      const { data: providerRow } = await admin
        .from('providers')
        .select('slug')
        .eq('id', row.id)
        .maybeSingle();
      await admin
        .from('providers')
        .update({
          is_enriched: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', row.id);
      if (providerRow?.slug?.trim()) {
        enqueueGoogleIndexingUrls({
          kind: 'provider',
          urls: [providerIndexingUrl(providerRow.slug.trim())],
          source: 'server-action:providers:bulk-enrich'
        });
      }
      processed += 1;
      continue;
    }

    const enriched = await enrichProviderData(name);
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
      .eq('id', row.id);
    const { data: providerRow } = await admin
      .from('providers')
      .select('slug')
      .eq('id', row.id)
      .maybeSingle();
    if (providerRow?.slug?.trim()) {
      enqueueGoogleIndexingUrls({
        kind: 'provider',
        urls: [providerIndexingUrl(providerRow.slug.trim())],
        source: 'server-action:providers:bulk-enrich'
      });
    }
    processed += 1;
  }

  revalidatePath('/providers');
  return { ok: true, processed };
}
