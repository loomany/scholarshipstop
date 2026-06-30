import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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

test('global social fallback and IQ legal canonicals are present', () => {
  assert.equal(existsSync('app/opengraph-image.png'), true);
  assert.equal(existsSync('app/twitter-image.png'), true);

  const legalMetadata = readFileSync('lib/iq/i18n/iqLegalShellCopy.ts', 'utf8');
  assert.match(legalMetadata, /alternates: \{ canonical \}/);
  assert.match(legalMetadata, /images: \['\/logo-preview\.png'\]/);

  for (const file of [
    'app/providers/[id]/page.tsx',
    'app/scholarships/[state]/[university]/page.tsx',
    'app/scholarships/category/[slug]/page.tsx',
    'app/[locale]/scholarships/category/[slug]/page.tsx',
    'app/scholarships/scholarshipSlugLayoutMetadata.ts',
    'app/scholarships/scholarshipHubPageMetadata.ts',
    'lib/trust/trustPageContent.ts',
    'lib/i18n/localizedMetadata.ts'
  ]) {
    assert.match(readFileSync(file, 'utf8'), /DEFAULT_OPEN_GRAPH_IMAGES/);
  }
});

test('public AI guidance and production redirects use canonical apex URLs', () => {
  const llms = readFileSync('public/llms.txt', 'utf8');
  const llmsFull = readFileSync('public/llms-full.txt', 'utf8');
  assert.doesNotMatch(llms, /iq\.scholarshiptop\.com/);
  assert.doesNotMatch(llmsFull, /iq\.scholarshiptop\.com/);
  assert.match(llms, /https:\/\/scholarshiptop\.com\/iq/);

  const nginx = readFileSync(
    'ops/vps/nginx/includes/scholarshiptop-proxy-locations.conf',
    'utf8'
  );
  assert.match(nginx, /location = \/home/);
  assert.match(nginx, /scholarshiptop\.com\/\$is_args\$args/);
});
