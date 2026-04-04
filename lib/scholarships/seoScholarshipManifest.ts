import type { DeadlinePreset } from '@/app/scholarships/moreFilters';
import type { LongTailSlug } from '@/app/scholarships/scholarshipLongTailPresets';

/** Serializable filter patch (no Sets) — rebuilt on the client. */
export type SeoScholarshipRouteFiltersJson = {
  includeEligibility?: string[];
  includeEducationLevels?: string[];
  includeGpaBuckets?: string[];
  includeLocationLabels?: string[];
  includeEasyApply?: string[];
  deadlinePreset?: DeadlinePreset;
  /** Narrow amount range (intersected with page bounds at runtime). */
  amountCap?: number;
  dataCompletenessVerifiedOnly?: boolean;
  payoutCollege?: boolean;
  payoutStudent?: boolean;
  payoutNonMonetary?: boolean;
  payoutNotStated?: boolean;
};

/** Optional overlap diagnostics (auto-generated routes). */
export type SeoRouteOverlapMeta = {
  /**
   * Double/triple: max_i |child|/|parent_i| vs composing parents (narrowing / duplicate-likeness).
   * Single-path legacy: may still use subset overlap where applicable.
   */
  ratio: number;
  /** Parent (or pair) listing whose relative size was maximal. */
  parentCanonicalPath: string;
};

export type SeoRouteQualityBucket =
  | 'GOOD'
  | 'SUPPORTING'
  | 'THIN'
  | 'EMPTY'
  | 'TOO_BROAD'
  | 'ERROR';

export type SeoRouteReasonCode =
  | 'exact_zero'
  | 'fallback_used'
  | 'too_broad_ratio'
  | 'thin_result_set'
  | 'empty_result_set'
  | 'overlap_too_high'
  | 'weak_facet_combo'
  | 'weak_facet_only'
  | 'render_below_threshold'
  | 'exact_below_threshold'
  | 'supporting_result_set'
  | 'manifest_render_mismatch'
  | 'render_error'
  | 'dynamic_route'
  | 'good_route';

export type SeoRouteQualitySnapshot = {
  exactCount: number;
  renderedCount: number;
  totalCatalog: number;
  selectivityRatio: number;
  fallbackUsed: boolean;
  overlapScore: number;
  overlapSimilarity?: number;
  overlapTarget?: string | null;
  facetPenalty: number;
  intentScore: number;
  finalQualityScore: number;
};

export type SeoScholarshipRouteManifestEntry = {
  /** Canonical path without leading slash, e.g. for-women/no-essay */
  canonicalPath: string;
  /**
   * Stable unique key for this filter set (deterministic; used for dedupe + audits).
   * Optional on older manifest rows — derive with `deriveSeoIdFromCanonicalPath`.
   */
  seoId?: string;
  /** High-level route family for tooling / audits. */
  pageKind?: 'long_tail' | 'manifest' | 'preset' | 'category';
  pageType: 'single' | 'double' | 'triple';
  /** Legacy long-tail slugs whose base filters (AND) and more-filters deltas merge. */
  legacyBaseSlugs?: LongTailSlug[];
  /** Extra include-* filters on top of merged legacy states. */
  filters?: SeoScholarshipRouteFiltersJson;
  /** Minimum scholarships counted when route was generated (quality guard). */
  minCountSnapshot?: number;
  /** Live count snapshot (scripts / builder). */
  scholarshipsCount?: number;
  /** Heuristic quality score from builder (higher = stronger). */
  score?: number;
  /** If false, robots noindex + omit from sitemap. */
  indexable?: boolean;
  /** `auto` = produced by build script; omit or `manual` = hand-curated. */
  source?: 'manual' | 'auto';
  priorityBucket?: 'high' | 'medium' | 'low';
  /** When true, merge script keeps h1/meta copy from the existing row. */
  manualLockedCopy?: boolean;
  /** When true, merge script does not change `indexable`. */
  manualLockedIndexable?: boolean;
  lastEvaluatedAt?: string;
  overlapMeta?: SeoRouteOverlapMeta;
  qualityBucket?: SeoRouteQualityBucket;
  qualitySnapshot?: SeoRouteQualitySnapshot;
  canonicalTarget?: string | null;
  noindexNow?: boolean;
  reasonCodes?: SeoRouteReasonCode[];
  /** Optional human notes (curated rows). */
  notes?: string;
  h1Fallback: string;
  metaTitleFallback: string;
  metaDescriptionFallback: string;
  priority?: number;
};

export type SeoScholarshipRoutesManifest = {
  version: number;
  generatedAt: string;
  promptVersion?: string;
  routes: SeoScholarshipRouteManifestEntry[];
};

