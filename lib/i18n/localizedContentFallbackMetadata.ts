import type { Metadata } from 'next';

import { getCanonical } from '@/lib/seo/canonical';

/** SEO metadata for ES/FR URLs that render English body (noindex, canonical = English URL). */
export function buildEnglishFallbackPageMetadata({
  englishCanonicalPath,
  title,
  description,
  openGraphLocale
}: {
  englishCanonicalPath: string;
  title: string;
  description?: string;
  openGraphLocale?: 'es_ES' | 'fr_FR';
}): Metadata {
  const canonical = getCanonical(englishCanonicalPath);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      ...(openGraphLocale ? { locale: openGraphLocale } : {})
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: { index: false, follow: true }
  };
}
