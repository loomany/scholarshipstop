import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sitemaps = readFileSync('lib/seo/sitemaps.ts', 'utf8');
const iqPage = readFileSync('app/iq/page.tsx', 'utf8');
const iqDetail = readFileSync('app/iq/[slug]/page.tsx', 'utf8');

test('IQ sitemap and canonical metadata use the reachable apex routes', () => {
  assert.doesNotMatch(sitemaps, /iq\.scholarshiptop\.com/);
  assert.match(sitemaps, /`\$\{base\}\/iq/);
  assert.doesNotMatch(iqPage, /iq\.scholarshiptop\.com/);
  assert.doesNotMatch(iqDetail, /iq\.scholarshiptop\.com/);
});

test('root index does not publish empty localized scholarship detail shards', () => {
  const indexBuilder = sitemaps.match(
    /function buildLocalizedDbSitemapIndexDocuments[\s\S]*?export const buildSitemapIndexDocuments/
  );
  assert.ok(indexBuilder);
  assert.doesNotMatch(indexBuilder![0], /scholarships-detail-db/);
});

test('essay corrective migration calls the installed public unaccent function', () => {
  const migration = readFileSync(
    'supabase/migrations/20260628101000_fix_essay_unaccent_schema.sql',
    'utf8'
  );
  assert.match(migration, /public\.unaccent/);
  assert.doesNotMatch(migration, /extensions\.unaccent/);
});
