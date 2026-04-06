/**
 * Full SEO pages audit (manifest + legacy long-tail not shadowed by manifest + L1/L2 category pages).
 * Matches listing/metadata policy: buildMoreFiltersForManifestEntry, requiredSeoTags, isProSubscriber:true.
 *
 *   npx tsx scripts/seo-full-poststeps-audit.ts --full
 *   npx tsx scripts/seo-full-poststeps-audit.ts --compare tmp/seo-full-poststeps-audit-report.json
 *
 * Before/after: сохраните JSON текущего прогона, внесите изменения, затем снова запустите
 * с `--compare` на сохранённый файл. Сравнение с `diagnose-seo-routes-live` даст сдвиги,
 * т.к. там другие фильтры (baseline vs manifest entry) и isProSubscriber:false.
 *
 * Env: MAX_ROUTES=N (cap manifest rows for smoke; ignored when --full), TOO_BROAD_MIN (default 1000)
 *
 * Writes: tmp/seo-full-poststeps-audit-report.json
 */

import fs from 'fs';
import path from 'path';

import { createClient } from '@supabase/supabase-js';

import { SCHOLARSHIP_CATEGORY_ORDER } from '../app/scholarships/scholarshipCategories';
import {
  buildLongTailMoreFiltersState,
  getLongTailSitemapSlugs,
  type LongTailSlug
} from '../app/scholarships/scholarshipLongTailPresets';
import { defaultMoreFiltersFromBounds } from '../app/scholarships/moreFilters';
import {
  SEO_BROAD_FALLBACK_NOINDEX_MIN,
  seoBroadFallbackNoindexFromListResult
} from '../lib/scholarships/seoListingBroadNoindex';
import {
  SEO_MIN_INDEXABLE_LIST_COUNT
} from '../lib/scholarships/seoScholarshipFallback';
import type { SeoScholarshipRouteManifestEntry } from '../lib/scholarships/seoScholarshipManifest';
import type { SeoRouteQualityBucket } from '../lib/scholarships/seoScholarshipManifest';
import {
  executeScholarshipListQuery,
  executeScholarshipListQueryWithSeoFallback,
  fetchGlobalFilterBounds,
  resolveCatalogSubjectCategoryForPageSlug,
  scholarshipListRequestFromParts
} from '../lib/scholarships/scholarshipListServer';
import {
  buildManifestEntrySeoExactDescriptor,
  buildMoreFiltersForManifestEntry,
  buildSeoSlugOnlyMoreFilters,
  requiredSeoTagsForListingPath,
  type LongTailListingMode
} from '../lib/scholarships/seoScholarshipListing';
import { evaluateSeoRouteQuality } from '../lib/scholarships/seoRouteQuality';
import type { Database } from '../types_db';

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'data', 'seo-scholarship-routes.json');
const OUT_REPORT = path.join(ROOT, 'tmp', 'seo-full-poststeps-audit-report.json');

type RowStatus = SeoRouteQualityBucket;

type PageKind =
  | 'manifest'
  | 'legacy_long_tail'
  | 'category_l1'
  | 'category_l2';

type AuditRow = {
  route: string;
  page_kind: PageKind;
  exact_count: number;
  rendered_count: number;
  fallback_count: number;
  final_rendered_count: number;
  fallback_used: boolean;
  /** From SEO fallback meta (exact filter total before relax). */
  seo_exact_total: number | null;
  selectivity_ratio: number;
  overlap_score: number;
  facet_penalty: number;
  intent_score: number;
  final_quality_score: number;
  status: RowStatus;
  noindex_now: boolean;
  canonical_target: string | null;
  reason_codes: string[];
  manifest_indexable_false?: boolean;
  uses_scholarship_categories_join?: boolean;
  error?: string;
};

type TopGoodCompareRow = {
  route: string;
  manifest_filters: {
    required_seo_tags: string[];
    state_codes: string[];
    location_slugs: string[];
    include_location_labels: string[];
    unmapped_segments: string[];
  };
  live_filters: {
    required_seo_tags: string[];
    state_codes: string[];
  };
  manifest_exact_count: number;
  live_exact_count: number;
  diff: number;
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

function problemSortKey(r: AuditRow): [number, number] {
  switch (r.status) {
    case 'ERROR':
      return [0, 0];
    case 'EMPTY':
      return [1, 0];
    case 'THIN':
      return [2, r.fallback_count];
    case 'SUPPORTING':
      return [3, r.rendered_count];
    case 'TOO_BROAD':
      return [4, -r.fallback_count];
    case 'GOOD':
    default:
      return [9, 0];
  }
}

function computeNoindexNow(args: {
  pageKind: PageKind;
  manifestEntry?: SeoScholarshipRouteManifestEntry | null;
  thinListing: boolean;
  broadNoindex: boolean;
}): boolean {
  if (
    args.pageKind === 'manifest' &&
    args.manifestEntry?.indexable === false
  ) {
    return true;
  }
  return args.thinListing || args.broadNoindex;
}

type BaselineRow = { route: string; status?: string };

function tallyFromStatuses(rows: Iterable<{ status?: string }>) {
  const out = {
    GOOD: 0,
    THIN: 0,
    EMPTY: 0,
    TOO_BROAD: 0,
    ERROR: 0,
    _: 0
  };
  for (const r of rows) {
    const s = r.status;
    if (s === 'GOOD') out.GOOD += 1;
    else if (s === 'THIN') out.THIN += 1;
    else if (s === 'EMPTY') out.EMPTY += 1;
    else if (s === 'TOO_BROAD') out.TOO_BROAD += 1;
    else if (s === 'ERROR') out.ERROR += 1;
    else out._ += 1;
  }
  return out;
}

function loadBaseline(pathArg: string | null): Map<string, BaselineRow> | null {
  if (!pathArg) return null;
  const p = path.isAbsolute(pathArg) ? pathArg : path.join(ROOT, pathArg);
  if (!fs.existsSync(p)) {
    console.warn(`[compare] Baseline file not found: ${p}`);
    return null;
  }
  const j = JSON.parse(fs.readFileSync(p, 'utf8')) as {
    rows?: BaselineRow[];
  };
  const rows = j.rows ?? [];
  const m = new Map<string, BaselineRow>();
  for (const r of rows) {
    if (r.route) m.set(r.route, r);
  }
  return m;
}

const LIST_LIMIT = 12;

async function main() {
  loadEnvFiles();

  const compareIdx = process.argv.indexOf('--compare');
  const baselinePath =
    compareIdx >= 0 ? (process.argv[compareIdx + 1] ?? null) : null;
  const baseline = loadBaseline(baselinePath);

  const origLog = console.log.bind(console);
  console.log = (...args: unknown[]) => {
    if (args[0] === 'FALLBACK CHECK') return;
    origLog(...args);
  };

  const tooBroadMin = Math.max(
    1,
    Number.parseInt(process.env.TOO_BROAD_MIN ?? '1000', 10) || 1000
  );

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

  const fullAudit = process.argv.includes('--full');
  const maxEnv = fullAudit ? '' : process.env.MAX_ROUTES?.trim();
  const manifestFile = JSON.parse(
    fs.readFileSync(MANIFEST, 'utf8')
  ) as { routes: SeoScholarshipRouteManifestEntry[] };
  let manifestRoutes = manifestFile.routes ?? [];
  if (maxEnv) {
    const n = Number.parseInt(maxEnv, 10);
    if (Number.isFinite(n) && n > 0) manifestRoutes = manifestRoutes.slice(0, n);
  }

  const manifestPathSet = new Set(
    manifestRoutes.map((r) => r.canonicalPath.trim())
  );

  const supabase = createClient<Database>(url, key);
  const bounds = await fetchGlobalFilterBounds(supabase);
  const totalCatalogReq = scholarshipListRequestFromParts({
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
    moreFilters: defaultMoreFiltersFromBounds(bounds),
    longTailLegacySlugs: [],
    similarTo: null,
    similarCategorySlug: null,
    listScope: 'catalog',
    requiredSeoTags: []
  });
  const totalCatalogRes = await executeScholarshipListQuery(supabase, totalCatalogReq, {
    countOnly: true,
    includeMeta: false,
    isProSubscriber: true
  });
  const totalCatalog = Math.max(1, totalCatalogRes.total);

  const { data: l2Rows, error: l2Err } = await supabase
    .from('categories')
    .select('slug')
    .eq('level', 2)
    .eq('is_active', true);
  if (l2Err) throw new Error(l2Err.message);
  const l2Slugs = (l2Rows ?? [])
    .map((r) => r.slug.trim())
    .filter(Boolean)
    .sort();

  type Job = {
    page_kind: PageKind;
    route: string;
    manifestEntry?: SeoScholarshipRouteManifestEntry;
    /** For category jobs */
    categorySlug?: string;
    legacySlug?: LongTailSlug;
  };

  const jobs: Job[] = [];

  for (const entry of manifestRoutes) {
    jobs.push({
      page_kind: 'manifest',
      route: `/scholarships/${entry.canonicalPath}`,
      manifestEntry: entry
    });
  }

  for (const slug of getLongTailSitemapSlugs()) {
    if (manifestPathSet.has(slug)) continue;
    jobs.push({
      page_kind: 'legacy_long_tail',
      route: `/scholarships/${slug}`,
      legacySlug: slug
    });
  }

  for (const id of SCHOLARSHIP_CATEGORY_ORDER) {
    jobs.push({
      page_kind: 'category_l1',
      route: `/scholarships/category/${id}`,
      categorySlug: id
    });
  }

  for (const slug of l2Slugs) {
    jobs.push({
      page_kind: 'category_l2',
      route: `/scholarships/category/${slug}`,
      categorySlug: slug
    });
  }

  const rows: AuditRow[] = [];
  let l2WithJoin = 0;
  let jobIndex = 0;

  function logInterimCheckpoint(label: string) {
    const t = tallyFromStatuses(rows);
    origLog(
      `[INTERIM ${label}] checked=${rows.length}/${jobs.length} | GOOD ${t.GOOD} | THIN ${t.THIN} | EMPTY ${t.EMPTY} | TOO_BROAD ${t.TOO_BROAD} | ERROR ${t.ERROR}`
    );
  }

  for (const job of jobs) {
    jobIndex += 1;
    let req: ReturnType<typeof scholarshipListRequestFromParts>;
    let slugOnly: ReturnType<typeof buildSeoSlugOnlyMoreFilters> | null = null;
    let isCategorySeo = false;
    /** L2 category: resolved join flag (set when building category requests). */
    let categoryUsesScholarshipJoin: boolean | undefined;

    if (job.page_kind === 'manifest' && job.manifestEntry) {
      const entry = job.manifestEntry;
      const mode: LongTailListingMode = {
        type: 'manifest',
        canonicalPath: entry.canonicalPath,
        entry
      };
      const mf = buildMoreFiltersForManifestEntry(bounds, entry);
      slugOnly = buildSeoSlugOnlyMoreFilters(bounds, mode);
      req = scholarshipListRequestFromParts({
        page: 1,
        limit: LIST_LIMIT,
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
      });
    } else if (job.page_kind === 'legacy_long_tail' && job.legacySlug) {
      const slug = job.legacySlug;
      const mf = buildLongTailMoreFiltersState(bounds, slug);
      const mode: LongTailListingMode = { type: 'legacy', slug };
      slugOnly = buildSeoSlugOnlyMoreFilters(bounds, mode);
      req = scholarshipListRequestFromParts({
        page: 1,
        limit: LIST_LIMIT,
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
        longTailLegacySlugs: [slug],
        similarTo: null,
        similarCategorySlug: null,
        listScope: 'catalog',
        requiredSeoTags: requiredSeoTagsForListingPath(slug)
      });
    } else if (
      (job.page_kind === 'category_l1' || job.page_kind === 'category_l2') &&
      job.categorySlug
    ) {
      isCategorySeo = true;
      const resolved = await resolveCatalogSubjectCategoryForPageSlug(
        supabase,
        job.categorySlug
      );
      if (job.page_kind === 'category_l2') {
        categoryUsesScholarshipJoin = Boolean(resolved.catalogSubjectCategoryId);
        if (resolved.catalogSubjectCategoryId) l2WithJoin += 1;
      }
      const mf = defaultMoreFiltersFromBounds(bounds);
      req = scholarshipListRequestFromParts({
        page: 1,
        limit: LIST_LIMIT,
        sort: 'most_recent',
        tab: 'matches',
        q: '',
        category: null,
        categoryPageSlug: resolved.legacyCategoryPageSlug,
        catalogSubjectCategoryId: resolved.catalogSubjectCategoryId,
        deadline: 'any',
        state: null,
        ignored: null,
        saved: null,
        started: null,
        submitted: null,
        moreFilters: mf,
        longTailLegacySlugs: [],
        similarTo: null,
        similarCategorySlug: null,
        listScope: 'catalog'
      });
    } else {
      continue;
    }

    const listCtx = {
      enable: true,
      slugOnlyMoreFilters: slugOnly,
      bounds,
      isCategorySeo
    };

    let exact_count = 0;
    let rendered_count = 0;
    let fallback_count = 0;
    let final_rendered_count = 0;
    let fallback_used = false;
    let seo_exact_total: number | null = null;
    let thinListing = false;
    let status: RowStatus;
    let fbResForMeta: Awaited<
      ReturnType<typeof executeScholarshipListQueryWithSeoFallback>
    > | null = null;

    try {
      const exactRes = await executeScholarshipListQuery(supabase, req, {
        countOnly: true,
        includeMeta: false,
        isProSubscriber: true
      });
      exact_count = exactRes.total;

      const fbRes = await executeScholarshipListQueryWithSeoFallback(
        supabase,
        req,
        {
          countOnly: true,
          includeMeta: false,
          isProSubscriber: true
        },
        listCtx
      );
      fbResForMeta = fbRes;
      fallback_count = fbRes.total;
      rendered_count = fbRes.total;
      fallback_used = Boolean(fbRes.seoFallback?.used);
      seo_exact_total =
        fbRes.seoFallback?.exactTotal !== undefined
          ? fbRes.seoFallback.exactTotal
          : null;
      thinListing = Boolean(fbRes.seoFallback?.thinListing);

      const pageRes = await executeScholarshipListQueryWithSeoFallback(
        supabase,
        req,
        {
          countOnly: false,
          includeMeta: false,
          isProSubscriber: true
        },
        listCtx
      );
      final_rendered_count = pageRes.scholarships.length;

      status = 'GOOD';
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      status = 'ERROR';
      rows.push({
        route: job.route,
        page_kind: job.page_kind,
        exact_count: -1,
        rendered_count: -1,
        fallback_count: -1,
        final_rendered_count: -1,
        fallback_used: false,
        seo_exact_total: null,
        selectivity_ratio: 0,
        overlap_score: 0,
        facet_penalty: 0,
        intent_score: 0,
        final_quality_score: 0,
        status,
        noindex_now: true,
        canonical_target: job.manifestEntry?.canonicalTarget ?? null,
        reason_codes: ['render_error'],
        manifest_indexable_false:
          job.manifestEntry?.indexable === false ? true : undefined,
        uses_scholarship_categories_join: categoryUsesScholarshipJoin,
        error: msg
      });
      origLog(
        `[CHECK]\t${job.route}\tERROR\t-\t-\t-\tyes`
      );
      if (jobIndex === 50 || jobIndex === 100 || (jobIndex > 100 && jobIndex % 100 === 0)) {
        logInterimCheckpoint(`${jobIndex}`);
      }
      continue;
    }

    const broadNoindex = fbResForMeta
      ? seoBroadFallbackNoindexFromListResult(fbResForMeta)
      : false;

    const evaluation = evaluateSeoRouteQuality({
      canonicalPath:
        job.page_kind === 'manifest' && job.manifestEntry
          ? job.manifestEntry.canonicalPath
          : job.route.replace(/^\/scholarships\//, '').replace(/^category\//, ''),
      exactCount: exact_count,
      renderedCount: rendered_count,
      totalCatalog,
      fallbackUsed: fallback_used,
      overlapSimilarity:
        job.manifestEntry?.qualitySnapshot?.overlapSimilarity ??
        job.manifestEntry?.overlapMeta?.ratio,
      canonicalTarget: job.manifestEntry?.canonicalTarget ?? null,
      reasonCodes:
        job.manifestEntry &&
        typeof job.manifestEntry.qualitySnapshot?.exactCount === 'number' &&
        job.manifestEntry.qualitySnapshot.exactCount !== exact_count
          ? ['manifest_render_mismatch']
          : []
    });
    status = evaluation.bucket;
    const noindex_now =
      job.page_kind === 'manifest' && job.manifestEntry?.indexable === false
        ? true
        : evaluation.noindexNow || thinListing || broadNoindex;

    const row: AuditRow = {
      route: job.route,
      page_kind: job.page_kind,
      exact_count,
      rendered_count,
      fallback_count,
      final_rendered_count,
      fallback_used,
      seo_exact_total,
      selectivity_ratio: evaluation.snapshot.selectivityRatio,
      overlap_score: evaluation.snapshot.overlapScore,
      facet_penalty: evaluation.snapshot.facetPenalty,
      intent_score: evaluation.snapshot.intentScore,
      final_quality_score: evaluation.snapshot.finalQualityScore,
      status,
      noindex_now,
      canonical_target:
        noindex_now && evaluation.canonicalTarget
          ? `/scholarships/${evaluation.canonicalTarget}`
          : status === 'GOOD'
            ? job.route
            : null,
      reason_codes: evaluation.reasonCodes,
      manifest_indexable_false:
        job.manifestEntry?.indexable === false ? true : undefined,
      uses_scholarship_categories_join: categoryUsesScholarshipJoin
    };
    rows.push(row);

    origLog(
      [
        '[CHECK]',
        row.route,
        row.status,
        String(exact_count),
        String(fallback_count),
        String(final_rendered_count),
        noindex_now ? 'yes' : 'no'
      ].join('\t')
    );
    if (jobIndex === 50 || jobIndex === 100 || (jobIndex > 100 && jobIndex % 100 === 0)) {
      logInterimCheckpoint(`${jobIndex}`);
    }
  }

  console.log = origLog;

  const summary = {
    total_pages: rows.length,
    GOOD: rows.filter((r) => r.status === 'GOOD').length,
    SUPPORTING: rows.filter((r) => r.status === 'SUPPORTING').length,
    THIN: rows.filter((r) => r.status === 'THIN').length,
    EMPTY: rows.filter((r) => r.status === 'EMPTY').length,
    TOO_BROAD: rows.filter((r) => r.status === 'TOO_BROAD').length,
    ERROR: rows.filter((r) => r.status === 'ERROR').length
  };

  const top50GoodManifestRows = manifestRoutes
    .filter((entry) => entry.qualityBucket === 'GOOD')
    .sort((a, b) => {
      const bs = b.qualitySnapshot?.finalQualityScore ?? b.score ?? 0;
      const as = a.qualitySnapshot?.finalQualityScore ?? a.score ?? 0;
      return bs - as;
    })
    .slice(0, 50);
  const top50GoodCompare: TopGoodCompareRow[] = top50GoodManifestRows.map((entry) => {
    const descriptor = buildManifestEntrySeoExactDescriptor(bounds, entry);
    const row = rows.find((candidate) => candidate.route === `/scholarships/${entry.canonicalPath}`);
    const manifestExactCount =
      entry.qualitySnapshot?.exactCount ??
      entry.scholarshipsCount ??
      entry.minCountSnapshot ??
      0;
    const liveExactCount = row?.exact_count ?? -1;
    return {
      route: `/scholarships/${entry.canonicalPath}`,
      manifest_filters: {
        required_seo_tags: descriptor.requiredSeoTags,
        state_codes: descriptor.stateCodes,
        location_slugs: descriptor.locationSlugs,
        include_location_labels: Array.from(
          descriptor.moreFilters.includeLocationLabels
        ).sort((a, b) => a.localeCompare(b)),
        unmapped_segments: descriptor.unmappedSegments
      },
      live_filters: {
        required_seo_tags: requiredSeoTagsForListingPath(entry.canonicalPath),
        state_codes: descriptor.stateCodes
      },
      manifest_exact_count: manifestExactCount,
      live_exact_count: liveExactCount,
      diff: manifestExactCount - liveExactCount
    };
  });

  const tooBroadRows = rows.filter((r) => r.status === 'TOO_BROAD');
  const broadNoindexOk = tooBroadRows.filter((r) => r.noindex_now).length;

  const problematic = [...rows]
    .filter((r) => r.status !== 'GOOD')
    .sort((a, b) => {
      const ka = problemSortKey(a);
      const kb = problemSortKey(b);
      if (ka[0] !== kb[0]) return ka[0] - kb[0];
      return ka[1] - kb[1];
    });
  const top30 = problematic.slice(0, 30);

  let emptyStopped = 0;
  let matchedBaselineRoutes = 0;
  let compareBlock: Record<string, unknown> | null = null;

  const baselineTally = baseline
    ? tallyFromStatuses(baseline.values())
    : null;

  const currentRouteSet = new Set(rows.map((r) => r.route));
  const baselineMatchedRows = baseline
    ? [...baseline.entries()]
        .filter(([route]) => currentRouteSet.has(route))
        .map(([, v]) => v)
    : [];
  const baselineMatchedTally = baseline
    ? tallyFromStatuses(baselineMatchedRows)
    : null;
  const afterRowsForMatchedBaseline = baseline
    ? rows.filter((r) => baseline.has(r.route))
    : [];
  const afterMatchedTally = baseline
    ? tallyFromStatuses(afterRowsForMatchedBaseline)
    : null;

  if (baseline) {
    for (const r of rows) {
      const b = baseline.get(r.route);
      if (!b) continue;
      matchedBaselineRoutes += 1;
      const wasEmpty = b.status === 'EMPTY';
      const nowEmpty = r.status === 'EMPTY';
      if (wasEmpty && !nowEmpty) emptyStopped += 1;
    }

    compareBlock = {
      baselinePath: baselinePath,
      baseline_note:
        'Rows matched by `route`. Baseline files with only manifest URLs (e.g. old diagnose output) do not include category/L2/legacy-only pages — those appear only in "after". Prefer comparing two reportVersion:2 JSONs from this script.',
      baseline_row_count: baseline.size,
      routes_matched_for_diff: matchedBaselineRoutes,
      summary_baseline_file_full_tally: baselineTally,
      summary_baseline_matched_routes_only_tally: baselineMatchedTally,
      summary_after_matched_routes_only_tally: afterMatchedTally,
      summary_after_full_run: summary,
      pages_empty_in_baseline_file: baselineTally?.EMPTY ?? 0,
      pages_empty_baseline_matched_routes: baselineMatchedTally?.EMPTY ?? 0,
      pages_empty_after_on_matched_routes: afterMatchedTally?.EMPTY ?? 0,
      pages_empty_after_full_run: summary.EMPTY,
      pages_stopped_being_empty: emptyStopped,
      l2_category_pages_total: l2Slugs.length,
      l2_category_pages_using_scholarship_categories_join: l2WithJoin,
      too_broad_pages_noindex_correct: `${broadNoindexOk}/${tooBroadRows.length}`,
      top50_good_compare: top50GoodCompare,
      top30_problematic: top30.map((r) => ({
        route: r.route,
        page_kind: r.page_kind,
        exact_count: r.exact_count,
        rendered_count: r.rendered_count,
        fallback_count: r.fallback_count,
        final_rendered_count: r.final_rendered_count,
        fallback_used: r.fallback_used,
        final_quality_score: r.final_quality_score,
        status: r.status,
        noindex_now: r.noindex_now,
        canonical_target: r.canonical_target,
        reason_codes: r.reason_codes
      }))
    };
  } else {
    compareBlock = {
      baselinePath: null,
      hint: 'Re-run with --compare path/to/older-report.json for before/after (expects JSON with `rows[].route` and `rows[].status`).',
      l2_category_pages_total: l2Slugs.length,
      l2_category_pages_using_scholarship_categories_join: l2WithJoin,
      too_broad_pages_noindex_correct: `${broadNoindexOk}/${tooBroadRows.length}`,
      top50_good_compare: top50GoodCompare,
      top30_problematic: top30.map((r) => ({
        route: r.route,
        page_kind: r.page_kind,
        exact_count: r.exact_count,
        rendered_count: r.rendered_count,
        fallback_count: r.fallback_count,
        final_rendered_count: r.final_rendered_count,
        fallback_used: r.fallback_used,
        final_quality_score: r.final_quality_score,
        status: r.status,
        noindex_now: r.noindex_now,
        canonical_target: r.canonical_target,
        reason_codes: r.reason_codes
      }))
    };
  }

  fs.mkdirSync(path.dirname(OUT_REPORT), { recursive: true });
  const payload = {
    reportVersion: 3,
    generatedAt: new Date().toISOString(),
    tooBroadMin,
    seoMinIndexableListCount: SEO_MIN_INDEXABLE_LIST_COUNT,
    broadNoindexMinExclusive: SEO_BROAD_FALLBACK_NOINDEX_MIN,
    summary,
    compare: compareBlock,
    rows
  };
  fs.writeFileSync(OUT_REPORT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  origLog('');
  origLog('=== SUMMARY (after / current run) ===');
  origLog(`total_pages: ${summary.total_pages}`);
  origLog(`GOOD: ${summary.GOOD}`);
  origLog(`SUPPORTING: ${summary.SUPPORTING}`);
  origLog(`THIN: ${summary.THIN}`);
  origLog(`EMPTY: ${summary.EMPTY}`);
  origLog(`TOO_BROAD: ${summary.TOO_BROAD}`);
  origLog(`ERROR: ${summary.ERROR}`);
  origLog('');
  origLog(
    `L2 category pages (level=2 in DB): total=${l2Slugs.length}, using scholarship_categories join=${l2WithJoin}`
  );
  origLog(
    `TOO_BROAD pages with noindex_now=yes: ${broadNoindexOk}/${tooBroadRows.length}`
  );
  if (baseline && baselineTally) {
    origLog('=== BASELINE (from --compare file) ===');
    origLog(
      `rows in file: ${baseline.size}; overlap with this run (same route string): ${matchedBaselineRoutes}`
    );
    origLog(
      `Full file tally — GOOD ${baselineTally.GOOD} | THIN ${baselineTally.THIN} | EMPTY ${baselineTally.EMPTY} | TOO_BROAD ${baselineTally.TOO_BROAD} | ERROR ${baselineTally.ERROR}` +
        (baselineTally._ ? ` | other ${baselineTally._}` : '')
    );
    if (baselineMatchedTally && afterMatchedTally) {
      origLog('');
      origLog(
        '=== BEFORE → AFTER (same routes only: baseline status vs this run) ==='
      );
      origLog(
        `GOOD: ${baselineMatchedTally.GOOD} → ${afterMatchedTally.GOOD} | THIN: ${baselineMatchedTally.THIN} → ${afterMatchedTally.THIN} | EMPTY: ${baselineMatchedTally.EMPTY} → ${afterMatchedTally.EMPTY} | TOO_BROAD: ${baselineMatchedTally.TOO_BROAD} → ${afterMatchedTally.TOO_BROAD} | ERROR: ${baselineMatchedTally.ERROR} → ${afterMatchedTally.ERROR}`
      );
    }
    origLog('');
    origLog(
      `This run total_pages (manifest + legacy-only + L1 + L2): ${summary.total_pages}`
    );
    origLog(
      `Pages that stopped being EMPTY (EMPTY in baseline → not EMPTY now, matched route): ${emptyStopped}`
    );
  } else if (!baseline) {
    origLog(
      'No --compare baseline; save this report and re-run with --compare <file> for EMPTY migration counts.'
    );
  }
  origLog('');
  origLog('=== TOP 30 problematic (non-GOOD) ===');
  for (const r of top30) {
    origLog(
      `${r.route}\t${r.page_kind}\t${r.status}\texact=${r.exact_count}\trendered=${r.rendered_count}\tfallback=${r.fallback_count}\tnoindex=${r.noindex_now ? 'yes' : 'no'}`
    );
  }
  origLog('');
  origLog(`Full JSON: ${OUT_REPORT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
