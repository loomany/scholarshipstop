/**
 * Enqueue clean country SEO pages for Search Console inspection and Google Indexing.
 *
 * Dry run:
 *   dotenv -e .env.local -- npx tsx scripts/enqueue-country-seo-pages.ts
 *
 * Execute:
 *   dotenv -e .env.local -- npx tsx scripts/enqueue-country-seo-pages.ts --execute
 *
 * Optional: --defer keeps Indexing API calls in google_indexing_queue for cron flush.
 */
import { allScholarshipCountrySeoRoutes } from '../app/scholarships/scholarshipCountrySeo';
import {
  submitUrlsForImmediateIndexing,
  type GoogleIndexingContentKind
} from '../lib/seo/googleIndexingQueue';
import { enqueueSeoPageInspectionUrls } from '../lib/seo/seoPageInspectionQueue';
import { getURL } from '../utils/helpers';

function absoluteCountrySeoUrls(): string[] {
  return allScholarshipCountrySeoRoutes().map((route) => getURL(route.href));
}

async function main() {
  const execute = process.argv.includes('--execute');
  const defer = process.argv.includes('--defer');
  const urls = absoluteCountrySeoUrls();

  console.log(`Country SEO pages: ${urls.length}`);
  for (const url of urls) {
    console.log(`${execute ? 'enqueue' : 'dry-run'} ${url}`);
  }

  if (!execute) {
    console.log('\nRe-run with --execute to enqueue these URLs.');
    return;
  }

  await enqueueSeoPageInspectionUrls({
    urls,
    source: 'country-seo-pages:launch:inspection'
  });

  const submission = await submitUrlsForImmediateIndexing({
    urls,
    kind: 'page' satisfies GoogleIndexingContentKind,
    source: 'country-seo-pages:launch',
    immediatePing: !defer
  });

  console.log(JSON.stringify(submission, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
