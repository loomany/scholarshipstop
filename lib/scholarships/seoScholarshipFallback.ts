import type { ScholarshipCategoryId } from '@/app/scholarships/scholarshipCategories';
import type { LongTailSlug } from '@/app/scholarships/scholarshipLongTailPresets';
import {
  cloneMoreFilters,
  defaultMoreFiltersFromBounds,
  type MoreFiltersState
} from '@/app/scholarships/moreFilters';
import { mergeLongTailSlugMoreFiltersOnly } from '@/lib/scholarships/seoScholarshipListing';
import { catalogLocationLabelsToStateCodes } from '@/lib/scholarships/scholarshipCatalog';
import type { ScholarshipListRequest } from '@/lib/scholarships/scholarshipListServer';

/** When labels map to `state_codes`, drop `location_tags` filter to avoid empty AND with DB shape. */
function stripMappedLocationLabels(m: MoreFiltersState, strip: boolean): MoreFiltersState {
  if (!strip) return m;
  const x = cloneMoreFilters(m);
  x.includeLocationLabels = new Set();
  return x;
}

export type SeoNuclearListingOptions = {
  /** Ignore manifest location → skip `state_codes` / `location_tags` narrowing (nationwide catalog). */
  dropGeo?: boolean;
};

/** True when the request carries a US state from catalog location labels (manifest geo pages). */
export function seoRequestHasCatalogStateGeo(req: ScholarshipListRequest): boolean {
  return catalogLocationLabelsToStateCodes(req.moreFilters.includeLocationLabels).length > 0;
}

/**
 * Strip client/URL noise before SEO relax attempts and nuclear query.
 *
 * **Clears:** `q`, `categoryIds`, `stateCodes`, `ignored`, `saved`, `started`, `submitted`,
 * `similarToId`, `similarCategorySlug`; `categoryPageSlug` → null unless `keepCategoryPageSlug`.
 *
 * **Does not clear:** `page`, `limit`, `sort`, `tab`, `listScope`, `deadline` (unused in SQL;
 * deadline comes from `moreFilters`), `moreFilters` (caller replaces per tier), `longTailLegacySlugs`
 * (caller replaces per tier).
 */
export function seoStripListingUrlNoise(
  req: ScholarshipListRequest,
  opts: { keepCategoryPageSlug: boolean }
): ScholarshipListRequest {
  return {
    ...req,
    q: '',
    categoryIds: new Set<ScholarshipCategoryId>(),
    stateCodes: [],
    categoryPageSlug: opts.keepCategoryPageSlug ? req.categoryPageSlug : null,
    catalogSubjectCategoryId: opts.keepCategoryPageSlug
      ? req.catalogSubjectCategoryId
      : null,
    ignored: [],
    saved: [],
    started: [],
    submitted: [],
    similarToId: null,
    similarCategorySlug: null
  };
}

/**
 * Last-resort SEO query: no `seo_tags` requirement, default catalog `moreFilters`,
 * no long_tail, no client id lists / similar. Keeps `includeLocationLabels` from the
 * original request when present so nuclear is not always nationwide.
 * Optional `categoryPageSlug` only for `/scholarships/category/...` (`isCategorySeo`).
 */
export function buildSeoNuclearListingRequest(
  req: ScholarshipListRequest,
  bounds: FilterBounds,
  isCategorySeo: boolean,
  nuclearOpts?: SeoNuclearListingOptions
): ScholarshipListRequest {
  if (nuclearOpts?.dropGeo) {
    return {
      ...seoStripListingUrlNoise(req, { keepCategoryPageSlug: isCategorySeo }),
      requiredSeoTags: [],
      longTailLegacySlugs: [],
      stateCodes: [],
      moreFilters: defaultMoreFiltersFromBounds(bounds),
      ignored: [],
      saved: [],
      started: [],
      submitted: [],
      similarToId: null,
      similarCategorySlug: null
    };
  }

  const geoCodes = catalogLocationLabelsToStateCodes(req.moreFilters.includeLocationLabels);
  const useStateForGeo = geoCodes.length > 0;
  const moreFilters = useStateForGeo
    ? defaultMoreFiltersFromBounds(bounds)
    : defaultMoreFiltersPreservingLocation(bounds, req.moreFilters.includeLocationLabels);
  return {
    ...seoStripListingUrlNoise(req, { keepCategoryPageSlug: isCategorySeo }),
    requiredSeoTags: [],
    longTailLegacySlugs: [],
    stateCodes: geoCodes,
    moreFilters,
    ignored: [],
    saved: [],
    started: [],
    submitted: [],
    similarToId: null,
    similarCategorySlug: null
  };
}

type FilterBounds = {
  amountMin: number;
  amountMax: number;
  applicantsMin: number;
  applicantsMax: number;
};

/**
 * Default catalog more-filters for SEO relax / nuclear steps, but keep geographic
 * intent from the original listing so state pages do not jump to nationwide counts.
 */
export function defaultMoreFiltersPreservingLocation(
  bounds: FilterBounds,
  locationLabels: ReadonlySet<string>
): MoreFiltersState {
  const d = defaultMoreFiltersFromBounds(bounds);
  if (locationLabels.size > 0) {
    d.includeLocationLabels = new Set(locationLabels);
  }
  return d;
}

/** Pages with fewer matches after fallback should be noindex + canonical widen. */
export const SEO_MIN_INDEXABLE_LIST_COUNT = 5;

/** Legacy slugs that narrow amount or time (removed in tier 4). */
export const SEO_AMOUNT_OR_TIME_SLUGS = new Set<LongTailSlug>([
  'under-5000',
  'under-10000',
  'closing-soon'
]);

/** Tier 1: drop no-essay easy-apply flag (narrowest modifier). */
export function seoRelaxRemoveNoEssayFlag(m: MoreFiltersState): MoreFiltersState {
  const x = cloneMoreFilters(m);
  x.includeEasyApply = new Set(
    Array.from(x.includeEasyApply).filter((id) => id !== 'no_essay')
  );
  return x;
}

/**
 * Tier 3: widen amount to catalog bounds; clear eligibility / GPA niches;
 * open deadline and completeness (keep location / education / payout from prior step).
 */
export function seoRelaxAmountAndNicheTags(
  m: MoreFiltersState,
  bounds: Pick<
    MoreFiltersState,
    'amountMin' | 'amountMax' | 'applicantsMin' | 'applicantsMax'
  >
): MoreFiltersState {
  const x = cloneMoreFilters(m);
  x.amountMin = bounds.amountMin;
  x.amountMax = bounds.amountMax;
  x.applicantsMin = bounds.applicantsMin;
  x.applicantsMax = bounds.applicantsMax;
  x.includeGpaBuckets = new Set();
  x.includeEligibility = new Set();
  x.deadlinePreset = 'any';
  x.dataCompleteness = {
    low: true,
    medium: true,
    high: true,
    verified: false
  };
  return x;
}

function reqRelaxKey(r: {
  longTailLegacySlugs: LongTailSlug[];
  moreFilters: MoreFiltersState;
}): string {
  return JSON.stringify({
    lt: r.longTailLegacySlugs,
    mf: {
      d: r.moreFilters.deadlinePreset,
      a: [r.moreFilters.amountMin, r.moreFilters.amountMax],
      el: Array.from(r.moreFilters.includeEligibility).sort(),
      gpa: Array.from(r.moreFilters.includeGpaBuckets).sort(),
      edu: Array.from(r.moreFilters.includeEducationLevels).sort(),
      loc: Array.from(r.moreFilters.includeLocationLabels).sort(),
      ez: Array.from(r.moreFilters.includeEasyApply).sort()
    }
  });
}

function dedupeRelaxAttempts<T extends { longTailLegacySlugs: LongTailSlug[]; moreFilters: MoreFiltersState }>(
  reqs: T[]
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of reqs) {
    const k = reqRelaxKey(r);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

/**
 * Ordered relax attempts after the exact query returned 0 rows.
 * Does not remove primary legacy base slugs (engineering, state topics, audience, etc.).
 *
 * @param slugOnlyMf merged legacy long-tail more-filters only (manifest `filters` stripped).
 */
export function buildLongTailSeoRelaxAttempts(
  req: ScholarshipListRequest,
  bounds: FilterBounds,
  slugOnlyMf: MoreFiltersState | null
): ScholarshipListRequest[] {
  const b = {
    amountMin: bounds.amountMin,
    amountMax: bounds.amountMax,
    applicantsMin: bounds.applicantsMin,
    applicantsMax: bounds.applicantsMax
  };

  const geoCodes = catalogLocationLabelsToStateCodes(req.moreFilters.includeLocationLabels);
  const stripLoc = geoCodes.length > 0;

  const base: ScholarshipListRequest = {
    ...seoStripListingUrlNoise(req, { keepCategoryPageSlug: false }),
    /** After exact=0, rerun without `seo_tags` so legacy SQL + moreFilters can match. */
    requiredSeoTags: [],
    stateCodes: geoCodes
  };

  const t1: ScholarshipListRequest = {
    ...base,
    moreFilters: stripMappedLocationLabels(
      seoRelaxRemoveNoEssayFlag(req.moreFilters),
      stripLoc
    )
  };

  const attempts: ScholarshipListRequest[] = [t1];

  let slugOnlyMerged: MoreFiltersState | null = null;
  if (slugOnlyMf) {
    const mf = cloneMoreFilters(slugOnlyMf);
    /** `buildSeoSlugOnlyMoreFilters` drops manifest `filters` (geo). Re-attach labels for non-state regions. */
    for (const lab of Array.from(req.moreFilters.includeLocationLabels)) {
      mf.includeLocationLabels.add(lab);
    }
    slugOnlyMerged = stripMappedLocationLabels(mf, stripLoc);
    attempts.push({
      ...base,
      moreFilters: slugOnlyMerged
    });
  }

  const baseForTier3 = slugOnlyMerged ?? t1.moreFilters;
  attempts.push({
    ...base,
    moreFilters: seoRelaxAmountAndNicheTags(cloneMoreFilters(baseForTier3), b)
  });

  const slugs4 = req.longTailLegacySlugs.filter(
    (s) => !SEO_AMOUNT_OR_TIME_SLUGS.has(s)
  );
  if (slugs4.length < req.longTailLegacySlugs.length) {
    const mf4 = mergeLongTailSlugMoreFiltersOnly(b, slugs4);
    for (const lab of Array.from(req.moreFilters.includeLocationLabels)) {
      mf4.includeLocationLabels.add(lab);
    }
    attempts.push({
      ...base,
      longTailLegacySlugs: slugs4,
      moreFilters: stripMappedLocationLabels(mf4, stripLoc)
    });
  }

  attempts.push({
    ...base,
    longTailLegacySlugs: [],
    moreFilters: stripLoc
      ? defaultMoreFiltersFromBounds(b)
      : defaultMoreFiltersPreservingLocation(b, req.moreFilters.includeLocationLabels)
  });

  return dedupeRelaxAttempts(attempts);
}

/** Category listing: no long_tail slugs; relax only more-filters. */
export function buildCategorySeoRelaxAttempts(
  req: ScholarshipListRequest,
  bounds: FilterBounds
): ScholarshipListRequest[] {
  const geoCodes = catalogLocationLabelsToStateCodes(req.moreFilters.includeLocationLabels);
  const stripLoc = geoCodes.length > 0;
  const base: ScholarshipListRequest = {
    ...seoStripListingUrlNoise(req, { keepCategoryPageSlug: true }),
    requiredSeoTags: [],
    stateCodes: geoCodes
  };
  const t1: ScholarshipListRequest = {
    ...base,
    moreFilters: stripMappedLocationLabels(
      seoRelaxRemoveNoEssayFlag(req.moreFilters),
      stripLoc
    )
  };
  const def = stripLoc
    ? defaultMoreFiltersFromBounds(bounds)
    : defaultMoreFiltersPreservingLocation(bounds, req.moreFilters.includeLocationLabels);
  const attempts: ScholarshipListRequest[] = [
    t1,
    { ...base, moreFilters: def },
    {
      ...base,
      moreFilters: seoRelaxAmountAndNicheTags(cloneMoreFilters(def), bounds)
    }
  ];
  return dedupeRelaxAttempts(attempts);
}
