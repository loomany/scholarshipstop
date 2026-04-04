/**
 * Manifest rows: set `indexable: false` when live listing is exact=0 and SEO fallback
 * total exceeds `SEO_BROAD_FALLBACK_NOINDEX_MIN` (same rule as layout metadata).
 *
 *   npx tsx scripts/patch-manifest-broad-noindex.ts
 *   npx tsx scripts/patch-manifest-broad-noindex.ts --write
 *
 * Skips rows with `manualLockedIndexable: true`. Respects existing `indexable: false`.
 */

import fs from 'fs';
import path from 'path';

import { createClient } from '@supabase/supabase-js';

import type { LongTailSlug } from '../app/scholarships/scholarshipLongTailPresets';
import type { SeoScholarshipRoutesManifest } from '../lib/scholarships/seoScholarshipManifest';
import {
  SEO_BROAD_FALLBACK_NOINDEX_MIN,
  seoBroadFallbackNoindexFromListResult
} from '../lib/scholarships/seoListingBroadNoindex';
import {
  executeScholarshipListQueryWithSeoFallback,
  fetchGlobalFilterBounds,
  scholarshipListRequestFromParts
} from '../lib/scholarships/scholarshipListServer';
import {
  buildMoreFiltersForManifestEntry,
  buildSeoSlugOnlyMoreFilters,
  requiredSeoTagsForListingPath,
  type LongTailListingMode
} from '../lib/scholarships/seoScholarshipListing';
import type { Database } from '../types_db';

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'data', 'seo-scholarship-routes.json');

function loadEnvFiles() {
  for (const name of ['.env', '.env.local']) {
    const p = path.join(ROOT, name);
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

function manifestListingRequest(
  bounds: Awaited<ReturnType<typeof fetchGlobalFilterBounds>>,
  entry: SeoScholarshipRoutesManifest['routes'][number]
) {
  const mode: LongTailListingMode = {
    type: 'manifest',
    canonicalPath: entry.canonicalPath,
    entry
  };
  const mf = buildMoreFiltersForManifestEntry(bounds, entry);
  return {
    req: scholarshipListRequestFromParts({
      page: 1,
      limit: 1,
      sort: 'most_recent',
      tab: 'matches',
      q: '',
      category: null,
      categoryPageSlug: null,
      catalogSubjectCategoryId: null,
      deadline: 'any',
      state: null,
      ignored: null,
      saved: null,
      started: null,
      submitted: null,
      moreFilters: mf,
      longTailLegacySlugs: (entry.legacyBaseSlugs ?? []) as LongTailSlug[],
      similarTo: null,
      similarCategorySlug: null,
      listScope: 'catalog',
      requiredSeoTags: requiredSeoTagsForListingPath(entry.canonicalPath)
    }),
    slugOnly: buildSeoSlugOnlyMoreFilters(bounds, mode)
  };
}

async function main() {
  loadEnvFiles();
  const write = process.argv.includes('--write');

  const origLog = console.log.bind(console);
  console.log = (...args: unknown[]) => {
    if (args[0] === 'FALLBACK CHECK') return;
    origLog(...args);
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.log = origLog;
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
    process.exit(1);
  }

  const raw = fs.readFileSync(MANIFEST, 'utf8');
  const manifest = JSON.parse(raw) as SeoScholarshipRoutesManifest;

  const supabase = createClient<Database>(url, key);
  const bounds = await fetchGlobalFilterBounds(supabase);

  const toPatch: { path: string; total: number; exactTotal: number }[] = [];

  for (const entry of manifest.routes) {
    if (entry.manualLockedIndexable === true) continue;
    if (entry.indexable === false) continue;

    try {
      const { req, slugOnly } = manifestListingRequest(bounds, entry);
      const r = await executeScholarshipListQueryWithSeoFallback(
        supabase,
        req,
        {
          countOnly: true,
          includeMeta: false,
          isProSubscriber: true
        },
        {
          enable: true,
          slugOnlyMoreFilters: slugOnly,
          bounds,
          isCategorySeo: false
        }
      );
      if (!seoBroadFallbackNoindexFromListResult(r)) continue;
      toPatch.push({
        path: entry.canonicalPath,
        total: r.total,
        exactTotal: r.seoFallback?.exactTotal ?? -1
      });
      if (write) entry.indexable = false;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      origLog(`ERROR\t${entry.canonicalPath}\t${msg}`);
    }
  }

  console.log = origLog;

  origLog(
    `Broad fallback noindex threshold: exactTotal===0 && total>${SEO_BROAD_FALLBACK_NOINDEX_MIN}`
  );
  origLog(`Routes to mark indexable=false: ${toPatch.length}`);
  for (const row of toPatch) {
    origLog(
      `  ${row.path}\tfallback_total=${row.total}\texactTotal=${row.exactTotal}`
    );
  }

  if (write && toPatch.length > 0) {
    fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    origLog(`Wrote ${MANIFEST}`);
  } else if (!write && toPatch.length > 0) {
    origLog('Dry-run only. Pass --write to update seo-scholarship-routes.json');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
