import type { MetadataRoute } from 'next';

import { isRootLocale } from '@/lib/i18n/locales';
import type { SupportedLocale, TranslationStatus } from '@/lib/i18n/types';
import { getTranslatedPageSeoDecision } from '@/lib/i18n/translationPolicy';
import { normalizeCanonicalPath } from '@/lib/i18n/paths';
import { getLocalizedCanonical } from '@/lib/seo/canonical';

export type LocalizedSitemapBucket =
  | 'core'
  | 'resources'
  | 'essays'
  | 'providers'
  | 'categories'
  | 'seo'
  | 'scholarships'
  | 'compare';

export type LocalizedSitemapCandidate = {
  locale: SupportedLocale;
  canonicalPath: string;
  sourceIndexable: boolean;
  translationStatus: TranslationStatus;
  qualityScore?: number | null;
  hasLocalizedTitle: boolean;
  hasLocalizedH1: boolean;
  hasLocalizedBody: boolean;
  hasMixedLanguageRisk: boolean;
  hasQueryParams?: boolean;
  isFilterOrSearch?: boolean;
  isPrivate?: boolean;
  lastModified?: Date | string | null;
};

function pathHasQueryOrHash(path: string): boolean {
  return /[?#]/.test(path);
}

export function shouldIncludeLocalizedUrl(
  candidate: LocalizedSitemapCandidate
): boolean {
  if (candidate.isPrivate === true) return false;
  if (candidate.isFilterOrSearch === true) return false;
  if (candidate.hasQueryParams === true) return false;
  if (pathHasQueryOrHash(candidate.canonicalPath)) return false;

  const decision = getTranslatedPageSeoDecision(candidate);
  return decision.includeInSitemap;
}

export function buildLocalizedSitemapEntry(
  candidate: LocalizedSitemapCandidate
): MetadataRoute.Sitemap[number] | null {
  if (!shouldIncludeLocalizedUrl(candidate)) return null;
  return {
    url: getLocalizedCanonical(
      normalizeCanonicalPath(candidate.canonicalPath),
      candidate.locale
    ),
    ...(candidate.lastModified ? { lastModified: candidate.lastModified } : {})
  };
}

export function buildLocaleSitemapSlug(
  locale: SupportedLocale,
  bucket: LocalizedSitemapBucket,
  chunkIndex?: number
): string {
  const base = isRootLocale(locale) ? bucket : `locale-${locale}-${bucket}`;
  return typeof chunkIndex === 'number' ? `${base}-${chunkIndex}` : base;
}

