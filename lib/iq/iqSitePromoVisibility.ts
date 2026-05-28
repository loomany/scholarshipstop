/**
 * Cross-site IQ assessment promo cards and CTAs (hubs, detail pages, grids, nav).
 * Routes under `/iq/*` and iq.scholarshiptop.com are unaffected.
 */
export const SHOW_IQ_SITE_PROMOS = false;

export function isIqSitePromoVisible(): boolean {
  return SHOW_IQ_SITE_PROMOS;
}

/** One inline IQ tile inserted at grid index 2 (compare / providers / resources). */
export const HUB_GRID_SINGLE_IQ_SLOT = 1;

/** Two IQ tiles woven into the essays hub grid (first + last). */
export const ESSAYS_GRID_IQ_SLOT_COUNT = 2;

/**
 * Content cards per hub page so a 3-column grid stays full when grid IQ tiles
 * are hidden (base sizes were chosen to leave room for those tiles).
 */
export function hubGridContentPageSize(
  basePageSize: number,
  iqGridSlotCount = HUB_GRID_SINGLE_IQ_SLOT
): number {
  return isIqSitePromoVisible()
    ? basePageSize
    : basePageSize + iqGridSlotCount;
}
