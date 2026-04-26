import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bucketSeoPublishResult,
  validateSeoBeforePublish
} from '@/lib/seo/validateSeoBeforePublish';
import type { SeoPayload } from '@/lib/seo/seoPageContract';

const base: SeoPayload = {
  type: 'essay',
  url: '/essays/x',
  title: 'x'.repeat(40),
  metaDescription: 'm'.repeat(130)
};

test('validate: ok bucket — score>=90 and no warnings', () => {
  const v = validateSeoBeforePublish(base);
  assert.equal(bucketSeoPublishResult(v), 'ok');
  assert.equal(v.issues.length, 0);
});

test('validate: below90 when title out of audit range', () => {
  const v = validateSeoBeforePublish({
    ...base,
    title: 'x'.repeat(10),
    metaDescription: 'm'.repeat(130)
  });
  assert.equal(bucketSeoPublishResult(v), 'below90');
  assert.ok(v.issues.some((i) => i.includes('title')));
});

test('validate: warnings bucket when title not ideal but audit ok', () => {
  const v = validateSeoBeforePublish({
    ...base,
    title: 'x'.repeat(28),
    metaDescription: 'm'.repeat(130)
  });
  assert.equal(v.issues.length, 0);
  assert.equal(bucketSeoPublishResult(v), 'warnings');
});
