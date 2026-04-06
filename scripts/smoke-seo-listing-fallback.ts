/**
 * Smoke: same listing + SEO fallback path as POST /api/scholarships (no HTTP).
 *
 *   npx tsx scripts/smoke-seo-listing-fallback.ts
 *
 * Loads .env then .env.local from project root (simple KEY=VAL lines).
 */

import fs from 'fs';
import path from 'path';

import { createClient } from '@supabase/supabase-js';

import type { LongTailSlug } from '../app/scholarships/scholarshipLongTailPresets';
import { moreFiltersToJson } from '../lib/scholarships/scholarshipListApiCodec';
import {
  executeScholarshipListQueryWithSeoFallback,
  fetchGlobalFilterBounds,
  scholarshipListRequestFromParts
} from '../lib/scholarships/scholarshipListServer';
import { getSeoListingEntry } from '../lib/scholarships/seoScholarshipResolve';
import {
  buildListingBaselineMoreFilters,
  buildSeoSlugOnlyMoreFilters,
  type LongTailListingMode
} from '../lib/scholarships/seoScholarshipListing';
import type { Database } from '../types_db';

function loadEnvFiles() {
  const root = path.resolve(__dirname, '..');
  for (const name of ['.env', '.env.local']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const line of text.split(/\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i <= 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}

const PATHS = [
  'first-generation/massachusetts',
  'engineering/massachusetts',
  'hispanic/florida'
] as const;

async function main() {
  loadEnvFiles();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
    process.exit(1);
  }

  const supabase = createClient<Database>(url, key);

  console.log('SEO listing fallback smoke (server path, not browser UI)\n');

  for (const canonicalPath of PATHS) {
    const entry = getSeoListingEntry(canonicalPath);
    if (!entry) {
      console.log(`--- ${canonicalPath} ---\n  ERROR: no manifest entry\n`);
      continue;
    }

    const mode: LongTailListingMode = {
      type: 'manifest',
      canonicalPath,
      entry
    };

    const bounds = await fetchGlobalFilterBounds(supabase);
    const moreFilters = buildListingBaselineMoreFilters(bounds, mode);
    const slugOnlyMf = buildSeoSlugOnlyMoreFilters(bounds, mode);
    const lt = (entry.legacyBaseSlugs ?? []) as LongTailSlug[];

    const req = scholarshipListRequestFromParts({
      page: 1,
      limit: 12,
      sort: 'most_recent',
      tab: 'matches',
      q: '',
      category: null,
      categoryPageSlug: null,
      deadline: 'any',
      state: null,
      ignored: null,
      saved: null,
      started: null,
      submitted: null,
      moreFilters,
      longTailLegacySlugs: lt,
      similarTo: null,
      similarCategorySlug: null,
      listScope: 'catalog'
    });

    const payloadSummary = {
      longTailLegacySlugs: lt,
      moreFilters: moreFiltersToJson(moreFilters),
      slugOnlyMoreFilters: moreFiltersToJson(slugOnlyMf),
      seoListingFallback: true,
      searchParamsSketch:
        'limit=12&scope=catalog&long_tail=' +
        (lt.length ? lt.join(',') : '(empty)')
    };

    const result = await executeScholarshipListQueryWithSeoFallback(
      supabase,
      req,
      {
        countOnly: false,
        includeMeta: false,
        isProSubscriber: false
      },
      {
        enable: true,
        slugOnlyMoreFilters: slugOnlyMf,
        bounds,
        isCategorySeo: false
      }
    );

    const rows = result.scholarships;
    const sf = result.seoFallback;

    console.log(`--- /scholarships/${canonicalPath} ---`);
    console.log('  request (logical):', JSON.stringify(payloadSummary, null, 2));
    console.log('  seoFallback.used:', sf?.used);
    console.log('  seoFallback.tier:', sf?.tier);
    console.log('  scholarships.length:', rows.length);
    console.log('  total:', result.total);
    console.log(
      '  (UI) cards / empty state: verify manually in browser after deploy\n'
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
