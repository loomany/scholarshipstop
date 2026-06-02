import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatScholarshipDeadlineCompactDate,
  usesUsScholarshipDeadlineDateOrder
} from '@/lib/scholarships/scholarshipDeadlineCompactDate';

const jun302026 = new Date('2026-06-30T12:00:00.000Z');

test('uses US order for en locales', () => {
  assert.equal(usesUsScholarshipDeadlineDateOrder('en'), true);
  assert.equal(usesUsScholarshipDeadlineDateOrder('en-US'), true);
  assert.equal(formatScholarshipDeadlineCompactDate(jun302026, 'en'), '06.30.26');
});

test('uses day-first order for non-US locales', () => {
  assert.equal(usesUsScholarshipDeadlineDateOrder('es'), false);
  assert.equal(formatScholarshipDeadlineCompactDate(jun302026, 'es'), '30.06.26');
  assert.equal(formatScholarshipDeadlineCompactDate(jun302026, 'fr'), '30.06.26');
});
