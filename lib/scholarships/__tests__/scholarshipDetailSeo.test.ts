import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { getScholarshipDetailUiCopy } from '@/lib/i18n/scholarshipDetailUiCopy';
import { buildScholarshipIntroParagraph } from '@/lib/scholarships/scholarshipDetailCopy';
import {
  buildScholarshipDetailJsonLd,
  buildScholarshipDetailMetaDescription
} from '@/lib/scholarships/scholarshipDetailSeo';
import {
  filterApplicationTipsForUi,
  getNextStepActions,
  shouldRenderSeoApplication
} from '@/lib/scholarships/scholarshipUiModel';

const sampleScholarship: Scholarship = {
  id: 'detail-seo-test-1',
  slug: 'women-in-stem-planning-scholarship',
  title: 'Women in STEM Planning Scholarship',
  country: 'USA',
  deadline: 'June 30, 2026',
  deadlineAt: '2026-06-30T23:59:59.999Z',
  description: 'A scholarship for STEM students.',
  eligibility: ['Open to women studying STEM fields.'],
  benefits: '$2,500',
  howToApply: ['Submit the provider application.'],
  provider: 'Example STEM Foundation',
  applyLink: 'https://example.org/apply',
  hasOfficialApplicationDestination: true,
  amount: '2500',
  institutionTypes: ['four-year colleges'],
  categorySlug: 'stem',
  updatedAt: '2026-06-01T00:00:00.000Z',
  documentsRequired: ['Transcript', 'Recommendation letter', 'Essay'],
  documentRequired: true,
  essayRequired: true,
  aiConfidenceScore: 0.8,
  summaryShort:
    'A focused STEM scholarship for applicants comparing award amount, deadline timing, and required materials.',
  seoFaq: [
    {
      question: 'Who should review this STEM scholarship first?',
      answer:
        'Students studying STEM fields should compare the listed eligibility, provider source, award context, and required materials before adding it to a shortlist.'
    },
    {
      question: 'What should applicants prepare before applying?',
      answer:
        'Applicants should check the official provider route, prepare the transcript, recommendation letter, and essay, then confirm whether the deadline changed.'
    }
  ]
};

const detailTemplateFiles = [
  'lib/i18n/scholarshipDetailUiCopy.ts',
  'app/scholarships/ScholarshipDetailPageClient.tsx',
  'components/scholarships/scholarship-detail/ScholarshipDetailSections.tsx'
];

const auditBoilerplatePhrases = [
  [
    'Use these details to understand fit,',
    'prepare materials, save the opportunity,',
    'and move toward the provider application path when ready.'
  ].join(' '),
  [
    'ScholarshipTop has a review',
    'timestamp for this listing.'
  ].join(' '),
  [
    'ScholarshipTop organizes eligibility signals',
    'so you can compare fit, prepare materials,',
    'and move toward the application path with less guesswork.'
  ].join(' '),
  [
    'ScholarshipTop organizes scholarship details, deadlines,',
    'eligibility signals, provider application paths, saved shortlists,',
    'and AI help in one workspace'
  ].join(' '),
  [
    'Listing-specific ideas from our AI layer',
    'to help you prepare materials and next steps.'
  ].join(' '),
  [
    'Materials you may need to upload or submit;',
    'check the official application for the final list.'
  ].join(' '),
  'Get matched with scholarships in 2 minutes',
  'Application readiness'
];

test('scholarship detail intro avoids audit boilerplate and injects listing facts', () => {
  const intro = buildScholarshipIntroParagraph(sampleScholarship);

  assert.ok(intro);
  assert.match(intro!, /Women in STEM Planning Scholarship/);
  assert.match(intro!, /Example STEM Foundation|four-year colleges/);
  assert.doesNotMatch(
    intro!,
    /offers this scholarship to help cover education costs/i
  );
  assert.doesNotMatch(intro!, /review eligibility and application steps/i);
  assert.doesNotMatch(intro!, /prepare required documents early/i);
});

test('scholarship detail templates omit near-duplicate audit boilerplate', () => {
  const source = detailTemplateFiles
    .map((file) => readFileSync(join(process.cwd(), file), 'utf8'))
    .join('\n');
  const renderedCopy = JSON.stringify(getScholarshipDetailUiCopy('en'));
  const corpus = `${source}\n${renderedCopy}`;

  for (const phrase of auditBoilerplatePhrases) {
    assert.equal(corpus.includes(phrase), false, phrase);
  }
});

test('scholarship detail meta description is data-specific and bounded', () => {
  const description = buildScholarshipDetailMetaDescription({
    ...sampleScholarship,
    seoExcerpt: null,
    summaryShort: null
  });

  assert.match(description, /Women in STEM Planning Scholarship/);
  assert.match(description, /Example STEM Foundation/);
  assert.match(description, /2500/);
  assert.ok(description.length <= 160);
});

test('scholarship detail JSON-LD emits WebPage, BreadcrumbList, and FAQPage only when grounded', () => {
  const blocks = buildScholarshipDetailJsonLd(sampleScholarship).filter(
    (block): block is Record<string, unknown> => Boolean(block)
  );
  const types = blocks.map((block) => block['@type']);

  assert.ok(types.includes('WebPage'));
  assert.ok(types.includes('BreadcrumbList'));
  assert.ok(types.includes('FAQPage'));
  assert.ok(!types.includes('Scholarship'));

  const webPage = blocks.find((block) => block['@type'] === 'WebPage');
  assert.equal(webPage?.dateModified, '2026-06-01T00:00:00.000Z');
});

test('scholarship detail suppresses generic FAQ and application instructions', () => {
  const genericApply = [
    'To apply, students should',
    'locate the official',
    'Women in STEM Planning Scholarship application,',
    'prepare all required',
    'documents in advance,',
    'follow the official',
    'application steps,',
    'and submit through the verified',
    'program link after final checks.'
  ].join(' ');
  const genericDocs = [
    'Prepare all required',
    'documents in advance and submit through',
    'the verified program link after your final checks.'
  ].join(' ');
  const genericScholarship: Scholarship = {
    ...sampleScholarship,
    seoApplication: genericApply,
    seoFaq: [
      {
        question: 'How do I apply?',
        answer: [
          'To apply, students should',
          'locate the official',
          'Women in STEM Planning Scholarship application',
          'and follow the official',
          'application steps.'
        ].join(' ')
      },
      {
        question: 'What should I do next?',
        answer: genericDocs
      }
    ]
  };

  const blocks = buildScholarshipDetailJsonLd(genericScholarship).filter(
    (block): block is Record<string, unknown> => Boolean(block)
  );
  const types = blocks.map((block) => block['@type']);

  assert.equal(types.includes('FAQPage'), false);
  assert.equal(shouldRenderSeoApplication(genericScholarship), false);
});

test('application tips keep concrete guidance and drop generic prep copy', () => {
  const tips = filterApplicationTipsForUi(
    [
      [
        'Prepare all required',
        'documents in advance and follow the official',
        'application steps.'
      ].join(' '),
      'Draft the 500-word STEM essay before requesting the recommendation letter.'
    ],
    { trustworthyAi: true }
  );

  assert.deepEqual(tips, [
    'Draft the 500-word STEM essay before requesting the recommendation letter.'
  ]);
});

test('next steps prefer concrete required materials over generic document copy', () => {
  const actions = getNextStepActions(sampleScholarship);

  assert.ok(actions.some((item) => item.includes('Transcript')));
  assert.ok(actions.some((item) => item.includes('June 30, 2026')));
  assert.ok(
    actions.some((item) => item.includes('Example STEM Foundation application path'))
  );
  assert.ok(
    actions.every((item) => !/document type\(s\) detected/i.test(item))
  );
});
