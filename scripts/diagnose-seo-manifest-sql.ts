/**
 * SEO manifest × live Supabase: exact count, fallback count, filter flags.
 *
 *   & "${env:ProgramFiles}\nodejs\npx.cmd" tsx scripts/diagnose-seo-manifest-sql.ts
 *
 * Writes: tmp/seo-manifest-diagnosis.json (full rows) + summary to stdout.
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
const OUT_JSON = path.join(ROOT, 'tmp', 'seo-manifest-diagnosis.json');

/** Mirrors scholarshipListServer ELIGIBILITY_TAG_TEXT_OR_ILIKE keys (ilike path, no cs for these). */
const ELIGIBILITY_ILIKE_ONLY = new Set(['first_generation']);

const LEGACY_SLUGS_WITH_ILIKE = new Set<LongTailSlug>([
  'undergraduate',
  'high-school',
  'international-students',
  'engineering',
  'computer-science'
]);

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

function filtersUsedSummary(entry: SeoScholarshipRouteManifestEntry): string {
  const parts: string[] = [];
  const leg = entry.legacyBaseSlugs ?? [];
  if (leg.length) parts.push(`legacy:${leg.join('+')}`);
  const f = entry.filters;
  if (f?.includeEligibility?.length)
    parts.push(`elig:[${f.includeEligibility.join(',')}]`);
  if (f?.includeEducationLevels?.length)
    parts.push(`edu:[${f.includeEducationLevels.join(',')}]`);
  if (f?.includeGpaBuckets?.length)
    parts.push(`gpa:[${f.includeGpaBuckets.join(',')}]`);
  if (f?.includeLocationLabels?.length)
    parts.push(`loc:[${f.includeLocationLabels.join(',')}]`);
  if (f?.includeEasyApply?.length)
    parts.push(`easy:[${f.includeEasyApply.join(',')}]`);
  if (f?.deadlinePreset && f.deadlinePreset !== 'any')
    parts.push(`deadline:${f.deadlinePreset}`);
  if (f?.amountCap != null && Number.isFinite(f.amountCap))
    parts.push(`amountCap:<=${f.amountCap}`);
  if (f?.dataCompletenessVerifiedOnly) parts.push('verifiedOnly');
  const po: string[] = [];
  if (f?.payoutCollege) po.push('payoutCollege');
  if (f?.payoutStudent) po.push('payoutStudent');
  if (f?.payoutNonMonetary) po.push('payoutNonMonetary');
  if (f?.payoutNotStated) po.push('payoutNotStated');
  if (po.length) parts.push(po.join('+'));
  return parts.join(' | ') || '(default bounds only)';
}

function countFilterDimensions(entry: SeoScholarshipRouteManifestEntry): number {
  let n = (entry.legacyBaseSlugs ?? []).length;
  const f = entry.filters;
  if (!f) return n;
  if (f.includeEligibility?.length) n += 1;
  if (f.includeEducationLevels?.length) n += 1;
  if (f.includeGpaBuckets?.length) n += 1;
  if (f.includeLocationLabels?.length) n += 1;
  if (f.includeEasyApply?.length) n += 1;
  if (f.deadlinePreset && f.deadlinePreset !== 'any') n += 1;
  if (f.amountCap != null && Number.isFinite(f.amountCap)) n += 1;
  if (f.dataCompletenessVerifiedOnly) n += 1;
  if (
    f.payoutCollege ||
    f.payoutStudent ||
    f.payoutNonMonetary ||
    f.payoutNotStated
  )
    n += 1;
  return n;
}

function usesEligibilityCs(entry: SeoScholarshipRouteManifestEntry): boolean {
  const tags = entry.filters?.includeEligibility ?? [];
  return tags.some((t) => !ELIGIBILITY_ILIKE_ONLY.has(t));
}

function usesIlike(entry: SeoScholarshipRouteManifestEntry): boolean {
  if ((entry.filters?.includeEligibility ?? []).some((t) => ELIGIBILITY_ILIKE_ONLY.has(t)))
    return true;
  for (const s of entry.legacyBaseSlugs ?? []) {
    if (LEGACY_SLUGS_WITH_ILIKE.has(s as LongTailSlug)) return true;
  }
  return false;
}

function collectUniqueFilterIds(
  routes: SeoScholarshipRouteManifestEntry[]
): {
  eligibility: string[];
  easyApply: string[];
  gpa: string[];
  edu: string[];
  loc: string[];
} {
  const eligibility = new Set<string>();
  const easyApply = new Set<string>();
  const gpa = new Set<string>();
  const edu = new Set<string>();
  const loc = new Set<string>();
  for (const e of routes) {
    for (const x of e.filters?.includeEligibility ?? []) eligibility.add(x);
    for (const x of e.filters?.includeEasyApply ?? []) easyApply.add(x);
    for (const x of e.filters?.includeGpaBuckets ?? []) gpa.add(x);
    for (const x of e.filters?.includeEducationLevels ?? []) edu.add(x);
    for (const x of e.filters?.includeLocationLabels ?? []) loc.add(x);
  }
  return {
    eligibility: [...eligibility].sort(),
    easyApply: [...easyApply].sort(),
    gpa: [...gpa].sort(),
    edu: [...edu].sort(),
    loc: [...loc].sort()
  };
}

async function prefetchTagPresence(
  supabase: ReturnType<typeof createClient<Database>>,
  ids: {
    eligibility: string[];
    easyApply: string[];
    gpa: string[];
    edu: string[];
    loc: string[];
  }
): Promise<{
  eligibility: Record<string, boolean>;
  easyApply: Record<string, boolean>;
  gpa: Record<string, boolean>;
  edu: Record<string, boolean>;
  loc: Record<string, boolean>;
}> {
  const eligibility: Record<string, boolean> = {};
  const easyApply: Record<string, boolean> = {};
  const gpa: Record<string, boolean> = {};
  const edu: Record<string, boolean> = {};
  const loc: Record<string, boolean> = {};

  const qCs = async (col: string, id: string) => {
    const { error, count } = await supabase
      .from('scholarships')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .filter(col, 'cs', JSON.stringify([id]));
    if (error) throw new Error(`${col} ${id}: ${error.message}`);
    return (count ?? 0) > 0;
  };

  for (const id of ids.eligibility) {
    eligibility[id] = await qCs('eligibility_tags', id);
  }
  for (const id of ids.easyApply) {
    easyApply[id] = await qCs('easy_apply_flags', id);
  }
  for (const id of ids.gpa) {
    const { error, count } = await supabase
      .from('scholarships')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('gpa_bucket', id);
    if (error) throw new Error(`gpa ${id}: ${error.message}`);
    gpa[id] = (count ?? 0) > 0;
  }
  for (const id of ids.edu) {
    edu[id] = await qCs('catalog_education_levels', id);
  }
  for (const id of ids.loc) {
    loc[id] = await qCs('location_tags', id);
  }

  return { eligibility, easyApply, gpa, edu, loc };
}

function dbPresenceNote(
  entry: SeoScholarshipRouteManifestEntry,
  presence: Awaited<ReturnType<typeof prefetchTagPresence>>
): string {
  const parts: string[] = [];
  const f = entry.filters;
  for (const id of f?.includeEligibility ?? []) {
    if (ELIGIBILITY_ILIKE_ONLY.has(id)) {
      parts.push(`${id}:text-ilike(not eligibility_tags.cs)`);
    } else {
      parts.push(`${id}:${presence.eligibility[id] ? 'inDB' : 'MISSING'}`);
    }
  }
  for (const id of f?.includeEasyApply ?? []) {
    parts.push(`easy_${id}:${presence.easyApply[id] ? 'inDB' : 'MISSING'}`);
  }
  for (const id of f?.includeGpaBuckets ?? []) {
    parts.push(`gpa_${id}:${presence.gpa[id] ? 'inDB' : 'MISSING'}`);
  }
  for (const id of f?.includeEducationLevels ?? []) {
    parts.push(`edu_${id}:${presence.edu[id] ? 'inDB' : 'MISSING'}`);
  }
  for (const id of f?.includeLocationLabels ?? []) {
    parts.push(`loc_${id}:${presence.loc[id] ? 'inDB' : 'MISSING'}`);
  }
  const leg = entry.legacyBaseSlugs ?? [];
  if (leg.length) parts.push(`legacySQL:${leg.join('+')}(field/ilike mix)`);
  return parts.join('; ') || '—';
}

function statusForCount(n: number): 'OK' | 'WEAK' | 'EMPTY' {
  if (n === 0) return 'EMPTY';
  if (n < 12) return 'WEAK';
  return 'OK';
}

async function diagnoseOne(
  supabase: ReturnType<typeof createClient<Database>>,
  bounds: Awaited<ReturnType<typeof fetchGlobalFilterBounds>>,
  entry: SeoScholarshipRouteManifestEntry
): Promise<{
  url: string;
  count_exact: number;
  count_fallback: number;
  fallback_used: boolean;
  filters_used: string;
  db_presence: string;
  status: 'OK' | 'WEAK' | 'EMPTY' | 'ERROR';
  uses_eligibility_cs: boolean;
  uses_ilike: boolean;
  filter_dims_ge3: boolean;
  query_error?: string;
}> {
  const canonicalPath = entry.canonicalPath;
  const mode: LongTailListingMode = {
    type: 'manifest',
    canonicalPath,
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

  try {
    const exactRes = await executeScholarshipListQuery(supabase, req, {
      countOnly: true,
      includeMeta: false,
      isProSubscriber: false
    });

    const restoreLog = (() => {
      const o = console.log;
      console.log = () => {};
      return () => {
        console.log = o;
      };
    })();
    let fbRes;
    try {
      fbRes = await executeScholarshipListQueryWithSeoFallback(
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
    } finally {
      restoreLog();
    }

    const count_exact = exactRes.total;
    const count_fallback = fbRes.total;
    const fallback_used = Boolean(fbRes.seoFallback?.used);

    return {
      url: `/scholarships/${canonicalPath}`,
      count_exact,
      count_fallback,
      fallback_used,
      filters_used: filtersUsedSummary(entry),
      db_presence: '', // filled later
      status: statusForCount(count_fallback),
      uses_eligibility_cs: usesEligibilityCs(entry),
      uses_ilike: usesIlike(entry),
      filter_dims_ge3: countFilterDimensions(entry) >= 3
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      url: `/scholarships/${canonicalPath}`,
      count_exact: -1,
      count_fallback: -1,
      fallback_used: false,
      filters_used: filtersUsedSummary(entry),
      db_presence: '',
      status: 'ERROR',
      uses_eligibility_cs: usesEligibilityCs(entry),
      uses_ilike: usesIlike(entry),
      filter_dims_ge3: countFilterDimensions(entry) >= 3,
      query_error: msg
    };
  }
}

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

  const manifest = JSON.parse(
    fs.readFileSync(MANIFEST, 'utf8')
  ) as { routes: SeoScholarshipRouteManifestEntry[] };
  const routes = manifest.routes ?? [];

  const supabase = createClient<Database>(url, key);
  const bounds = await fetchGlobalFilterBounds(supabase);

  const uniqueIds = collectUniqueFilterIds(routes);
  // eslint-disable-next-line no-console -- CLI progress
  console.error('Prefetching tag presence in DB…');
  const presence = await prefetchTagPresence(supabase, uniqueIds);

  const rows: Awaited<ReturnType<typeof diagnoseOne>>[] = [];
  let i = 0;
  for (const entry of routes) {
    i += 1;
    if (i % 50 === 0) {
      // eslint-disable-next-line no-console -- CLI progress
      console.error(`  … ${i}/${routes.length}`);
    }
    const row = await diagnoseOne(supabase, bounds, entry);
    row.db_presence = dbPresenceNote(entry, presence);
    rows.push(row);
  }

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        bounds,
        uniqueFilterIds: uniqueIds,
        rows
      },
      null,
      2
    ),
    'utf8'
  );

  const ok = rows.filter((r) => r.status === 'OK').length;
  const weak = rows.filter((r) => r.status === 'WEAK').length;
  const empty = rows.filter((r) => r.status === 'EMPTY').length;
  const errN = rows.filter((r) => r.status === 'ERROR').length;
  const eligCs = rows.filter((r) => r.uses_eligibility_cs).length;
  const ilike = rows.filter((r) => r.uses_ilike).length;
  const dims3 = rows.filter((r) => r.filter_dims_ge3).length;

  const problematic = [...rows].sort((a, b) => {
    const score = (r: (typeof rows)[0]) => {
      if (r.status === 'ERROR') return -1;
      if (r.count_fallback === 0) return 0;
      if (r.count_fallback < 12) return 1;
      return 2;
    };
    const ds = score(a) - score(b);
    if (ds !== 0) return ds;
    return a.count_fallback - b.count_fallback;
  });

  // eslint-disable-next-line no-console -- summary output
  console.log(
    JSON.stringify(
      {
        totalPages: rows.length,
        OK: ok,
        WEAK: weak,
        EMPTY: empty,
        ERROR: errN,
        pagesWithEligibilityCs: eligCs,
        pagesWithIlikePath: ilike,
        pagesWithFilterDimsGte3: dims3,
        top20ProblematicUrls: problematic.slice(0, 20).map((r) => ({
          url: r.url,
          count_exact: r.count_exact,
          count_fallback: r.count_fallback,
          status: r.status
        }))
      },
      null,
      2
    )
  );
  // eslint-disable-next-line no-console -- summary output
  console.error(`Wrote ${OUT_JSON}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
