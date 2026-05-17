import assert from 'node:assert/strict';
import test from 'node:test';

import {
  visiblePaginationItems,
  visiblePaginationItemsDesktop
} from '@/lib/pagination/visiblePaginationItems';

function numericPages(items: (number | 'ellipsis')[]): number[] {
  return items.filter((x): x is number => x !== 'ellipsis');
}

test('desktop: totalPages=2158 shows 1–6, ellipsis, and last at current=1', () => {
  const items = visiblePaginationItemsDesktop(1, 2158);
  assert.deepEqual(items, [1, 2, 3, 4, 5, 6, 'ellipsis', 2158]);
  assert.ok(!numericPages(items).includes(7));
  assert.ok(!numericPages(items).includes(8));
  assert.ok(!numericPages(items).includes(9));
});

test('mobile: totalPages=2158 shows 1–4, ellipsis, and last page at current=1', () => {
  const items = visiblePaginationItems(1, 2158);
  assert.deepEqual(items, [1, 2, 3, 4, 'ellipsis', 2158]);
});

test('mobile: current past leading block includes neighbors and last', () => {
  const nums = numericPages(visiblePaginationItems(50, 2158));
  assert.deepEqual(nums, [1, 2, 3, 4, 49, 50, 51, 2158]);
});

test('desktop: totalPages=10 shows 1–6, ellipsis, and last', () => {
  const items = visiblePaginationItemsDesktop(1, 10);
  assert.deepEqual(items, [1, 2, 3, 4, 5, 6, 'ellipsis', 10]);
});

test('desktop: totalPages=6 lists every page (no ellipsis)', () => {
  const items = visiblePaginationItemsDesktop(1, 6);
  assert.deepEqual(items, [1, 2, 3, 4, 5, 6]);
});

test('mobile: totalPages=10 shows leading block, ellipsis, and last', () => {
  const items = visiblePaginationItems(1, 10);
  assert.deepEqual(items, [1, 2, 3, 4, 'ellipsis', 10]);
});

test('desktop: current in middle includes neighbors and last', () => {
  const nums = numericPages(visiblePaginationItemsDesktop(100, 2158));
  assert.ok(nums.includes(99));
  assert.ok(nums.includes(100));
  assert.ok(nums.includes(101));
  assert.ok(nums.includes(2158));
});
