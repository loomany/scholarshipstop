import type { LongTailSlug } from '@/app/scholarships/scholarshipLongTailPresets';
import type {
  SeoScholarshipRouteFiltersJson,
  SeoScholarshipRouteManifestEntry
} from '@/lib/scholarships/seoScholarshipManifest';
import { parsePathSegmentsToTokens } from '@/lib/scholarships/seoScholarshipRouteTokens';
import type { SeoRouteToken } from '@/lib/scholarships/seoScholarshipRouteTokens';

function humanizeCanonicalPath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((seg) =>
      seg
        .split('-')
        .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1) : w))
        .join(' ')
    )
    .join(' · ');
}

function pageTypeFromTokenCount(n: number): SeoScholarshipRouteManifestEntry['pageType'] {
  if (n <= 1) return 'single';
  if (n === 2) return 'double';
  return 'triple';
}

/** True if this entry would change listing filters vs raw matches pool. */
export function entryHasFilterEffect(
  entry: SeoScholarshipRouteManifestEntry
): boolean {
  if (entry.legacyBaseSlugs && entry.legacyBaseSlugs.length > 0) return true;
  const f = entry.filters;
  if (!f) return false;
  if ((f.includeEligibility?.length ?? 0) > 0) return true;
  if ((f.includeEducationLevels?.length ?? 0) > 0) return true;
  if ((f.includeGpaBuckets?.length ?? 0) > 0) return true;
  if ((f.includeLocationLabels?.length ?? 0) > 0) return true;
  if ((f.includeEasyApply?.length ?? 0) > 0) return true;
  if (f.deadlinePreset && f.deadlinePreset !== 'any') return true;
  if (f.amountCap != null && Number.isFinite(f.amountCap)) return true;
  if (f.dataCompletenessVerifiedOnly) return true;
  if (f.payoutCollege || f.payoutStudent || f.payoutNonMonetary || f.payoutNotStated)
    return true;
  return false;
}

/**
 * Build a manifest-shaped entry from normalized URL tokens (no JSON manifest row required).
 */
export function buildDynamicSeoManifestEntry(
  tokens: SeoRouteToken[],
  canonicalPath: string
): SeoScholarshipRouteManifestEntry | null {
  if (tokens.length === 0) return null;

  const legacyBaseSlugs: LongTailSlug[] = [];
  const elig: string[] = [];
  const edu: string[] = [];
  const gpa: string[] = [];
  const loc: string[] = [];
  const easy: string[] = [];
  const filters: SeoScholarshipRouteFiltersJson = {};

  for (const t of tokens) {
    switch (t.kind) {
      case 'legacy_preset':
        legacyBaseSlugs.push(t.slug);
        break;
      case 'eligibility':
        elig.push(t.id);
        break;
      case 'education':
        edu.push(t.id);
        break;
      case 'gpa':
        gpa.push(t.id);
        break;
      case 'location':
        loc.push(t.label);
        break;
      case 'easy_apply':
        easy.push(t.id);
        break;
      case 'deadline':
        filters.deadlinePreset = t.preset;
        break;
      case 'verified':
        filters.dataCompletenessVerifiedOnly = true;
        break;
      case 'payout':
        if (t.id === 'college') filters.payoutCollege = true;
        if (t.id === 'student') filters.payoutStudent = true;
        if (t.id === 'non_monetary') filters.payoutNonMonetary = true;
        if (t.id === 'not_stated') filters.payoutNotStated = true;
        break;
    }
  }

  if (elig.length) filters.includeEligibility = elig;
  if (edu.length) filters.includeEducationLevels = edu;
  if (gpa.length) filters.includeGpaBuckets = gpa;
  if (loc.length) filters.includeLocationLabels = loc;
  if (easy.length) filters.includeEasyApply = easy;

  const label = humanizeCanonicalPath(canonicalPath);
  const entry: SeoScholarshipRouteManifestEntry = {
    canonicalPath,
    pageType: pageTypeFromTokenCount(tokens.length),
    legacyBaseSlugs: legacyBaseSlugs.length > 0 ? legacyBaseSlugs : undefined,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    indexable: false,
    qualityBucket: 'SUPPORTING',
    noindexNow: true,
    reasonCodes: ['dynamic_route'],
    h1Fallback: `${label} scholarships`,
    metaTitleFallback: `${label} | USA scholarships`,
    metaDescriptionFallback:
      'Browse USA scholarships that match these filters in our catalog. Compare deadlines, award amounts, and requirements—then confirm every detail on each official program page.'
  };

  return entry;
}

export function buildDynamicEntryFromCanonicalPath(
  canonicalPath: string
): SeoScholarshipRouteManifestEntry | null {
  const segments = canonicalPath.split('/').filter(Boolean);
  const tokens = parsePathSegmentsToTokens(segments);
  if (!tokens?.length) return null;
  return buildDynamicSeoManifestEntry(tokens, canonicalPath);
}
