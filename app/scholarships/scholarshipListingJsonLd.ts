import {
  scholarshipPublicPath,
  type Scholarship
} from '@/app/scholarships/scholarshipsData';
import type { ScholarshipListResult } from '@/lib/scholarships/scholarshipListServer';
import { getURL } from '@/utils/helpers';

type ScholarshipListingJsonLdInput = {
  name: string;
  description: string;
  path: string;
  result: Pick<ScholarshipListResult, 'scholarships' | 'seoFallback'>;
};

export function buildScholarshipListingJsonLd({
  name,
  description,
  path,
  result
}: ScholarshipListingJsonLdInput): Record<string, unknown> | null {
  const scholarships = result.scholarships ?? [];
  if (scholarships.length === 0) return null;
  if (result.seoFallback?.used) return null;

  const pageUrl = getURL(path.replace(/^\//, ''));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        name,
        description,
        url: pageUrl
      },
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#scholarship-list`,
        name,
        description,
        url: pageUrl,
        numberOfItems: scholarships.length,
        itemListElement: scholarships.map((scholarship: Scholarship, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: scholarship.title,
          url: getURL(scholarshipPublicPath(scholarship).replace(/^\//, ''))
        }))
      }
    ]
  };
}
