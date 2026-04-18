import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { isScholarshipUSA } from '@/app/scholarships/scholarshipCategories';
import {
  cloneMoreFilters,
  computeFilterBounds,
  defaultMoreFiltersFromBounds,
  scholarshipPassesMoreFilters,
  type MoreFiltersState
} from '@/app/scholarships/moreFilters';
import {
  buildLongTailMoreFiltersState,
  longTailBaseFilter,
  type LongTailSlug
} from '@/app/scholarships/scholarshipLongTailPresets';
import { scholarshipsInTab } from '@/app/scholarships/scholarshipTabs';
import {
  catalogLocationLabelsToStateCodes,
  NATIONWIDE_LOCATION
} from '@/lib/scholarships/scholarshipCatalog';
import type {
  SeoScholarshipRouteFiltersJson,
  SeoScholarshipRouteManifestEntry
} from '@/lib/scholarships/seoScholarshipManifest';
import { SEO_ROUTE_STATE_SLUG_TO_LABEL } from '@/lib/scholarships/seoTags/routeSegmentMaps';
import { resolveRouteSeoTags } from '@/lib/scholarships/seoTags/resolveRouteSeoTags';

/**
 * Canonical `seo_tags` AND-list for a manifest path or single legacy slug (e.g. `first-generation`, `no-essay`).
 * Location segments are excluded; they stay on existing location filters.
 */
export function requiredSeoTagsForListingPath(canonicalOrLegacySlug: string): string[] {
  const t = canonicalOrLegacySlug.trim();
  if (!t) return [];
  return [...resolveRouteSeoTags(t).seoTags];
}

export type SeoExactRouteDescriptor = {
  canonicalPath: string;
  requiredSeoTags: string[];
  locationSlugs: string[];
  stateCodes: string[];
  moreFilters: MoreFiltersState;
  unmappedSegments: string[];
};

export type LongTailListingMode =
  | { type: 'legacy'; slug: LongTailSlug }
  | {
      type: 'manifest';
      canonicalPath: string;
      entry: SeoScholarshipRouteManifestEntry;
    };

type Bounds = {
  amountMin: number;
  amountMax: number;
  applicantsMin: number;
  applicantsMax: number;
};

export function mergeMoreFilterStates(
  a: MoreFiltersState,
  b: MoreFiltersState
): MoreFiltersState {
  return {
    deadlinePreset:
      a.deadlinePreset !== 'any' ? a.deadlinePreset : b.deadlinePreset,
    amountMin: Math.max(a.amountMin, b.amountMin),
    amountMax: Math.min(a.amountMax, b.amountMax),
    applicantsMin: Math.max(a.applicantsMin, b.applicantsMin),
    applicantsMax: Math.min(a.applicantsMax, b.applicantsMax),
    includeRequirementTypes: new Set(
      Array.from(a.includeRequirementTypes).concat(
        Array.from(b.includeRequirementTypes)
      )
    ),
    dataCompleteness: {
      low: a.dataCompleteness.low || b.dataCompleteness.low,
      medium: a.dataCompleteness.medium || b.dataCompleteness.medium,
      high: a.dataCompleteness.high || b.dataCompleteness.high,
      verified: a.dataCompleteness.verified || b.dataCompleteness.verified
    },
    payout: {
      college: a.payout.college || b.payout.college,
      student: a.payout.student || b.payout.student,
      nonMonetary: a.payout.nonMonetary || b.payout.nonMonetary,
      notStated: a.payout.notStated || b.payout.notStated
    },
    includeEligibility: new Set(
      Array.from(a.includeEligibility).concat(Array.from(b.includeEligibility))
    ),
    includeEducationLevels: new Set(
      Array.from(a.includeEducationLevels).concat(
        Array.from(b.includeEducationLevels)
      )
    ),
    includeGpaBuckets: new Set(
      Array.from(a.includeGpaBuckets).concat(Array.from(b.includeGpaBuckets))
    ),
    includeLocationLabels: new Set(
      Array.from(a.includeLocationLabels).concat(
        Array.from(b.includeLocationLabels)
      )
    ),
    includeEasyApply: new Set(
      Array.from(a.includeEasyApply).concat(Array.from(b.includeEasyApply))
    ),
    citizenshipAudience:
      a.citizenshipAudience !== 'any'
        ? a.citizenshipAudience
        : b.citizenshipAudience,
    filterStateInput:
      a.filterStateInput.trim() !== ''
        ? a.filterStateInput
        : b.filterStateInput,
    filterUniversityInput:
      a.filterUniversityInput.trim() !== ''
        ? a.filterUniversityInput
        : b.filterUniversityInput,
    filterUniversitySlug: a.filterUniversitySlug ?? b.filterUniversitySlug
  };
}

function applyFiltersJson(
  bounds: Bounds,
  base: MoreFiltersState,
  f: SeoScholarshipRouteFiltersJson
): MoreFiltersState {
  const n = cloneMoreFilters(base);
  for (const id of f.includeEligibility ?? []) {
    if (id.trim()) n.includeEligibility.add(id.trim());
  }
  for (const id of f.includeEducationLevels ?? []) {
    if (id.trim()) n.includeEducationLevels.add(id.trim());
  }
  for (const id of f.includeGpaBuckets ?? []) {
    if (id.trim()) n.includeGpaBuckets.add(id.trim());
  }
  for (const id of f.includeLocationLabels ?? []) {
    if (id.trim()) n.includeLocationLabels.add(id.trim());
  }
  for (const id of f.includeEasyApply ?? []) {
    if (id.trim()) n.includeEasyApply.add(id.trim());
  }
  if (f.deadlinePreset) n.deadlinePreset = f.deadlinePreset;
  if (f.amountCap != null && Number.isFinite(f.amountCap)) {
    n.amountMax = Math.min(n.amountMax, f.amountCap);
  }
  if (f.dataCompletenessVerifiedOnly) n.dataCompleteness.verified = true;
  if (f.payoutCollege) n.payout.college = true;
  if (f.payoutStudent) n.payout.student = true;
  if (f.payoutNonMonetary) n.payout.nonMonetary = true;
  if (f.payoutNotStated) n.payout.notStated = true;
  return n;
}

/** Initial more-filters for a manifest SEO route (merged with client bounds). */
export function buildMoreFiltersForManifestEntry(
  bounds: Bounds,
  entry: SeoScholarshipRouteManifestEntry
): MoreFiltersState {
  let m = defaultMoreFiltersFromBounds(bounds);
  const leg = entry.legacyBaseSlugs ?? [];
  for (const slug of leg) {
    m = mergeMoreFilterStates(
      m,
      buildLongTailMoreFiltersState(bounds, slug as LongTailSlug)
    );
  }
  if (entry.filters) {
    m = applyFiltersJson(bounds, m, entry.filters);
  }
  return m;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function moreFiltersReducedForSeoListing(base: MoreFiltersState): MoreFiltersState {
  const f = cloneMoreFilters(base);
  f.includeEligibility.clear();
  f.includeEducationLevels.clear();
  f.includeGpaBuckets.clear();
  f.includeEasyApply.clear();
  f.dataCompleteness = {
    low: false,
    medium: false,
    high: false,
    verified: false
  };
  f.payout = {
    college: false,
    student: false,
    nonMonetary: false,
    notStated: false
  };
  return f;
}

export function buildSeoExactRouteDescriptor(
  bounds: Bounds,
  canonicalPath: string,
  baseMoreFilters: MoreFiltersState
): SeoExactRouteDescriptor {
  const resolved = resolveRouteSeoTags(canonicalPath);
  const locationLabels = new Set(baseMoreFilters.includeLocationLabels);
  for (const slug of resolved.locationSlugs) {
    const label = SEO_ROUTE_STATE_SLUG_TO_LABEL[slug] ?? null;
    if (label) {
      locationLabels.add(label);
      continue;
    }
    if (slug === 'nationwide') {
      locationLabels.add(NATIONWIDE_LOCATION);
    }
  }
  const merged: MoreFiltersState = {
    ...cloneMoreFilters(baseMoreFilters),
    includeLocationLabels: locationLabels
  };
  const reduced = moreFiltersReducedForSeoListing(merged);
  const stateCodes = uniqueSorted(
    catalogLocationLabelsToStateCodes(reduced.includeLocationLabels)
  );
  return {
    canonicalPath,
    requiredSeoTags: uniqueSorted(resolved.seoTags),
    locationSlugs: uniqueSorted(resolved.locationSlugs),
    stateCodes,
    moreFilters: reduced,
    unmappedSegments: uniqueSorted(resolved.unmappedSegments)
  };
}

function scholarshipMatchesSeoExactDescriptor(
  scholarship: Scholarship,
  descriptor: SeoExactRouteDescriptor
): boolean {
  const rawSeoTags = scholarship.seoTags ?? scholarship.scholarshipCatalog?.seoTags ?? [];
  const tagSet = new Set(rawSeoTags.map((tag) => String(tag).trim()).filter(Boolean));
  for (const tag of descriptor.requiredSeoTags) {
    if (!tagSet.has(tag)) return false;
  }
  if (descriptor.stateCodes.length > 0) {
    const scholarshipStateCodes = new Set(
      (scholarship.stateCodes ?? [])
        .map((code) => String(code).trim().toUpperCase())
        .filter(Boolean)
    );
    let matchedState = false;
    descriptor.stateCodes.forEach((code) => {
      if (scholarshipStateCodes.has(code)) matchedState = true;
    });
    if (!matchedState) return false;
  }
  return scholarshipPassesMoreFilters(scholarship, descriptor.moreFilters);
}

export function composeManifestBaseFilter(
  entry: SeoScholarshipRouteManifestEntry
): ((s: Scholarship) => boolean) | undefined {
  const leg = entry.legacyBaseSlugs ?? [];
  const fns = leg
    .map((s) => longTailBaseFilter(s as LongTailSlug))
    .filter(Boolean) as Array<(s: Scholarship) => boolean>;
  if (fns.length === 0) return undefined;
  return (s) => fns.every((fn) => fn(s));
}

export function buildListingBaseFilter(
  mode: LongTailListingMode
): ((s: Scholarship) => boolean) | undefined {
  if (mode.type === 'legacy') return longTailBaseFilter(mode.slug);
  return composeManifestBaseFilter(mode.entry);
}

export function buildListingBaselineMoreFilters(
  bounds: Bounds,
  mode: LongTailListingMode
): MoreFiltersState {
  if (mode.type === 'legacy') {
    return buildLongTailMoreFiltersState(bounds, mode.slug);
  }
  return buildMoreFiltersForManifestEntry(bounds, mode.entry);
}

/** More-filters from legacy long-tail slugs only (no manifest `filters` JSON). */
export function buildSeoSlugOnlyMoreFilters(
  bounds: Bounds,
  mode: LongTailListingMode
): MoreFiltersState {
  if (mode.type === 'legacy') {
    return buildLongTailMoreFiltersState(bounds, mode.slug);
  }
  const entry = { ...mode.entry, filters: undefined };
  return buildMoreFiltersForManifestEntry(bounds, entry);
}

/** Merge preset more-filters for each legacy slug (used when dropping amount/time slugs). */
export function mergeLongTailSlugMoreFiltersOnly(
  bounds: Bounds,
  slugs: LongTailSlug[]
): MoreFiltersState {
  let m = defaultMoreFiltersFromBounds(bounds);
  for (const slug of slugs) {
    m = mergeMoreFilterStates(m, buildLongTailMoreFiltersState(bounds, slug));
  }
  return m;
}

function listingHitsForManifestEntry(
  list: Scholarship[],
  entry: SeoScholarshipRouteManifestEntry
): Scholarship[] {
  const mode: LongTailListingMode = {
    type: 'manifest',
    canonicalPath: entry.canonicalPath,
    entry
  };
  const tabIdSets = {
    saved: [] as string[],
    ignored: [] as string[],
    started: [] as string[],
    submitted: [] as string[]
  };
  const usaAll = list.filter((s) => isScholarshipUSA(s.country));
  const matches = scholarshipsInTab(usaAll, 'matches', tabIdSets);
  const bf = buildListingBaseFilter(mode);
  const narrowed = bf ? matches.filter(bf) : matches;
  const bounds = computeFilterBounds(narrowed);
  const filters = buildMoreFiltersForManifestEntry(bounds, entry);
  return narrowed.filter((s) => scholarshipPassesMoreFilters(s, filters));
}

function exactSeoHitsForManifestEntry(
  list: Scholarship[],
  entry: SeoScholarshipRouteManifestEntry
): Scholarship[] {
  const usaAll = list.filter((s) => isScholarshipUSA(s.country));
  const matches = scholarshipsInTab(usaAll, 'matches', {
    saved: [],
    ignored: [],
    started: [],
    submitted: []
  });
  const baselineFilters = buildMoreFiltersForManifestEntry(boundsForList(matches), entry);
  const descriptor = buildSeoExactRouteDescriptor(
    boundsForList(matches),
    entry.canonicalPath,
    baselineFilters
  );
  return matches.filter((s) => scholarshipMatchesSeoExactDescriptor(s, descriptor));
}

function boundsForList(list: Scholarship[]): Bounds {
  return computeFilterBounds(list);
}

/** USA “matches” rows for this manifest entry (same pipeline as the listing client). */
export function getScholarshipsMatchingManifestEntry(
  list: Scholarship[],
  entry: SeoScholarshipRouteManifestEntry
): Scholarship[] {
  return exactSeoHitsForManifestEntry(list, entry);
}

/** Server-side: how many USA “matches” rows pass this SEO entry (same logic as listing client). */
export function countScholarshipsMatchingManifestEntry(
  list: Scholarship[],
  entry: SeoScholarshipRouteManifestEntry
): number {
  return exactSeoHitsForManifestEntry(list, entry).length;
}

/** Scholarship IDs (stable: `id` when present, else title+deadline fallback) for overlap checks. */
export function getScholarshipIdsMatchingManifestEntry(
  list: Scholarship[],
  entry: SeoScholarshipRouteManifestEntry
): Set<string> {
  const hits = exactSeoHitsForManifestEntry(list, entry);
  return new Set(
    hits.map((s) => {
      const id = s.id?.trim();
      if (id) return id;
      return `${s.title ?? ''}|${s.deadline ?? ''}`;
    })
  );
}

export function buildManifestEntrySeoExactDescriptor(
  bounds: Bounds,
  entry: SeoScholarshipRouteManifestEntry
): SeoExactRouteDescriptor {
  return buildSeoExactRouteDescriptor(
    bounds,
    entry.canonicalPath,
    buildMoreFiltersForManifestEntry(bounds, entry)
  );
}
