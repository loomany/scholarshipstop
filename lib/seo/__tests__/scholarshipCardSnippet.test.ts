import assert from 'node:assert/strict';
import test from 'node:test';

import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { buildScholarshipCardSnippet } from '@/lib/seo/scholarshipSeoQualityPolicy';

const snippetBase = {
  fieldOfStudy: ['agriculture_and_related_sciences'],
  studyLevels: [],
  amount: '$3,165',
  awardAmount: '$3,165',
  eligibility: ['Open to eligible students'],
  essayRequired: true,
  payoutMethod: 'direct'
} satisfies Pick<
  Scholarship,
  | 'fieldOfStudy'
  | 'studyLevels'
  | 'amount'
  | 'awardAmount'
  | 'eligibility'
  | 'essayRequired'
  | 'payoutMethod'
>;

test('buildScholarshipCardSnippet formats ISO deadline_text like the card column', () => {
  const snippet = buildScholarshipCardSnippet(
    {
      ...snippetBase,
      deadline: '2026-11-30T23:59:59Z',
      deadlineAt: '2026-11-30T23:59:59.999Z'
    },
    '$3,165',
    true
  );
  assert.match(snippet, /Nov 30, 2026 deadline/);
  assert.doesNotMatch(snippet, /T23:59:59/);
});

test('buildScholarshipCardSnippet keeps human deadline_text', () => {
  const snippet = buildScholarshipCardSnippet(
    {
      ...snippetBase,
      studyLevels: ['graduate_student'],
      fieldOfStudy: [],
      deadline: '30 Jun 2026',
      deadlineAt: '2026-06-30T23:59:59.999Z'
    },
    '10.000 USD',
    true
  );
  assert.match(snippet, /30 Jun 2026|Jun 30, 2026/);
  assert.doesNotMatch(snippet, /T23:59:59/);
});
