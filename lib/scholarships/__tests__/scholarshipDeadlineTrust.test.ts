import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deadlineTextAllowsCalendarSemantics,
  deadlineTextHasExplicitFourDigitYear,
  isPhantomCalendarYear2001,
  parseScholarshipDeadlineAnchor,
  scholarshipDeadlineSortMs
} from '@/lib/scholarships/scholarshipDeadlineTrust';

test('V8 parses "November 30" as 2001 — we do not anchor calendar UX on that', () => {
  assert.equal(
    parseScholarshipDeadlineAnchor(undefined, 'November 30'),
    null
  );
  assert.equal(
    parseScholarshipDeadlineAnchor(undefined, 'Plan to apply by November 30'),
    null
  );
});

test('explicit four-digit year in text is parsed', () => {
  const d = parseScholarshipDeadlineAnchor(undefined, 'November 30, 2026');
  assert.ok(d);
  assert.equal(d!.getUTCFullYear(), 2026);
});

test('phantom 2001 from ISO without 2001 in text is ignored', () => {
  assert.equal(
    parseScholarshipDeadlineAnchor('2001-11-30T12:00:00.000Z', 'November 30'),
    null
  );
  assert.ok(
    isPhantomCalendarYear2001('2001-11-30T12:00:00.000Z', 'November 30')
  );
});

test('legitimate year 2001 in source text keeps ISO', () => {
  const d = parseScholarshipDeadlineAnchor(
    '2001-01-15T12:00:00.000Z',
    'Due January 15, 2001'
  );
  assert.ok(d);
  assert.equal(d!.getUTCFullYear(), 2001);
});

test('deadlineTextHasExplicitFourDigitYear', () => {
  assert.equal(deadlineTextHasExplicitFourDigitYear('March 1'), false);
  assert.equal(deadlineTextHasExplicitFourDigitYear('March 1, 1999'), true);
});

test('scholarshipDeadlineSortMs is MAX_SAFE_INTEGER when no anchor', () => {
  assert.equal(
    scholarshipDeadlineSortMs(undefined, 'November 30'),
    Number.MAX_SAFE_INTEGER
  );
});

test('empty deadline_text uses deadline_date ISO only', () => {
  const d = parseScholarshipDeadlineAnchor(
    '2026-11-30T12:00:00.000Z',
    ''
  );
  assert.ok(d);
  assert.equal(d!.getUTCFullYear(), 2026);
});

test('deadlineTextAllowsCalendarSemantics', () => {
  assert.equal(deadlineTextAllowsCalendarSemantics(undefined), true);
  assert.equal(deadlineTextAllowsCalendarSemantics(''), true);
  assert.equal(deadlineTextAllowsCalendarSemantics('November 30'), false);
  assert.equal(deadlineTextAllowsCalendarSemantics('Nov 30, 2026'), true);
});
