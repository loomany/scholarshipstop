import assert from 'node:assert/strict';
import test from 'node:test';

import { buildScholarshipHubRouteMetadata } from '@/app/scholarships/scholarshipHubPageMetadata';
import { parseResourcesIndexSearchParams } from '@/lib/content-hub/resourcesIndexFilters';
import {
  compareIndexHasNonCanonicalView,
  parseCompareIndexSearchParams
} from '@/lib/seo/compareIndexFilters';
import { getCanonical } from '@/lib/seo/canonical';

function hubRobots(
  searchParams?: Record<string, string | string[] | undefined>
) {
  return buildScholarshipHubRouteMetadata({
    hubSegment: 'matches',
    searchParams
  }).robots;
}

function hubCanonical() {
  const alternates = buildScholarshipHubRouteMetadata({
    hubSegment: 'matches'
  }).alternates as { canonical?: string };
  return alternates.canonical;
}

test('scholarship hub matches page 2 is noindex, follow', () => {
  assert.deepEqual(hubRobots({ page: '2' }), { index: false, follow: true });
  assert.equal(hubCanonical(), getCanonical('/scholarships/hub/matches'));
});

test('scholarship hub matches page 2017 is noindex, follow', () => {
  assert.deepEqual(hubRobots({ page: '2017' }), { index: false, follow: true });
});

test('scholarship hub matches clean URL is indexable', () => {
  assert.deepEqual(hubRobots(undefined), { index: true, follow: true });
  assert.deepEqual(hubRobots({}), { index: true, follow: true });
});

test('compare state filter is noindex, follow with clean canonical', () => {
  assert.equal(compareIndexHasNonCanonicalView({ state: 'california' }), true);
  assert.equal(
    compareIndexHasNonCanonicalView({ state: 'california', page: '1' }),
    true
  );
});

test('compare clean hub is indexable', () => {
  assert.equal(compareIndexHasNonCanonicalView(undefined), false);
  assert.equal(compareIndexHasNonCanonicalView({}), false);
  assert.equal(parseCompareIndexSearchParams({}).page, 1);
});

test('resources cat=ai remains a non-canonical filtered view', () => {
  const state = parseResourcesIndexSearchParams({ cat: 'ai' });
  assert.equal(state.categoryId, 'ai');
  assert.equal(state.page, 1);
});

test('hub and compare metadata do not introduce /en canonicals', () => {
  const hubCanon = hubCanonical() ?? '';
  assert.equal(hubCanon.includes('/en/'), false);
  assert.equal(getCanonical('/compare').includes('/en/'), false);
});
