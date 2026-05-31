import {
  buildArticleJsonLd,
  buildBreadcrumbListJsonLd,
  buildEducationalOrganizationJsonLd,
  buildFaqPageJsonLd,
  buildItemListJsonLd,
  buildOrganizationJsonLd,
  buildWebPageJsonLd,
  serializeJsonLd,
  validateJsonLdShape
} from '@/lib/seo/jsonLd';
import { buildUniversityHubJsonLdBlocks } from '@/lib/scholarships/universityHubJsonLd';
import { buildScholarshipListingJsonLd, buildStateScholarshipBreadcrumbs } from '@/app/scholarships/scholarshipListingJsonLd';

type SampleCase = {
  name: string;
  build: () => Record<string, unknown> | Record<string, unknown>[] | null;
};

const samples: SampleCase[] = [
  {
    name: 'resource-breadcrumbs',
    build: () =>
      buildBreadcrumbListJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Resources', path: '/resources' },
        { name: 'Best scholarship websites', path: '/resources/best-scholarship-websites' }
      ])
  },
  {
    name: 'resource-article',
    build: () =>
      buildArticleJsonLd({
        url: '/resources/best-scholarship-websites',
        headline: 'Best Scholarship Websites',
        description: 'Compare trusted scholarship search sites.',
        datePublished: '2024-01-01',
        type: 'BlogPosting'
      })
  },
  {
    name: 'essay-article',
    build: () =>
      buildArticleJsonLd({
        url: '/essays/financial-need',
        headline: 'Financial Need Essay Guide',
        description: 'How to write a financial need essay.',
        type: 'Article'
      })
  },
  {
    name: 'provider-organization',
    build: () =>
      buildOrganizationJsonLd({
        name: 'Loyola University Chicago',
        url: '/providers/loyola-university-chicago',
        description: 'Scholarships and profile for Loyola University Chicago.'
      })
  },
  {
    name: 'provider-educational-organization',
    build: () =>
      buildEducationalOrganizationJsonLd({
        name: 'Loyola University Chicago',
        url: '/providers/loyola-university-chicago',
        description: 'Scholarships and profile for Loyola University Chicago.',
        addressLocality: 'Chicago',
        addressRegion: 'IL'
      })
  },
  {
    name: 'state-scholarship-listing',
    build: () =>
      buildScholarshipListingJsonLd({
        name: 'Scholarships in Texas · 2026',
        description: 'Browse scholarships in Texas.',
        path: '/scholarships/texas',
        result: {
          scholarships: [
            {
              id: '1',
              title: 'Example Scholarship',
              slug: 'example-scholarship'
            } as never
          ],
          seoFallback: undefined
        },
        breadcrumbs: buildStateScholarshipBreadcrumbs({
          stateLabel: 'Texas',
          stateSlug: 'texas'
        })
      })
  },
  {
    name: 'university-hub-bundle',
    build: () =>
      buildUniversityHubJsonLdBlocks({
        pageTitle: 'Fully Funded Scholarships at Tarleton State University, Texas 2026',
        pageDescription: 'Find scholarships linked to Tarleton State University.',
        canonicalPath: '/scholarships/texas/tarleton-state-university',
        stateLabel: 'Texas',
        stateSlug: 'texas',
        universityName: 'Tarleton State University',
        universitySlug: 'tarleton-state-university',
        scholarships: [
          {
            id: '1',
            title: 'Tarleton Example Award',
            slug: 'tarleton-example'
          } as never
        ],
        faqItems: [
          {
            question: 'Does Tarleton State University give scholarships to international students?',
            answer: 'Many programs may include international eligibility; check each listing.'
          }
        ]
      })
  },
  {
    name: 'compare-item-list',
    build: () =>
      buildItemListJsonLd({
        name: 'Compare states',
        url: '/compare/states',
        items: [
          { name: 'California vs Texas', url: '/compare/states/california-vs-texas' }
        ]
      })
  },
  {
    name: 'faq-page',
    build: () =>
      buildFaqPageJsonLd(
        [
          {
            question: 'How do I find scholarships?',
            answer: 'Use filters and open official provider listings.'
          }
        ],
        '/resources/how-to-find-scholarships'
      )
  },
  {
    name: 'web-page',
    build: () =>
      buildWebPageJsonLd({
        name: 'Compare California vs Texas',
        url: '/compare/states/california-vs-texas',
        description: 'Compare scholarship and cost context across California and Texas.'
      })
  }
];

function assertParsableJson(name: string, value: Record<string, unknown>): void {
  const serialized = serializeJsonLd(value);
  JSON.parse(serialized);
  const issues = validateJsonLdShape(value);
  if (issues.length > 0) {
    throw new Error(`${name}: ${issues.join('; ')}`);
  }
}

function main(): void {
  let checked = 0;

  for (const sample of samples) {
    const built = sample.build();
    const blocks = Array.isArray(built) ? built : built ? [built] : [];
    if (blocks.length === 0) {
      throw new Error(`${sample.name}: builder returned no blocks`);
    }

    for (const [index, block] of blocks.entries()) {
      assertParsableJson(`${sample.name}[${index}]`, block);
      checked += 1;
    }
  }

  console.log(`OK: validated ${checked} JSON-LD sample block(s) across ${samples.length} cases.`);
}

main();
