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
    `${SITE_BRAND} helps you find verified scholarships that fit your profile, stay on top of deadlines, and apply through official provider websites with less guesswork.`;

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: `${SITE_BRAND} | Verified Scholarships That Fit Your Profile`,
    description: desc,
    isPartOf: { '@id': `${siteUrl}#website` },
    about: { '@id': `${siteUrl}#scholarshiptop-publisher` },
    inLanguage: 'en-US'
  };
}
