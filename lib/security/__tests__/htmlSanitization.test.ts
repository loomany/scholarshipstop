import assert from 'node:assert/strict';
import test from 'node:test';

import { sanitizeArticleHtml } from '@/lib/content-hub/sanitizeArticleHtml';
import { markdownToHtml } from '@/services/content-hub/src/lib/html';

const malicious = [
  '<xmp><img src=x onerror=alert(1)></xmp>',
  '<script>alert(1)</script>',
  '<a href="javascript:alert(1)" onclick="alert(2)">unsafe</a>'
].join('');

function assertSafe(html: string) {
  assert.doesNotMatch(html, /<xmp|<script|onerror|onclick|javascript:/i);
}

test('application article sanitizer rejects raw-text and attribute XSS', () => {
  assertSafe(sanitizeArticleHtml(malicious));
});

test('content-hub markdown sanitizer rejects raw-text and attribute XSS', async () => {
  assertSafe(await markdownToHtml(malicious));
});
