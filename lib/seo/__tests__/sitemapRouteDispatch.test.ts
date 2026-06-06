import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  getSitemapDocumentSlugPlan,
  normalizeSitemapSlug,
  slugMatchesSitemapGroup
} from '@/lib/seo/sitemapSlugDispatcher';

test('child sitemap dispatcher resolves known shard classes without /en routes', async () => {
  assert.equal(getSitemapDocumentSlugPlan('core.xml'), 'english-bucket');
  assert.equal(
    getSitemapDocumentSlugPlan('scholarships-0.xml'),
    'english-bucket'
  );
  assert.equal(getSitemapDocumentSlugPlan('essays-0.xml'), 'english-bucket');
  assert.equal(getSitemapDocumentSlugPlan('essays.xml'), 'not-found');
  assert.equal(
    getSitemapDocumentSlugPlan('locale-es-resources.xml'),
    'localized-pilot'
  );
  assert.equal(
    getSitemapDocumentSlugPlan('locale-es-compare-detail-db.xml'),
    'localized-db'
  );
  assert.equal(
    getSitemapDocumentSlugPlan('locale-es-not-real-db.xml'),
    'not-found'
  );
});

test('sitemap slug normalization and sharding rules match route filenames', () => {
  assert.equal(normalizeSitemapSlug('resources.xml'), 'resources');
  assert.equal(normalizeSitemapSlug('scholarships-0.xml'), 'scholarships-0');
  assert.equal(
    slugMatchesSitemapGroup('resources', 'resources', 'single-or-indexed'),
    true
  );
  assert.equal(
    slugMatchesSitemapGroup('resources-1', 'resources', 'single-or-indexed'),
    true
  );
  assert.equal(
    slugMatchesSitemapGroup('scholarships', 'scholarships', 'always-indexed'),
    false
  );
  assert.equal(
    slugMatchesSitemapGroup('scholarships-0', 'scholarships', 'always-indexed'),
    true
  );
  assert.equal(
    slugMatchesSitemapGroup('essays', 'essays', 'always-indexed'),
    false
  );
  assert.equal(
    slugMatchesSitemapGroup('essays-0', 'essays', 'always-indexed'),
    true
  );
});

test('getSitemapDocumentBySlug no longer calls the all-document builder', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'lib/seo/sitemaps.ts'),
    'utf8'
  );
  const implementation = source.match(
    /export const getSitemapDocumentBySlug[\s\S]*?export function renderSitemapIndexXml/
  );
  assert.ok(implementation, 'expected getSitemapDocumentBySlug implementation');
  assert.equal(implementation![0].includes('buildSitemapDocuments('), false);
});

test('scholarship child sitemaps use direct shard builder with guarded failures', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'lib/seo/sitemaps.ts'),
    'utf8'
  );

  assert.match(source, /buildScholarshipSitemapDocumentBySlug/);
  assert.match(source, /fetchScholarshipSitemapEntriesInRange/);
  assert.match(source, /scholarship sitemap shard \$\{slug\} failed/);
});

test('sitemap index route uses the lightweight index builder', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'app/sitemap.xml/route.ts'),
    'utf8'
  );
  assert.match(source, /buildSitemapIndexDocuments/);
  assert.doesNotMatch(source, /buildSitemapDocuments/);
});
