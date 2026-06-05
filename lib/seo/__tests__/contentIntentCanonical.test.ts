import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canonicalizeContentIntentLinksInHtml,
  scholarshipIntentCanonicalForContentRoute
} from '@/lib/seo/contentIntentCanonical';

test('ChatGPT supporting resource pages canonicalize to the pillar guide', () => {
  const canonical = scholarshipIntentCanonicalForContentRoute(
    'resource',
    'can-chatgpt-help-find-scholarships'
  );

  assert.equal(
    canonical?.canonicalPath,
    '/resources/how-to-use-chatgpt-to-search-for-scholarships'
  );
  assert.equal(
    scholarshipIntentCanonicalForContentRoute(
      'resource',
      'how-to-use-chatgpt-to-search-for-scholarships'
    ),
    null
  );
  assert.equal(
    scholarshipIntentCanonicalForContentRoute(
      'resource',
      'best-ai-tools-for-finding-scholarships'
    ),
    null
  );
});

test('content intent map keeps existing scholarship discovery canonicals', () => {
  assert.equal(
    scholarshipIntentCanonicalForContentRoute(
      'essay',
      '/No-Essay-Scholarships/'
    )?.canonicalPath,
    '/scholarships/no-essay'
  );
  assert.equal(
    scholarshipIntentCanonicalForContentRoute(
      'resource',
      'scholarships-closing-soon-guide'
    )?.canonicalPath,
    '/scholarships/closing-soon'
  );
});

test('article body links to supporting intent pages rewrite to canonical target', () => {
  const html =
    '<p><a href="/resources/can-chatgpt-help-find-scholarships?ref=related">Can ChatGPT help?</a></p>' +
    '<p><a href="/resources/how-to-use-chatgpt-to-search-for-scholarships">Primary</a></p>' +
    '<p><a href="https://example.com/resources/can-chatgpt-help-find-scholarships">External</a></p>';

  const rewritten = canonicalizeContentIntentLinksInHtml(html);

  assert.match(
    rewritten,
    /href="\/resources\/how-to-use-chatgpt-to-search-for-scholarships"/
  );
  assert.doesNotMatch(rewritten, /href="\/resources\/can-chatgpt-help/);
  assert.match(
    rewritten,
    /href="https:\/\/example\.com\/resources\/can-chatgpt-help-find-scholarships"/
  );
});
