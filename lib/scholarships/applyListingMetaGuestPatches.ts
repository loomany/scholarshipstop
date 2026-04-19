import type { ScholarshipListMeta } from '@/lib/scholarships/scholarshipListServer';

/**
 * Hub listing meta for guests: strip signed-in-only collections and profile blobs.
 * `Best recommendation` must stay locked for guests, so its sidebar counter is
 * always zeroed even if the anonymous base query can enumerate catalog rows.
 * Mirrors POST `/api/scholarships` after list queries.
 */
export function applyListingMetaGuestPatches(
  meta: ScholarshipListMeta,
  ctx: { authUser: boolean; keepBestRecommendationCount?: boolean }
): void {
  delete meta.matchedTotal;
  if (!ctx.authUser) {
    meta.personalizedMatchReady = false;
    if (!ctx.keepBestRecommendationCount) {
      meta.sidebarCounts.bestRecommendation = 0;
    }
    meta.sidebarCounts.saved = 0;
    meta.sidebarCounts.ignored = 0;
    meta.sidebarCounts.started = 0;
    meta.sidebarCounts.submitted = 0;
    delete meta.profileMatchSummary;
    delete meta.profileFilterSeed;
    delete meta.savedFiltersSnapshotJson;
    delete meta.matchedTotal;
  }
}
