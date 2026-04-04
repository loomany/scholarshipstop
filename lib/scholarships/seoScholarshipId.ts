import type { LongTailSlug } from '@/app/scholarships/scholarshipLongTailPresets';
import type { SeoScholarshipRouteManifestEntry } from '@/lib/scholarships/seoScholarshipManifest';

export type SeoPageKind = 'long_tail' | 'manifest' | 'preset' | 'category';

/**
 * Deterministic ID: one filter set / canonical path → one stable key.
 * Stored on manifest rows when generated; derived at runtime if missing.
 */
export function deriveSeoIdFromCanonicalPath(canonicalPath: string): string {
  const t = canonicalPath.trim().toLowerCase().replace(/\//g, '__');
  return `seo_${t.replace(/[^a-z0-9_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}`;
}

export function deriveSeoIdForLegacyPresetSlug(slug: LongTailSlug): string {
  return `seo_preset_${String(slug).replace(/-/g, '_')}`;
}

/** Prefer persisted manifest `seoId`, else derive from path / legacy slug. */
export function resolveSeoIdForListing(
  entry: SeoScholarshipRouteManifestEntry | null,
  legacySlug: LongTailSlug | null,
  canonicalPath: string
): string {
  if (entry?.seoId?.trim()) return entry.seoId.trim();
  if (legacySlug) return deriveSeoIdForLegacyPresetSlug(legacySlug);
  return deriveSeoIdFromCanonicalPath(canonicalPath);
}
