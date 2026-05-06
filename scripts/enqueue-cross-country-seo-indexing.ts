/**
 * Enqueue cross-country SEO pages (sitemap-eligible manifest rows) for Google Indexing + optional immediate ping.
 *
 * Dry run:
 *   npm run seo:enqueue-cross-country-indexing
 *
 * Print URLs only:
 *   npm run seo:enqueue-cross-country-indexing -- --print
 *
 * Top ads dry-run:
 *   npm run seo:enqueue-cross-country-indexing -- --top-ads
 *
 * Execute (requires Supabase service role + Google indexing credentials):
 *   npm run seo:enqueue-cross-country-indexing -- --execute
 *
 * Queue only, ping via cron flush later:
 *   npm run seo:enqueue-cross-country-indexing -- --execute --defer
 *
 * FIFO front (after enqueue, backdate added_at for these URLs only — flush orders ASC):
 *   npm run seo:enqueue-cross-country-indexing -- --execute --defer --front
 */
import {
  listCrossCountrySitemapEntries,
  type CrossCountryManifestEntry
} from '@/lib/scholarships/seoCrossCountryManifest';
import {
  prioritizeGoogleIndexingQueueUrls,
  submitUrlsForImmediateIndexing,
  type GoogleIndexingContentKind
} from '@/lib/seo/googleIndexingQueue';
import { getURL } from '@/utils/helpers';

const SOURCE = 'cross-country-sitemap' as const;
const INDEXING_SOURCE = 'cross-country-seo:priority' as const;
const INDEXING_SOURCE_FRONT = 'cross-country-seo:priority-front' as const;
const PRIORITY_HOSTS = new Set(['US', 'CA', 'GB', 'AU']);

/** Expected outside the 28 indexable cross-country URLs (policy); script fails if present. */
function assertExcludedPairsAbsent(entries: CrossCountryManifestEntry[]): void {
  const checks: Array<{ applicantSlug: string; hostSlug: string; label: string }> = [
    { applicantSlug: 'ukraine', hostSlug: 'germany', label: 'Ukraine→Germany' },
    {
      applicantSlug: 'united-states',
      hostSlug: 'congo-kinshasa',
      label: 'US→Congo-Kinshasa'
    }
  ];
  for (const c of checks) {
    const hit = entries.find(
      (e) => e.applicantSlug === c.applicantSlug && e.hostSlug === c.hostSlug
    );
    if (hit) {
      throw new Error(
        `Policy check failed: ${c.label} must not be in indexable set (found ${hit.canonicalPath})`
      );
    }
  }
}

function parseLimit(argv: string[]): number | undefined {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const eq = a.match(/^--limit=(\d+)$/);
    if (eq) return Math.max(0, parseInt(eq[1]!, 10));
    if (a === '--limit' && argv[i + 1]) {
      const n = parseInt(argv[i + 1]!, 10);
      if (Number.isFinite(n)) return Math.max(0, n);
    }
  }
  return undefined;
}

/** Priority: ads → host US/CA/GB/AU → non-domestic → count desc → non-DE host before DE → domestic last */
function compareCrossCountryPriority(
  a: CrossCountryManifestEntry,
  b: CrossCountryManifestEntry
): number {
  const key = (e: CrossCountryManifestEntry) =>
    [
      e.allowedForAds ? 0 : 1,
      PRIORITY_HOSTS.has(e.hostCode) ? 0 : 1,
      e.applicantCode !== e.hostCode ? 0 : 1,
      -e.totalCountSnapshot,
      e.hostCode === 'DE' ? 1 : 0,
      e.applicantCode === e.hostCode ? 1 : 0,
      e.href
    ] as const;

  const ka = key(a);
  const kb = key(b);
  for (let i = 0; i < ka.length; i++) {
    const va = ka[i]!;
    const vb = kb[i]!;
    if (va < vb) return -1;
    if (va > vb) return 1;
  }
  return 0;
}

function selectEntries(options: {
  topAds: boolean;
  limit?: number;
}): CrossCountryManifestEntry[] {
  let rows = listCrossCountrySitemapEntries();
  if (options.topAds) {
    rows = rows.filter((e) => e.allowedForAds === true);
  }
  rows = [...rows].sort(compareCrossCountryPriority);
  if (options.limit !== undefined && options.limit >= 0) {
    rows = rows.slice(0, options.limit);
  }
  return rows;
}

function absoluteUrls(entries: CrossCountryManifestEntry[]): string[] {
  return entries.map((e) => getURL(e.href));
}

async function main() {
  const argv = process.argv.slice(2);
  const execute = argv.includes('--execute');
  const defer = argv.includes('--defer');
  const front = argv.includes('--front');
  const printOnly = argv.includes('--print');
  const topAds = argv.includes('--top-ads');
  const limit = parseLimit(argv);

  if (front && topAds) {
    console.error(
      '--front applies to the full cross-country indexable set only; omit --top-ads.'
    );
    process.exit(1);
  }
  if (front && limit !== undefined) {
    console.error('--front targets the full sitemap-eligible set; omit --limit.');
    process.exit(1);
  }
  if (front && execute && !defer) {
    console.error(
      '--front requires --defer (queue only, no immediate ping). Example: --execute --defer --front'
    );
    process.exit(1);
  }

  const entries = selectEntries({ topAds, limit });
  if (!topAds && limit === undefined) {
    assertExcludedPairsAbsent(entries);
  }
  const urls = absoluteUrls(entries);

  if (printOnly) {
    for (const u of urls) {
      console.log(u);
    }
    return;
  }

  console.log(
    `Cross-country indexing (${topAds ? 'top-ads only' : 'full sitemap set'}): ${entries.length} URL(s)\n`
  );

  console.log(
    '| rank | URL | applicant | host | count | status | allowedForAds | source |'
  );
  console.log(
    '| ---: | --- | --- | --- | ---: | --- | :--- | --- |'
  );
  entries.forEach((e, i) => {
    const rank = i + 1;
    const url = getURL(e.href);
    console.log(
      `| ${rank} | ${url} | ${e.applicantCode} | ${e.hostCode} | ${e.totalCountSnapshot} | ${e.status} | ${e.allowedForAds} | ${SOURCE} |`
    );
  });

  if (!execute) {
    console.log('\nRe-run with --execute to enqueue + optional immediate ping (needs env).');
    if (front) {
      console.log(
        'With --execute --defer --front: enqueue deferred, then backdate added_at (~365d) + lane=queue + source=cross-country-seo:priority-front for FIFO front.'
      );
    }
    return;
  }

  const immediatePing = !defer && !front;

  const submission = await submitUrlsForImmediateIndexing({
    urls,
    kind: 'page' satisfies GoogleIndexingContentKind,
    source: INDEXING_SOURCE,
    immediatePing
  });

  console.log(JSON.stringify(submission, null, 2));

  if (front) {
    const prio = await prioritizeGoogleIndexingQueueUrls({
      urls,
      source: INDEXING_SOURCE_FRONT
    });
    console.log(JSON.stringify({ crossCountryFifoFront: prio }, null, 2));
    if (!prio.ok) {
      throw new Error(prio.error);
    }
    if (prio.updated !== entries.length) {
      throw new Error(
        `FIFO front update: expected ${entries.length} rows, updated ${prio.updated}`
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
