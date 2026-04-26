import assert from 'node:assert/strict';
import test from 'node:test';

import { assertSeoPayloadShape, type SeoPayload } from '@/lib/seo/seoPageContract';

test('assertSeoPayloadShape accepts minimal valid payload', () => {
  const p: SeoPayload = {
    type: 'essay',
    url: '/essays/how-to-write-example-essay',
    title: 'How to write an example essay',
    metaDescription: 'x'.repeat(120)
  };
  assert.doesNotThrow(() => assertSeoPayloadShape(p));
});

test('assertSeoPayloadShape rejects empty url', () => {
  assert.throws(
    () =>
      assertSeoPayloadShape({
        type: 'article',
        url: '   ',
        title: 'T',
        metaDescription: 'm'.repeat(120)
      }),
    /url is required/
  );
});

test('assertSeoPayloadShape rejects missing title string', () => {
  assert.throws(
    () =>
      assertSeoPayloadShape({
        type: 'provider',
        url: '/providers/acme',
        title: null as unknown as string,
        metaDescription: 'm'.repeat(120)
      }),
    /title must be a string/
  );
});
