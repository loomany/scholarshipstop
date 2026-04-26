import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeSeoPayload } from '@/lib/seo/normalizeSeoPayload';
import type { SeoPayload } from '@/lib/seo/seoPageContract';

test('normalize clips long title to audit max', () => {
  const out = normalizeSeoPayload({
    type: 'essay',
    url: '/essays/a',
    title: 'z'.repeat(100),
    metaDescription: 'm'.repeat(130)
  });
  assert.ok(out.title.length <= 70);
});

test('normalize pads short meta into audit range when non-empty', () => {
  const out = normalizeSeoPayload({
    type: 'article',
    url: '/resources/b',
    title: 't'.repeat(35),
    metaDescription: 'short'
  });
  assert.ok(out.metaDescription.length >= 120);
  assert.ok(out.metaDescription.length <= 160);
});
