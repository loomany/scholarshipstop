import assert from 'node:assert/strict';
import test from 'node:test';

import { sortPreferDeadlineFirst } from '../relatedScholarshipSort';

test('sortPreferDeadlineFirst puts items with deadline_text first', () => {
  const items = [
    { slug: 'a', title: 'A', score: 0, reason: 'r', deadline_text: null },
    {
      slug: 'b',
      title: 'B',
      score: 0,
      reason: 'r',
      deadline_text: 'March 1, 2026'
    },
    { slug: 'c', title: 'C', score: 0, reason: 'r', deadline_text: '  ' }
  ];
  const out = sortPreferDeadlineFirst(items);
  assert.equal(out[0]!.slug, 'b');
});
