/**
 * Stage 4B dry-run: verify translation foundation files and policies (no Supabase writes).
 * Usage: npx tsx scripts/seo/i18n-check-db-translation-foundation.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
let failures = 0;

function fail(message: string) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

function pass(message: string) {
  console.log(`OK: ${message}`);
}

function assertFile(relativePath: string) {
  const full = join(ROOT, relativePath);
  if (!existsSync(full)) {
    fail(`Missing file: ${relativePath}`);
    return '';
  }
  pass(`Found ${relativePath}`);
  return readFileSync(full, 'utf8');
}

function assertIncludes(haystack: string, needle: string, label: string) {
  if (!haystack.includes(needle)) {
    fail(`${label} — expected to include: ${needle}`);
  } else {
    pass(label);
  }
}

function main() {
  console.log('Stage 4B DB translation foundation check\n');

  const migration = assertFile(
    'supabase/migrations/20260521120000_content_translations.sql'
  );
  if (migration) {
    assertIncludes(migration, 'create table if not exists public.content_translations', 'migration creates table');
    assertIncludes(migration, "status = 'published'", 'RLS published-only select');
    assertIncludes(migration, 'scholarship_detail', 'source_type scholarship_detail');
    assertIncludes(migration, 'unique (source_type, source_id, locale)', 'unique constraint');
  }

  const types = assertFile('lib/i18n/contentTranslationsTypes.ts');
  if (types) {
    assertIncludes(types, 'shouldExposeTranslatedRoute', 'types: shouldExposeTranslatedRoute');
    assertIncludes(types, 'shouldIndexTranslatedContent', 'types: shouldIndexTranslatedContent');
    assertIncludes(types, "'es', 'fr'", 'types: locales es/fr only');
  }

  assertFile('lib/i18n/contentTranslationsDbPolicy.ts');
  assertFile('lib/i18n/contentTranslationsServer.ts');
  assertFile('lib/i18n/localizedScholarshipDetailGate.ts');
  assertFile('lib/i18n/__tests__/contentTranslations.test.ts');

  const gate = assertFile('lib/i18n/localizedScholarshipDetailGate.ts');
  if (gate) {
    assertIncludes(gate, 'scholarship_detail', 'gate uses scholarship_detail');
    assertIncludes(gate, 'notFound()', 'gate calls notFound');
  }

  const body = assertFile('app/scholarships/scholarshipsSlugPathPageBody.tsx');
  if (body) {
    assertIncludes(body, 'gateLocalizedScholarshipDetailOrNotFound', 'slug path body uses gate');
  }

  const localePage = assertFile('app/[locale]/scholarships/[[...slugPath]]/page.tsx');
  if (localePage) {
    assertIncludes(localePage, 'gateLocalizedScholarshipDetailOrNotFound', 'locale scholarships metadata uses gate');
  }

  const sitemaps = assertFile('lib/seo/sitemaps.ts');
  if (sitemaps) {
    const hasDbTranslationSitemap =
      sitemaps.includes('getPublishedContentTranslation') ||
      sitemaps.includes('content_translations');
    if (hasDbTranslationSitemap) {
      fail('sitemaps.ts must not yet emit DB translation URLs in Stage 4B');
    } else {
      pass('sitemaps.ts does not emit DB content_translations entries yet');
    }
  }

  const server = assertFile('lib/i18n/contentTranslationsServer.ts');
  if (server) {
    const writes =
      /\.from\([^)]+\)\s*\.insert\(/.test(server) ||
      /\.from\([^)]+\)\s*\.update\(/.test(server) ||
      /\.from\([^)]+\)\s*\.upsert\(/.test(server) ||
      /\.from\([^)]+\)\s*\.delete\(/.test(server);
    if (writes) {
      fail('contentTranslationsServer must not perform Supabase writes');
    } else {
      pass('contentTranslationsServer has no write operations');
    }
  }

  const middleware = assertFile('middleware.ts');
  if (middleware) {
    if (middleware.includes("'/en'") || middleware.includes('"/en"')) {
      pass('middleware references /en handling (404 expected in app)');
    }
  }

  console.log(`\n${failures === 0 ? 'PASS' : `FAIL (${failures} checks)`} — Stage 4B foundation dry-run`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
