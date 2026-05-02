import manifestData from '@/data/seo-scholarship-routes.json';
import {
  getLongTailPreset,
  isScholarshipDetailUuidParam,
  normalizeScholarshipDynamicParam
} from '@/app/scholarships/scholarshipLongTailPresets';
import { buildDynamicEntryFromCanonicalPath } from '@/lib/scholarships/seoScholarshipDynamicEntry';
import {
  canonicalizeSegments,
  listUsStateSeoSlugs
} from '@/lib/scholarships/seoScholarshipRouteTokens';
import type { SeoScholarshipRouteManifestEntry } from '@/lib/scholarships/seoScholarshipManifest';
import {
  resolveScholarshipCountrySeoRoute,
  type ScholarshipCountrySeoRoute
} from '@/app/scholarships/scholarshipCountrySeo';

/** US state segments first so filters and canonical URLs prioritize location (e.g. nursing/california → california/nursing). */
function prioritizeUsStateSegmentsNorm(norm: string[]): string[] {
  const stateSet = new Set(listUsStateSeoSlugs());
  const states: string[] = [];
  const rest: string[] = [];
  for (const s of norm) {
    if (stateSet.has(s)) states.push(s);
    else rest.push(s);
  }
  return [...states, ...rest];
}

export type ResolvedScholarshipSlugPath =
  | { kind: 'scholarship_detail' }
  | { kind: 'legacy_long_tail'; slug: string }
  | { kind: 'country_seo'; route: ScholarshipCountrySeoRoute }
  | {
      kind: 'manifest_seo';
      entry: SeoScholarshipRouteManifestEntry;
      canonicalPath: string;
    }
  | { kind: 'redirect_canonical'; canonicalPath: string }
  | { kind: 'not_found' };

type ManifestFile = {
  routes: SeoScholarshipRouteManifestEntry[];
};

const manifest = manifestData as ManifestFile;

const manifestByPath = new Map<string, SeoScholarshipRouteManifestEntry>();
for (const r of manifest.routes) {
  manifestByPath.set(r.canonicalPath, r);
}

export function getSeoManifestRoute(
  canonicalPath: string
): SeoScholarshipRouteManifestEntry | undefined {
  return manifestByPath.get(canonicalPath);
}

/** Curated manifest row if present, otherwise a dynamic entry built from canonical path tokens. */
export function getSeoListingEntry(
  canonicalPath: string
): SeoScholarshipRouteManifestEntry | null {
  const fromManifest = manifestByPath.get(canonicalPath);
  if (fromManifest) return fromManifest;
  return buildDynamicEntryFromCanonicalPath(canonicalPath);
}

/**
 * Sitemap inclusion is driven only by explicit route-level opt-out.
 * Quality/runtime noindex heuristics are not used here.
 */
export function routeIsSitemapIndexable(
  r: SeoScholarshipRouteManifestEntry
): boolean {
  if (r.indexable === false) return false;
  return true;
}

export function getAllIndexableSeoManifestPaths(): string[] {
  return manifest.routes
    .filter(routeIsSitemapIndexable)
    .map((r) => r.canonicalPath);
}

export function getManifestRouteGrantCount(
  entry: SeoScholarshipRouteManifestEntry
): number {
  return entry.scholarshipsCount ?? entry.minCountSnapshot ?? 0;
}

/** Sitemap: manifest rows must be indexable and have more than `minGrants` catalog matches. */
export function manifestEntryMeetsSitemapGrantThreshold(
  entry: SeoScholarshipRouteManifestEntry,
  minGrants = 3
): boolean {
  if (!routeIsSitemapIndexable(entry)) return false;
  return getManifestRouteGrantCount(entry) > minGrants;
}

export function getAllIndexableSeoManifestPathsForSitemap(
  minGrants = 3
): string[] {
  return manifest.routes
    .filter((r) => manifestEntryMeetsSitemapGrantThreshold(r, minGrants))
    .map((r) => r.canonicalPath);
}

/**
 * Resolve /scholarships/[...segments] to listing type. Single UUID → detail.
 */
export function resolveScholarshipSlugPath(
  segments: string[]
): ResolvedScholarshipSlugPath {
  const norm = segments.map((s) => normalizeScholarshipDynamicParam(s));

  const countrySeo = resolveScholarshipCountrySeoRoute(norm);
  if (countrySeo) {
    return { kind: 'country_seo', route: countrySeo };
  }

  if (norm.length === 1 && isScholarshipDetailUuidParam(norm[0]!)) {
    return { kind: 'scholarship_detail' };
  }

  /**
   * Single segment may be both a legacy long-tail preset (engineering, no-essay, …) and a curated
   * manifest row. Prefer manifest so listing + metadata use the same entry as the SEO AI JSON
   * (`data/seo-scholarship-content/{path}.json`), not `data/long-tail-seo/{slug}.json`.
   */
  if (norm.length === 1) {
    const single = norm[0]!;
    const curated = getSeoManifestRoute(single);
    if (curated) {
      return {
        kind: 'manifest_seo',
        entry: curated,
        canonicalPath: curated.canonicalPath
      };
    }
  }

  if (norm.length === 1 && getLongTailPreset(norm[0]!)) {
    return { kind: 'legacy_long_tail', slug: norm[0]! };
  }

  const canon = canonicalizeSegments(prioritizeUsStateSegmentsNorm(norm));
  if (!canon) {
    if (norm.length === 1) return { kind: 'scholarship_detail' };
    return { kind: 'not_found' };
  }

  if (canon.needsRedirect) {
    return { kind: 'redirect_canonical', canonicalPath: canon.canonicalPath };
  }

  const entry = getSeoListingEntry(canon.canonicalPath);
  if (entry) {
    return {
      kind: 'manifest_seo',
      entry,
      canonicalPath: canon.canonicalPath
    };
  }

  if (norm.length === 1) {
    return { kind: 'scholarship_detail' };
  }

  return { kind: 'not_found' };
}
