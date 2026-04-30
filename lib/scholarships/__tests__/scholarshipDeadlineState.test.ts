import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compareScholarshipsByDeadlineState,
  getScholarshipDeadlineState,
  scholarshipDeadlineHasPassed,
  type ScholarshipDeadlineInput
} from '@/lib/scholarships/scholarshipDeadlineState';

const NOW = new Date('2026-04-30T12:00:00.000Z');

test('future trusted date is active', () => {
  assert.equal(
    getScholarshipDeadlineState(
      {
        deadline: 'November 30, 2026',
        deadlineAt: '2026-11-30T12:00:00.000Z'
      },
      NOW
    ),
    'active'
  );
});

test('past trusted date is expired', () => {
  const input = {
    deadline: 'March 1, 2026',
    deadlineAt: '2026-03-01T12:00:00.000Z'
  };

  assert.equal(getScholarshipDeadlineState(input, NOW), 'expired');
  assert.equal(scholarshipDeadlineHasPassed(input, NOW), true);
});

test('rolling deadline text is rolling', () => {
  for (const deadline of [
    'Rolling deadline',
    'Applications are ongoing',
    'Deadline varies by program',
    'Open year-round',
    'Accepted year-round'
  ]) {
    assert.equal(getScholarshipDeadlineState({ deadline }, NOW), 'rolling');
  }
});

test('no date and no text is unknown', () => {
  assert.equal(getScholarshipDeadlineState({}, NOW), 'unknown');
  assert.equal(getScholarshipDeadlineState({ deadline: '' }, NOW), 'unknown');
});

test('phantom 2001 deadline is broken', () => {
  assert.equal(
    getScholarshipDeadlineState(
      {
        deadline_text: 'November 30',
        deadline_date: '2001-11-30'
      },
      NOW
    ),
    'broken'
  );
});

test('comparator orders active, rolling, unknown, expired, broken', () => {
  const items: ScholarshipDeadlineInput[] = [
    { deadline_text: 'November 30', deadline_date: '2001-11-30' },
    { deadline: 'March 1, 2026', deadlineAt: '2026-03-01T12:00:00.000Z' },
    {},
    { deadline: 'Rolling deadline' },
    { deadline: 'November 30, 2026', deadlineAt: '2026-11-30T12:00:00.000Z' }
  ];

  const sorted = [...items].sort((a, b) =>
    compareScholarshipsByDeadlineState(a, b, NOW)
  );

  assert.deepEqual(
    sorted.map((item) => getScholarshipDeadlineState(item, NOW)),
    ['active', 'rolling', 'unknown', 'expired', 'broken']
  );
});
