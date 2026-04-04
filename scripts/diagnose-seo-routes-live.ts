/**
 * Full SEO manifest audit vs live Supabase (same queries as listing + SEO fallback).
 * Audit only — does not change app code.
 *
 *   npx tsx scripts/diagnose-seo-routes-live.ts
 *
 * Env (optional):
 *   MAX_ROUTES=100     — limit for smoke tests (omit = entire manifest)
 *   TOO_BROAD_MIN=1000 — exact=0 && fallback>this → TOO_BROAD (align with layout noindex)
 */

import fs from 'fs';
import path from 'path';

import { createClient } from '@supabase/supabase-js';

import type { LongTailSlug } from '../app/scholarships/scholarshipLongTailPresets';
import type { SeoScholarshipRouteManifestEntry } from '../lib/scholarships/seoScholarshipManifest';
import {
  executeScholarshipListQuery,
  executeScholarshipListQueryWithSeoFallback,
  fetchGlobalFilterBounds,
  scholarshipListRequestFromParts
} from '../lib/scholarships/scholarshipListServer';
import {
  buildListingBaselineMoreFilters,
  buildSeoSlugOnlyMoreFilters,
  type LongTailListingMode
} from '../lib/scholarships/seoScholarshipListing';
import type { Database } from '../types_db';

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'data', 'seo-scholarship-routes.json');
const REPORT_JSON = path.join(ROOT, 'tmp', 'seo-manifest-audit-report.json');

type RowStatus = 'GOOD' | 'THIN' | 'EMPTY' | 'TOO_BROAD' | 'ERROR';

type AuditRow = {
  route: string;
  exact_count: number;
  fallback_count: number;
  status: RowStatus;
  error?: string;
};

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

function classifyStatus(
  exact: number,
  fallback: number,
  tooBroadMin: number
): Exclude<RowStatus, 'ERROR'> {
  if (fallback === 0) return 'EMPTY';
  if (exact === 0 && fallback > tooBroadMin) return 'TOO_BROAD';
  if (fallback < 12) return 'THIN';
  return 'GOOD';
}

/** Lower = more problematic for sorting top-N. */
function problemSortKey(r: AuditRow): [number, number] {
  switch (r.status) {
    case 'ERROR':
      return [0, 0];
    case 'EMPTY':
      return [1, 0];
    case 'THIN':
      return [2, r.fallback_count];
    case 'TOO_BROAD':
      return [3, -r.fallback_count];
    case 'GOOD':
    default:
      return [9, 0];
  }
}

async function main() {
  loadEnvFiles();

  const origLog = console.log.bind(console);
  console.log = (...args: unknown[]) => {
    if (args[0] === 'FALLBACK CHECK') return;
    origLog(...args);
  };

  const tooBroadMin = Math.max(
    1,
    Number.parseInt(process.env.TOO_BROAD_MIN ?? '1000', 10) || 1000
  );

  try {
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

    const maxEnv = process.env.MAX_ROUTES?.trim();
    const manifest = JSON.parse(
      fs.readFileSync(MANIFEST, 'utf8')
    ) as { routes: SeoScholarshipRouteManifestEntry[] };
    let routes = manifest.routes ?? [];
    if (maxEnv) {
      const n = Number.parseInt(maxEnv, 10);
      if (Number.isFinite(n) && n > 0) routes = routes.slice(0, n);
    }

    const supabase = createClient<Database>(url, key);
    const bounds = await fetchGlobalFilterBounds(supabase);

    const rows: AuditRow[] = [];
    let good = 0;
    let thin = 0;
    let empty = 0;
    let tooBroad = 0;
    let errors = 0;

    for (const entry of routes) {
      const slug = entry.canonicalPath;
      const route = `/scholarships/${slug}`;
      const mode: LongTailListingMode = {
        type: 'manifest',
        canonicalPath: slug,
        entry
      };
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

      let exact_count = 0;
      let fallback_count = 0;
      let status: RowStatus;

      try {
        const exactRes = await executeScholarshipListQuery(supabase, req, {
          countOnly: true,
          includeMeta: false,
          isProSubscriber: false
        });
        exact_count = exactRes.total;

        const fbRes = await executeScholarshipListQueryWithSeoFallback(
          supabase,
          req,
          {
            countOnly: true,
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
        fallback_count = fbRes.total;
        status = classifyStatus(exact_count, fallback_count, tooBroadMin);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        status = 'ERROR';
        rows.push({
          route,
          exact_count: -1,
          fallback_count: -1,
          status,
          error: msg
        });
        errors += 1;
        console.log(
          `${route}\texact_count:\t(error)\tfallback_count:\t(error)\tstatus:\tERROR\t${msg}`
        );
        continue;
      }

      rows.push({ route, exact_count, fallback_count, status });
      if (status === 'GOOD') good += 1;
      else if (status === 'THIN') thin += 1;
      else if (status === 'EMPTY') empty += 1;
      else if (status === 'TOO_BROAD') tooBroad += 1;

      console.log(
        `${route}\texact_count:\t${exact_count}\tfallback_count:\t${fallback_count}\tstatus:\t${status}`
      );
    }

    const problematic = [...rows]
      .filter((r) => r.status !== 'GOOD')
      .sort((a, b) => {
        const ka = problemSortKey(a);
        const kb = problemSortKey(b);
        if (ka[0] !== kb[0]) return ka[0] - kb[0];
        return ka[1] - kb[1];
      });
    const top30 = problematic.slice(0, 30).map((r) => ({
      route: r.route,
      exact_count: r.exact_count,
      fallback_count: r.fallback_count,
      status: r.status,
      ...(r.error ? { error: r.error } : {})
    }));

    console.log('');
    console.log('=== SUMMARY ===');
    console.log(`total_seo_pages: ${routes.length}`);
    console.log(`GOOD: ${good}`);
    console.log(`THIN: ${thin}`);
    console.log(`EMPTY: ${empty}`);
    console.log(`TOO_BROAD: ${tooBroad}`);
    if (errors > 0) console.log(`ERROR: ${errors}`);
    console.log(`(TOO_BROAD_MIN fallback threshold: ${tooBroadMin}, exact must be 0)`);
    console.log('');
    console.log('=== TOP 30 problematic routes ===');
    for (const r of top30) {
      console.log(
        `${r.route}\t${r.status}\texact=${r.exact_count}\tfallback=${r.fallback_count}` +
          ('error' in r && r.error ? `\t${r.error}` : '')
      );
    }

    fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
    fs.writeFileSync(
      REPORT_JSON,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          tooBroadMin,
          bounds,
          summary: {
            total: routes.length,
            GOOD: good,
            THIN: thin,
            EMPTY: empty,
            TOO_BROAD: tooBroad,
            ERROR: errors
          },
          top30Problematic: top30,
          rows
        },
        null,
        2
      ),
      'utf8'
    );
    console.log('');
    console.log(`Full report: ${REPORT_JSON}`);
  } finally {
    console.log = origLog;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
