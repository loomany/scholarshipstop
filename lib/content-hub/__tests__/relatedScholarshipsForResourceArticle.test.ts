import assert from 'node:assert/strict';
import test from 'node:test';

import { sortPreferDeadlineFirst } from '../relatedScholarshipSort';

test('sortPreferDeadlineFirst orders related items by deadline state', () => {
  const items = [
    { slug: 'a', title: 'A', score: 0, reason: 'r', deadline_text: null },
    {
      slug: 'b',
      title: 'B',
      score: 0,
      reason: 'r',
      deadline_text: 'March 1, 2002'
    },
    { slug: 'c', title: 'C', score: 0, reason: 'r', deadline_text: '  ' },
    {
      slug: 'd',
      title: 'D',
      score: 0,
      reason: 'r',
      deadline_text: 'December 31, 2099'
    },
    {
      slug: 'e',
      title: 'E',
      score: 0,
      reason: 'r',
      deadline_text: 'Rolling deadline'
    }
  ];
  const out = sortPreferDeadlineFirst(items);
  assert.deepEqual(
    out.map((item) => item.slug),
    ['d', 'e', 'a', 'c', 'b']
  );
});
