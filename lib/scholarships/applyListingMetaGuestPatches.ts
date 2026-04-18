import type { ScholarshipListMeta } from '@/lib/scholarships/scholarshipListServer';

/**
 * Hub listing meta is personalized for signed-in users. Anonymous SSR and guests
 * must not show signed-in sidebar counts (Best / Saved filters / lists).
 * Mirrors POST `/api/scholarships` after list queries.
 */
export function applyListingMetaGuestPatches(
  meta: ScholarshipListMeta,
  ctx: { authUser: boolean }
): void {
  delete meta.matchedTotal;
  if (!ctx.authUser) {
    meta.sidebarCounts.bestMatches = 0;
    meta.sidebarCounts.recommended = 0;
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
