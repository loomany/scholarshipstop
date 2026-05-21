import type { Metadata } from 'next';

import { buildLocalizedAlternates } from '@/lib/i18n/alternates';
import {
  getSubscriptionPricingUiCopy,
  SUBSCRIPTION_CANONICAL_PATH
} from '@/lib/i18n/subscriptionPageCopy';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import type { SupportedLocale } from '@/lib/i18n/types';
import { getLocalizedCanonical } from '@/lib/seo/canonical';

const SUBSCRIPTION_LOCALES: SupportedLocale[] = ['en', 'es', 'fr'];

/** English `/subscription` has no explicit robots — defaults to indexable. */
export function buildSubscriptionPageMetadata(
  locale: LocalizedUiLocale
): Metadata {
  const copy = getSubscriptionPricingUiCopy(locale);
  const alternates = buildLocalizedAlternates({
    canonicalPath: SUBSCRIPTION_CANONICAL_PATH,
    currentLocale: locale,
    availableLocales: SUBSCRIPTION_LOCALES,
    defaultUrl: getLocalizedCanonical(SUBSCRIPTION_CANONICAL_PATH, 'en')
  });

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates,
    openGraph: {
      title: copy.metaTitle,
      description: copy.metaDescription,
      url: alternates.canonical,
      type: 'website',
      siteName: 'ScholarshipTop',
      locale: locale === 'es' ? 'es_ES' : locale === 'fr' ? 'fr_FR' : 'en_US'
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.metaTitle,
      description: copy.metaDescription
    }
  };
}
