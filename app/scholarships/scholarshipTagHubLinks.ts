/**
 * Client-safe deep links from catalog chips / geo pills into the hub.
 * Lives separately from `scholarshipListUrl.ts` to avoid Turbopack circular-init issues
 * (`scholarshipListUrl` → hub path → tabs → `scholarshipCatalog` ↔ client cards).
 */

import type { ScholarshipCategoryId } from './scholarshipCategories';
import { normalizeCategoryId } from './scholarshipCategories';
import {
  buildHubCatalogBrowserUrl,
  buildScholarshipListSearchParams
} from './scholarshipListUrl';

export type CatalogChipLike = { key: string; label: string };

/**
 * Deep link to the catalog hub with optional category / geo filters (shareable URL).
 */
export function buildScholarshipTagHubHref(opts: {
  categoryIds?: Set<ScholarshipCategoryId> | ScholarshipCategoryId[] | null;
  appCountryCode?: string | null;
  hostCountryCode?: string | null;
  hostUnspecified?: boolean | null;
}): string {
  const ids =
    opts.categoryIds == null
      ? null
      : opts.categoryIds instanceof Set
        ? opts.categoryIds
        : new Set(
            opts.categoryIds.filter(Boolean) as ScholarshipCategoryId[]
          );
  const base = new URLSearchParams();
  const merged = buildScholarshipListSearchParams(base, {
    tab: 'matches',
    categories: ids && ids.size > 0 ? ids : null,
    resetPage: true,
    appCc:
      opts.appCountryCode !== undefined ? opts.appCountryCode : undefined,
    hostCc:
      opts.hostCountryCode !== undefined ? opts.hostCountryCode : undefined,
    hostUnspecified:
      opts.hostUnspecified !== undefined ? opts.hostUnspecified : undefined
  });
  const { pathname, search } = buildHubCatalogBrowserUrl(
    merged.toString(),
    {},
    'matches'
  );
  return search ? `${pathname}?${search}` : pathname;
}

/** Maps gray catalog chips: only canonical subject categories are deep-linked today. */
export function scholarshipCatalogChipHubHref(
  chip: CatalogChipLike
): string | null {
  if (!chip.key.startsWith('cat:')) return null;
  const id = normalizeCategoryId(chip.key.slice('cat:'.length));
  if (!id) return null;
  return buildScholarshipTagHubHref({ categoryIds: new Set([id]) });
}
