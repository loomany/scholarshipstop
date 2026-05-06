import crossCountryData from '@/data/seo-cross-country-routes.json';

export type CrossCountryManifestEntry = {
  applicantCode: string;
  hostCode: string;
  applicantSlug: string;
  hostSlug: string;
  canonicalPath: string;
  href: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  faqQuestions: string[];
  totalCountSnapshot: number;
  tier: string;
  qaStatus: string;
  duplicateRisk: string;
  unspecifiedRisk: string;
  status: string;
  robots: string;
  includeInSitemap: boolean;
  allowedForAds: boolean;
  enabled: boolean;
  qaNotes?: string;
};

export type CrossCountryManifestFile = {
  version: number;
  generatedAt: string;
  generatedFrom: string;
  previewGeneratedAt: string;
  entries: CrossCountryManifestEntry[];
};

const file = crossCountryData as CrossCountryManifestFile;

const entriesByCanonicalPath = new Map<string, CrossCountryManifestEntry>();
for (const e of file.entries) {
  entriesByCanonicalPath.set(e.canonicalPath, e);
}

/** Strip leading/trailing slashes; collapse accidental whitespace. */
export function normalizeCrossCountryCanonicalPath(canonicalPath: string): string {
  return canonicalPath.replace(/^\/+|\/+$/g, '').trim();
}

/** URL shape for cross-country SEO listings (manifest-backed when enabled). */
export function isCrossCountrySeoPathShape(norm: string[]): boolean {
  return (
    norm.length === 4 &&
    norm[0] === 'for-students-from' &&
    norm[2] === 'study-in'
  );
}

/**
 * Four segments: for-students-from / {applicant} / study-in / {host}.
 * Returns the manifest row only when `enabled === true`.
 */
export function getCrossCountryManifestEntryBySegments(
  norm: string[]
): CrossCountryManifestEntry | null {
  if (norm.length !== 4) return null;
  if (norm[0] !== 'for-students-from' || norm[2] !== 'study-in') return null;
  const applicantSlug = norm[1];
  const hostSlug = norm[3];
  if (!applicantSlug || !hostSlug) return null;
  const canonicalPath = `for-students-from/${applicantSlug}/study-in/${hostSlug}`;
  return getCrossCountryManifestEntryByCanonicalPath(canonicalPath);
}

export function getCrossCountryManifestEntryByCanonicalPath(
  canonicalPath: string
): CrossCountryManifestEntry | null {
  const key = normalizeCrossCountryCanonicalPath(canonicalPath);
  const entry = entriesByCanonicalPath.get(key);
  if (!entry || entry.enabled !== true) return null;
  return entry;
}

/** Sitemap-ready rows only (indexing policy); resolver may still serve other enabled pairs. */
export function listCrossCountrySitemapEntries(): CrossCountryManifestEntry[] {
  return file.entries.filter(
    (e) =>
      e.enabled === true &&
      e.includeInSitemap === true &&
      e.robots === 'index,follow' &&
      (e.status === 'approved' || e.status === 'approved_priority')
  );
}

/**
 * Layout metadata robots for cross-country listings: status overrides inconsistent manifest rows.
 */
export function crossCountryListingRobotsFromManifest(
  entry: CrossCountryManifestEntry
): { index: boolean; follow: boolean } {
  if (entry.status === 'manual_review' || entry.status === 'published_noindex') {
    return { index: false, follow: true };
  }
  if (entry.status === 'approved' || entry.status === 'approved_priority') {
    if (entry.robots === 'index,follow') {
      return { index: true, follow: true };
    }
    return { index: false, follow: true };
  }
  if (entry.robots === 'index,follow') {
    return { index: true, follow: true };
  }
  return { index: false, follow: true };
}
