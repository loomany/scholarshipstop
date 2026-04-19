import { SITE_BRAND } from '@/lib/seo/siteTitle';
import { getURL } from '@/utils/helpers';

/**
 * Homepage-only JSON-LD (WebPage) that links into the root layout @graph via stable @id.
 * Keeps the global Organization / WebSite block in `app/layout.tsx` as the single publisher source.
 */
export function buildHomePageJsonLd(): Record<string, unknown> {
  const siteUrl = getURL().replace(/\/+$/, '');
  const pageUrl = `${siteUrl}/`;
  const desc =
    `${SITE_BRAND} — answer a few quick questions and find scholarships you can apply for today.`;

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: `${SITE_BRAND} | Get Matched With Scholarships in 2 Minutes`,
    description: desc,
    isPartOf: { '@id': `${siteUrl}#website` },
    about: { '@id': `${siteUrl}#scholarshiptop-publisher` },
    inLanguage: 'en-US'
  };
}
