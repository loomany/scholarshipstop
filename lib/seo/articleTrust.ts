import { getURL } from '@/utils/helpers';

export const ARTICLE_AUTHOR_NAME = 'Daur';
export const ARTICLE_AUTHOR_TITLE =
  'ScholarshipTop founder and scholarship data reviewer';
export const ARTICLE_REVIEWER_NAME = 'ScholarshipTop editorial review';

export function articleAuthorJsonLd(): Record<string, unknown> {
  const aboutUrl = getURL('/about');
  return {
    '@type': 'Person',
    '@id': `${aboutUrl}#founder`,
    name: ARTICLE_AUTHOR_NAME,
    url: `${aboutUrl}#founder`,
    jobTitle: ARTICLE_AUTHOR_TITLE,
    worksFor: {
      '@type': 'Organization',
      name: 'ScholarshipTop',
      url: getURL('/')
    },
    knowsAbout: [
      'Scholarship discovery',
      'Scholarship data quality',
      'Student grant application planning'
    ]
  };
}

export function articleReviewerJsonLd(): Record<string, unknown> {
  return {
    '@type': 'Organization',
    name: ARTICLE_REVIEWER_NAME,
    url: getURL('/scholarship-verification-methodology')
  };
}
