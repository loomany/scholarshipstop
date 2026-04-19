import type { ScholarshipListMeta } from '@/lib/scholarships/scholarshipListServer';

/**
 * Hub listing meta for guests: strip signed-in-only collections and profile blobs.
 * Best / Saved Filters counts come from the anonymous `meta` query (may include landing-quiz merge).
 * Mirrors POST `/api/scholarships` after list queries.
 */
export function applyListingMetaGuestPatches(
  meta: ScholarshipListMeta,
  ctx: { authUser: boolean }
): void {
  delete meta.matchedTotal;
  if (!ctx.authUser) {
    /**
     * Keep `bestMatches` / `recommended` from the anonymous listing query (e.g. landing-quiz
     * merge). Zeroing them hid real counts while the Best tab list used quiz filters.
     */
    meta.personalizedMatchReady = false;
    meta.sidebarCounts.saved = 0;
    meta.sidebarCounts.ignored = 0;
    meta.sidebarCounts.started = 0;
    meta.sidebarCounts.submitted = 0;
    delete meta.profileMatchSummary;
    delete meta.profileFilterSeed;
    delete meta.matchedTotal;
  }
}
