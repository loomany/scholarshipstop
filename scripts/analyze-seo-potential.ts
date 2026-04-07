/**
 * Programmatic SEO mixer — potential analysis (read-only).
 *
 * Loads Scholarship[] once, builds pair/triple candidates from allowlists,
 * canonicalizes paths via canonicalizeSegments, counts exact matches with
 * countScholarshipsMatchingManifestEntry (same pipeline as live SEO listings).
 *
 * Does not write manifest or content JSON.
 *
 *   npx tsx scripts/analyze-seo-potential.ts --json=data/scholarships.json
 *   npx tsx scripts/analyze-seo-potential.ts --min-grants=1
 *   npx tsx scripts/analyze-seo-potential.ts --verbose
 *
 * Writes publication queue (valid paths only, full URLs) to:
 *   data/seo-pending-queue.json  — JSON array of strings
 * Use --no-save-queue to skip writing the file.
 *
 * Exact-match pipeline (see lib/scholarships/seoScholarshipListing.ts):
 * - requiredSeoTags: AND on scholarship.seoTags ?? scholarship.scholarshipCatalog?.seoTags
 * - state: descriptor.stateCodes vs scholarship.stateCodes (USPS), NOT provider.state
 * - then scholarshipPassesMoreFilters (location uses getScholarshipCatalog(s).locationLabels)
 */

import fs from 'fs';
import path from 'path';

import type { Scholarship } from '../app/scholarships/scholarshipsData';
import { LONG_TAIL_SLUGS } from '../app/scholarships/scholarshipLongTailPresets';
import { buildDynamicSeoManifestEntry } from '../lib/scholarships/seoScholarshipDynamicEntry';
import { countScholarshipsMatchingManifestEntry } from '../lib/scholarships/seoScholarshipListing';
import { getScholarshipCatalog } from '../lib/scholarships/scholarshipCatalog';
import {
  SEO_ROUTE_ELIGIBILITY_SEGMENTS,
  SEO_ROUTE_STATE_SLUG_TO_LABEL
} from '../lib/scholarships/seoTags/routeSegmentMaps';
import { canonicalizeSegments } from '../lib/scholarships/seoScholarshipRouteTokens';
import { fetchActiveScholarshipsForScript } from '../lib/scholarships/supabase';
import { fetchScholarshipsCatalogFromUrl } from './scholarshipsApiCatalog';

const ROOT = path.join(__dirname, '..');
const SEO_PENDING_QUEUE_PATH = path.join(ROOT, 'data', 'seo-pending-queue.json');

function parseMinGrants(): number {
  const arg = process.argv.find((a) => a.startsWith('--min-grants='));
  if (!arg) return 3;
  const n = parseInt(arg.slice('--min-grants='.length), 10);
  return Number.isFinite(n) && n >= 1 ? n : 3;
}

/** URL segments for audience (eligibility) — one slug per eligibility id (drop duplicate `women`). */
const AUDIENCE_SEGMENTS: string[] = Object.keys(SEO_ROUTE_ELIGIBILITY_SEGMENTS).filter(
  (k) => k !== 'women'
);

/** Topic/category: reserved long-tail slugs (legacy preset tokens). */
const TOPIC_SEGMENTS: string[] = [...LONG_TAIL_SLUGS];

/** US state slugs (no nationwide — not a useful mixer facet for “in state”). */
const STATE_SEGMENTS: string[] = Object.keys(SEO_ROUTE_STATE_SLUG_TO_LABEL).filter(
  (s) => s !== 'nationwide'
);

async function loadScholarships(): Promise<Scholarship[]> {
  const jsonArg = process.argv
    .find((a) => a.startsWith('--json='))
    ?.slice('--json='.length);
  if (jsonArg) {
    const p = path.isAbsolute(jsonArg) ? jsonArg : path.join(ROOT, jsonArg);
    const raw = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) throw new Error('expected array');
    return data as Scholarship[];
  }

  const url =
    process.env.SCHOLARSHIPS_JSON_URL ||
    (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '') + '/api/scholarships';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (supabaseUrl && supabaseKey) {
    return fetchActiveScholarshipsForScript();
  }
  if (!url || url.endsWith('undefined/api/scholarships')) {
    console.error(
      'Use --json=path/to/scholarships.json, or Supabase env, or SCHOLARSHIPS_JSON_URL / NEXT_PUBLIC_SITE_URL'
    );
    process.exit(1);
  }
  return fetchScholarshipsCatalogFromUrl(url);
}

function countForSegments(list: Scholarship[], segments: string[]): number | null {
  const canon = canonicalizeSegments(segments);
  if (!canon) return null;
  const entry = buildDynamicSeoManifestEntry(canon.tokens, canon.canonicalPath);
  if (!entry) return null;
  return countScholarshipsMatchingManifestEntry(list, entry);
}

function registerCandidate(
  segments: string[],
  pathToCount: Map<string, number>,
  list: Scholarship[],
  stats: { invalidCanonical: number; noEntry: number }
) {
  const canon = canonicalizeSegments(segments);
  if (!canon) {
    stats.invalidCanonical += 1;
    return;
  }
  const p = canon.canonicalPath;
  if (pathToCount.has(p)) return;
  const entry = buildDynamicSeoManifestEntry(canon.tokens, p);
  if (!entry) {
    stats.noEntry += 1;
    return;
  }
  pathToCount.set(p, countScholarshipsMatchingManifestEntry(list, entry));
}

function printSampleScholarship(s: Scholarship) {
  const cat = getScholarshipCatalog(s);
  const payload = {
    id: s.id,
    title: s.title,
    country: s.country,
    provider: s.provider ?? null,
    providerSlug: s.providerSlug ?? null,
    providerUrl: s.providerUrl ?? null,
    seoTags: s.seoTags ?? null,
    scholarshipCatalog_seoTags: s.scholarshipCatalog?.seoTags ?? null,
    categories: s.categories ?? null,
    categorySlug: s.categorySlug ?? null,
    stateCodes: s.stateCodes ?? null,
    stateTerritoryText: s.stateTerritoryText ?? null,
    locationScope: s.locationScope ?? null,
    derived_locationLabels: cat.locationLabels ?? [],
    requirementTypes: s.requirementTypes ?? null,
    studyLevels: s.studyLevels ?? null,
    fieldOfStudy: s.fieldOfStudy ?? null
  };
  console.log('─── Sample scholarship (first row, diagnostic slice) ───');
  console.log(JSON.stringify(payload, null, 2));
  console.log('');
}

function printFieldCoverage(list: Scholarship[]) {
  let withStateCodes = 0;
  let withSeoTags = 0;
  let withCatalogSeoTags = 0;
  let withCategories = 0;
  let withCategorySlug = 0;
  let withLocationLabels = 0;
  let withProviderName = 0;

  for (const s of list) {
    if ((s.stateCodes ?? []).length > 0) withStateCodes += 1;
    if ((s.seoTags ?? []).filter(Boolean).length > 0) withSeoTags += 1;
    if ((s.scholarshipCatalog?.seoTags ?? []).filter(Boolean).length > 0)
      withCatalogSeoTags += 1;
    if ((s.categories ?? []).filter(Boolean).length > 0) withCategories += 1;
    if (s.categorySlug?.trim()) withCategorySlug += 1;
    const labels = getScholarshipCatalog(s).locationLabels ?? [];
    if (labels.length > 0) withLocationLabels += 1;
    if (s.provider?.trim()) withProviderName += 1;
  }

  const n = list.length;
  console.log('─── Field coverage (exact-match–relevant) ───');
  console.log(
    `stateCodes (non-empty):     ${withStateCodes.toLocaleString()} / ${n} (${pct(withStateCodes, n)})`
  );
  console.log(
    `seoTags (top-level):       ${withSeoTags.toLocaleString()} / ${n} (${pct(withSeoTags, n)})`
  );
  console.log(
    `seoTags (catalog only):    ${withCatalogSeoTags.toLocaleString()} / ${n} (${pct(withCatalogSeoTags, n)})`
  );
  console.log(
    `categories[] (non-empty):  ${withCategories.toLocaleString()} / ${n} (${pct(withCategories, n)})`
  );
  console.log(
    `categorySlug set:          ${withCategorySlug.toLocaleString()} / ${n} (${pct(withCategorySlug, n)})`
  );
  console.log(
    `catalog.locationLabels:    ${withLocationLabels.toLocaleString()} / ${n} (${pct(withLocationLabels, n)})`
  );
  console.log(
    `provider (name string):    ${withProviderName.toLocaleString()} / ${n} (${pct(withProviderName, n)})`
  );
  console.log('');
  console.log(
    'Note: countScholarshipsMatchingManifestEntry requires canonical seoTags AND (for state routes) overlap with scholarship.stateCodes — not provider.state.'
  );
  console.log('');
}

function pct(a: number, b: number): string {
  if (b === 0) return '0%';
  return `${((100 * a) / b).toFixed(1)}%`;
}

function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '').trim() ||
    'https://scholarshiptop.com'
  );
}

/** Valid mixer paths (per current --min-grants) as absolute URLs, sorted. */
function buildPendingQueueUrls(validPaths: { canonicalPath: string }[]): string[] {
  const origin = siteOrigin();
  const urls = validPaths.map((x) => `${origin}/scholarships/${x.canonicalPath}`);
  urls.sort((a, b) => a.localeCompare(b));
  return urls;
}

function writeSeoPendingQueue(urls: string[]) {
  fs.mkdirSync(path.dirname(SEO_PENDING_QUEUE_PATH), { recursive: true });
  fs.writeFileSync(
    SEO_PENDING_QUEUE_PATH,
    `${JSON.stringify(urls, null, 2)}\n`,
    'utf8'
  );
}

function printSingleSegmentSanity(list: Scholarship[]) {
  console.log('─── Single-segment sanity (same counter) ───');
  const samples = [
    ['for-women'],
    ['engineering'],
    ['texas'],
    ['california'],
    ['no-essay']
  ];
  for (const segs of samples) {
    const c = countForSegments(list, segs);
    const path = canonicalizeSegments(segs)?.canonicalPath ?? '(invalid)';
    console.log(
      `  /scholarships/${path}  →  ${c === null ? 'n/a' : c.toLocaleString()} exact`
    );
  }
  console.log('');
}

async function main() {
  const minGrants = parseMinGrants();

  console.log('Loading catalog…');
  const list = await loadScholarships();
  console.log(`Scholarships in memory: ${list.length.toLocaleString()}\n`);

  if (list.length > 0) {
    printSampleScholarship(list[0]!);
    printFieldCoverage(list);
    printSingleSegmentSanity(list);
  }

  const pathToCount = new Map<string, number>();
  const stats = { invalidCanonical: 0, noEntry: 0 };

  console.log(
    `Allowlists — audience: ${AUDIENCE_SEGMENTS.length}, topic: ${TOPIC_SEGMENTS.length}, states: ${STATE_SEGMENTS.length}`
  );

  for (const a of AUDIENCE_SEGMENTS) {
    for (const s of STATE_SEGMENTS) {
      registerCandidate([a, s], pathToCount, list, stats);
    }
  }

  for (const t of TOPIC_SEGMENTS) {
    for (const s of STATE_SEGMENTS) {
      registerCandidate([t, s], pathToCount, list, stats);
    }
  }

  for (const a of AUDIENCE_SEGMENTS) {
    for (const t of TOPIC_SEGMENTS) {
      for (const s of STATE_SEGMENTS) {
        registerCandidate([a, t, s], pathToCount, list, stats);
      }
    }
  }

  const allEvaluated = [...pathToCount.entries()].map(([canonicalPath, count]) => ({
    canonicalPath,
    count
  }));

  const valid = allEvaluated.filter((x) => x.count >= minGrants);
  valid.sort((a, b) => b.count - a.count);

  const saveQueue = !process.argv.includes('--no-save-queue');

  const withAny = allEvaluated.filter((x) => x.count >= 1).sort((a, b) => b.count - a.count);

  let bucket3to5 = 0;
  let bucket6to10 = 0;
  let bucket11plus = 0;
  for (const { count } of valid.filter((x) => x.count >= 3)) {
    if (count <= 5) bucket3to5 += 1;
    else if (count <= 10) bucket6to10 += 1;
    else bucket11plus += 1;
  }

  console.log('─── SEO mixer potential (pair + triple combos only) ───');
  console.log(`Unique canonical paths evaluated: ${pathToCount.size.toLocaleString()}`);
  console.log(`Invalid / unparseable segment combos (canonicalize): ${stats.invalidCanonical}`);
  console.log(`Skipped (no dynamic entry): ${stats.noEntry}`);
  console.log(`Minimum grants threshold: ${minGrants}`);
  console.log('');
  console.log(`Valid pages (exact count ≥ ${minGrants}): ${valid.length.toLocaleString()}`);
  console.log(`Paths with ≥ 1 grant: ${withAny.length.toLocaleString()}`);
  console.log('');

  if (saveQueue) {
    const queueUrls = buildPendingQueueUrls(valid);
    writeSeoPendingQueue(queueUrls);
    console.log('─── Publication queue ───');
    console.log(
      `Wrote ${queueUrls.length.toLocaleString()} URL(s) → ${path.relative(ROOT, SEO_PENDING_QUEUE_PATH)}`
    );
    console.log(`  (origin: ${siteOrigin()}; override with NEXT_PUBLIC_SITE_URL)\n`);
  }

  if (withAny.length > 0) {
    const best = withAny[0]!;
    const origin = siteOrigin();
    console.log('Example URL with ≥ 1 grant (highest count among mixer combos):');
    console.log(`  ${origin}/scholarships/${best.canonicalPath}`);
    console.log(`  (local) /scholarships/${best.canonicalPath}  — ${best.count} exact`);
    console.log('');
    if (withAny.length > 1) {
      console.log('Top 5 mixer paths with ≥ 1 grant:');
      withAny.slice(0, 5).forEach((row, i) => {
        console.log(`  ${i + 1}. ${row.count}  /scholarships/${row.canonicalPath}`);
      });
      console.log('');
    }
  } else {
    console.log('No mixer combo produced ≥ 1 exact match. Single-segment counts above show whether catalog + tags work without state pairing.');
    console.log('');
  }

  if (minGrants >= 3) {
    console.log('Distribution (valid only, count ≥ 3):');
    console.log(`  3–5 scholarships:   ${bucket3to5.toLocaleString()}`);
    console.log(`  6–10 scholarships:  ${bucket6to10.toLocaleString()}`);
    console.log(`  11+ scholarships:     ${bucket11plus.toLocaleString()}`);
    console.log('');
  }

  console.log(`Top 20 by exact count (threshold ≥ ${minGrants}):`);
  valid.slice(0, 20).forEach((row, i) => {
    console.log(
      `  ${String(i + 1).padStart(2)}. ${row.count.toString().padStart(5)}  /scholarships/${row.canonicalPath}`
    );
  });

  if (process.argv.includes('--verbose')) {
    const thin = allEvaluated.filter((x) => x.count > 0 && x.count < minGrants);
    console.log('');
    console.log(`--verbose: paths with 1–${minGrants - 1} matches: ${thin.length}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
