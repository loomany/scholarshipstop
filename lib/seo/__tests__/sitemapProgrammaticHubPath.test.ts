import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isCompareHubSeoGenerationCanonicalPath,
  normalizeSeoGenerationCanonicalPath
} from '@/lib/seo/sitemapProgrammaticHubPath';

test('normalize trims slashes and lowercases', () => {
  assert.equal(
    normalizeSeoGenerationCanonicalPath('  /Compare/States/Foo  '),
    'compare/states/foo'
  );
});

test('detects compare state and university queue paths', () => {
  assert.equal(isCompareHubSeoGenerationCanonicalPath('compare/states/a-vs-b'), true);
  assert.equal(
    isCompareHubSeoGenerationCanonicalPath('/compare/universities/x-vs-y'),
    true
  );
  assert.equal(isCompareHubSeoGenerationCanonicalPath('compare/states'), true);
  assert.equal(isCompareHubSeoGenerationCanonicalPath('compare/universities'), true);
});

test('non-compare scholarship hub paths are not compare hubs', () => {
  assert.equal(isCompareHubSeoGenerationCanonicalPath('california/economics-hub'), false);
  assert.equal(isCompareHubSeoGenerationCanonicalPath('compare-stories/foo'), false);
});
