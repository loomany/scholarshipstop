import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { getScholarshipDetailIndexPolicy } from '@/lib/seo/scholarshipSeoQualityPolicy';

const auditedSourceFiles = [
  'app/scholarships/ScholarshipDetailPageClient.tsx',
  'app/scholarships/[[...slugPath]]/layout.tsx',
  'components/scholarships/scholarship-detail/ScholarshipDetailSections.tsx',
  'lib/i18n/scholarshipDetailUiCopy.ts',
  'lib/scholarships/scholarshipDetailCopy.ts',
  'lib/scholarships/scholarshipDetailSeo.ts',
  'lib/scholarships/scholarshipSeoSanitizers.ts',
  'lib/scholarships/scholarshipUiModel.ts',
  'scripts/generate-scholarship-detail-seo-ai.ts'
];

const nearDuplicateAuditPhrases = [
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
  [
    'Prepare all required documents in advance,',
    'follow the official application steps,',
    'and submit through the verified program link after your final checks.'
  ].join(' '),
  [
    'To apply, students should locate',
    'the official'
  ].join(' '),
  'Get matched with scholarships in 2 minutes',
  'Application readiness'
];

test('scholarship detail sources stay clear of audited boilerplate phrases', () => {
  const corpus = auditedSourceFiles
    .map((file) => readFileSync(join(process.cwd(), file), 'utf8'))
    .join('\n');

  for (const phrase of nearDuplicateAuditPhrases) {
    assert.equal(corpus.includes(phrase), false, phrase);
  }
});

test('count-only scholarship detail records are not indexable', () => {
  const thin: Scholarship = {
    id: 'thin-count-only',
    slug: 'thin-count-only',
    title: 'Thin Count Only Scholarship',
    country: 'USA',
    deadline: 'December 31, 2026',
    deadlineAt: '2026-12-31T23:59:59.999Z',
    description: '',
    eligibility: ['2 requirements; see the official page for full details.'],
    benefits: '',
    howToApply: [],
    provider: 'Example Provider',
    applyLink: 'https://example.org/apply',
    hasOfficialApplicationDestination: true,
    amount: '$1,000',
    summaryShort:
      'A thin scholarship record with amount, deadline, provider, and no distinctive eligibility or document detail.'
  };

  const policy = getScholarshipDetailIndexPolicy(thin);

  assert.equal(policy.indexable, false);
  assert.equal(policy.hasDistinctiveDetailBlock, false);
  assert.equal(policy.reasonCodes.includes('missing_eligibility'), true);
  assert.equal(
    policy.reasonCodes.includes('missing_distinctive_detail_block'),
    true
  );
});
