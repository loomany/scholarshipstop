import assert from 'node:assert/strict';
import test from 'node:test';

import { buildScholarshipDetailSeoTitle } from '@/lib/seo/scholarshipDetailSeoTitle';

test('scholarship detail title does not invent USA or apply claims', () => {
  const title = buildScholarshipDetailSeoTitle({
    title: 'Allan and Louise Anderson and Elaine Andrew Bursary',
    provider: 'RRC Polytech'
  });

  assert.equal(title.includes('USA'), false);
  assert.equal(/apply/i.test(title), false);
});

test('scholarship detail title keeps unknown-country pages factual', () => {
  const title = buildScholarshipDetailSeoTitle({
    title: 'Community Leadership Award',
    provider: null
  });

  assert.equal(title, 'Community Leadership Award | ScholarshipTop');
  assert.equal(title.includes('USA'), false);
});
