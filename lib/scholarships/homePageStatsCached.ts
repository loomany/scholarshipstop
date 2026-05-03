import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

import {
  fetchApplicantCountryCounts,
  fetchHomeScholarshipCatalogStats,
  type HomeScholarshipCatalogStats,
  type ScholarshipListMeta
} from '@/lib/scholarships/scholarshipListServer';
import type { Database } from '@/types_db';
import { createPublicClient } from '@/utils/supabase/public';

export type HomeListingStatsForMarketing = {
  topApplicantCountries: ScholarshipListMeta['countryCounts'];
  scholarshipCatalogStats: HomeScholarshipCatalogStats | null;
};

async function computeHomeListingStats(): Promise<HomeListingStatsForMarketing> {
  const supabase = createPublicClient();
  if (!supabase) {
    return { topApplicantCountries: [], scholarshipCatalogStats: null };
  }

  const client = supabase as unknown as SupabaseClient<Database>;
  const [{ countryCounts }, scholarshipCatalogStats] = await Promise.all([
    fetchApplicantCountryCounts(client),
    fetchHomeScholarshipCatalogStats(client)
  ]);

  return {
    topApplicantCountries: countryCounts.slice(0, 24),
    scholarshipCatalogStats
  };
}

/**
 * Cross-request cached Supabase aggregates for `/` hero / international strip.
 * Uses the public anon client (same listing RLS as marketing reads) — avoids cookie-bound SSR client.
 *
 * Matches `app/page.tsx` `export const revalidate = 300` (homepage ISR).
 */
export const getCachedHomeListingStatsForMarketing = unstable_cache(
  computeHomeListingStats,
  ['home-listing-stats-marketing-v1'],
  { revalidate: 300 }
);
