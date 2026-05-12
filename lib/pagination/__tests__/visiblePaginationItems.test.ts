import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_TOTAL_PAGES_FOR_EXPLICIT_LAST_PAGE_CHIP,
  visiblePaginationItems,
  visiblePaginationItemsDesktop
} from '@/lib/pagination/visiblePaginationItems';

function numericPages(items: (number | 'ellipsis')[]): number[] {
  return items.filter((x): x is number => x !== 'ellipsis');
}

test('desktop: totalPages=2017 does not emit a page=2017 chip at current=1', () => {
  const nums = numericPages(visiblePaginationItemsDesktop(1, 2017));
  assert.ok(!nums.includes(2017));
  assert.ok(nums.includes(1));
  assert.ok(nums.includes(2));
});

test('mobile: totalPages=2017 does not emit a page=2017 chip at current=1', () => {
  const nums = numericPages(visiblePaginationItems(1, 2017));
  assert.ok(!nums.includes(2017));
  assert.ok(nums.includes(1));
  assert.ok(nums.includes(2));
});

test('desktop: totalPages=10 lists every page including the last', () => {
  const items = visiblePaginationItemsDesktop(1, 10);
  assert.deepEqual(items, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('mobile: totalPages=10 includes last page and link target for page 2', () => {
  const items = visiblePaginationItems(1, 10);
  const nums = numericPages(items);
  assert.ok(nums.includes(10));
  assert.ok(nums.includes(2));
});

test('desktop: current in middle includes neighbors current±1', () => {
  const nums = numericPages(visiblePaginationItemsDesktop(100, 2017));
  assert.ok(nums.includes(99));
  assert.ok(nums.includes(100));
  assert.ok(nums.includes(101));
});

test('boundary: explicit last chip only when total ≤ threshold', () => {
  assert.equal(MAX_TOTAL_PAGES_FOR_EXPLICIT_LAST_PAGE_CHIP, 100);
  const at100 = numericPages(visiblePaginationItemsDesktop(1, 100));
  assert.ok(at100.includes(100));
  const at101 = numericPages(visiblePaginationItemsDesktop(1, 101));
  assert.ok(!at101.includes(101));
});
