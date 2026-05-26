import assert from 'node:assert/strict';
import test from 'node:test';

import {
  providersHubNationalIsSeoIndexable
} from '@/lib/providers/providersHubSearchParams';
import {
  compareIndexHasNonCanonicalView,
  parseCompareIndexSearchParams
} from '@/lib/seo/compareIndexFilters';
import { parseEssaysIndexSearchParams } from '@/lib/essays/essaysIndexFilters';

test('providers query, filter, and pagination views remain non-canonical', () => {
  assert.equal(providersHubNationalIsSeoIndexable(undefined), true);
  assert.equal(providersHubNationalIsSeoIndexable({ page: '2' }), false);
  assert.equal(providersHubNationalIsSeoIndexable({ q: 'test' }), false);
  assert.equal(
    providersHubNationalIsSeoIndexable({ country: 'other' }),
    false
  );
});

test('essay query state flags non-canonical views for metadata callers', () => {
  assert.equal(parseEssaysIndexSearchParams({ page: '2' }).page > 1, true);
  assert.equal(parseEssaysIndexSearchParams({ q: 'test' }).q, 'test');
});

test('compare query state keeps query-param pages separate from canonical route', () => {
  assert.equal(parseCompareIndexSearchParams({ page: '2' }).page > 1, true);
  assert.equal(parseCompareIndexSearchParams({ q: 'test' }).q, 'test');
  assert.equal(compareIndexHasNonCanonicalView({ state: 'texas' }), true);
});
