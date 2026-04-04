import manifestData from '@/data/seo-scholarship-routes.json';
import {
  getLongTailPreset,
  isScholarshipDetailUuidParam,
  normalizeScholarshipDynamicParam
} from '@/app/scholarships/scholarshipLongTailPresets';
import { buildDynamicEntryFromCanonicalPath } from '@/lib/scholarships/seoScholarshipDynamicEntry';
import { canonicalizeSegments } from '@/lib/scholarships/seoScholarshipRouteTokens';
import type { SeoScholarshipRouteManifestEntry } from '@/lib/scholarships/seoScholarshipManifest';

export type ResolvedScholarshipSlugPath =
  | { kind: 'scholarship_detail' }
  | { kind: 'legacy_long_tail'; slug: string }
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
 * Sitemap: auto routes must be explicitly indexable; manual/legacy rows treat
 * omitted `indexable` as true (backward compatible).
 */
export function routeIsSitemapIndexable(
  r: SeoScholarshipRouteManifestEntry
): boolean {
  if (r.indexable === false) return false;
  if (r.qualityBucket) return r.qualityBucket === 'GOOD' && r.indexable === true;
  if (r.source === 'auto') return r.indexable === true;
  return true;
}

export function getAllIndexableSeoManifestPaths(): string[] {
  return manifest.routes
    .filter(routeIsSitemapIndexable)
    .map((r) => r.canonicalPath);
}

/**
 * Resolve /scholarships/[...segments] to listing type. Single UUID → detail.
 */
export function resolveScholarshipSlugPath(
  segments: string[]
): ResolvedScholarshipSlugPath {
  const norm = segments.map((s) => normalizeScholarshipDynamicParam(s));

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

  const canon = canonicalizeSegments(norm);
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
