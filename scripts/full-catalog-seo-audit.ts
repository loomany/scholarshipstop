/**
 * Full catalog + SEO listing audit (Supabase, same server query stack as API).
 * Analysis only — writes tmp/full-catalog-seo-audit-report.json and logs each page as it runs.
 *
 *   npx tsx scripts/full-catalog-seo-audit.ts
 *
 * Env:
 *   MAX_ROUTES=N       — limit manifest routes (smoke)
 *   SKIP_L2=1          — skip DB L2 category scan
 *   TOO_BROAD_MIN=500  — exact=0 && final>this → TOO_BROAD
 */

import fs from 'fs';
import path from 'path';

import { createClient } from '@supabase/supabase-js';

import type { LongTailSlug } from '../app/scholarships/scholarshipLongTailPresets';
import {
  defaultMoreFiltersFromBounds,
  type MoreFiltersState
} from '../app/scholarships/moreFilters';
import { SCHOLARSHIP_CATEGORY_ORDER } from '../app/scholarships/scholarshipCategories';
import type { SeoScholarshipRouteManifestEntry } from '../lib/scholarships/seoScholarshipManifest';
import {
  buildListingBaselineMoreFilters,
  buildSeoSlugOnlyMoreFilters,
  requiredSeoTagsForListingPath,
  type LongTailListingMode
} from '../lib/scholarships/seoScholarshipListing';
import {
  executeScholarshipListQuery,
  executeScholarshipListQueryWithSeoFallback,
  fetchGlobalFilterBounds,
  scholarshipListRequestFromParts
} from '../lib/scholarships/scholarshipListServer';
import type { Database } from '../types_db';

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'data', 'seo-scholarship-routes.json');
const REPORT_JSON = path.join(ROOT, 'tmp', 'full-catalog-seo-audit-report.json');

type PageType =
  | 'seo_manifest'
  | 'category_l1'
  | 'category_l2'
  | 'main_listing';

type RowStatus = 'GOOD' | 'THIN' | 'EMPTY' | 'TOO_BROAD' | 'ERROR';

type RecommendedAction =
  | 'keep'
  | 'noindex'
  | 'improve mapping'
  | 'disable route'
  | 'narrow fallback';

type AuditRow = {
  route: string;
  page_type: PageType;
  exact_count: number;
  fallback_count: number;
  final_rendered_count: number;
  fallback_used: boolean;
  status: RowStatus;
  reason: string;
  recommended_action: RecommendedAction;
  uses_seo_tags: boolean;
  data_source_hint: string;
  manifest_indexable?: boolean;
  snapshot_count?: number | null;
  snapshot_vs_live?: string | null;
  subject_join_count?: number | null;
  category_l1_slug?: boolean;
  notes?: string;
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
  final: number,
  tooBroadMin: number,
  fallbackUsed: boolean
): Exclude<RowStatus, 'ERROR'> {
  if (final === 0) return 'EMPTY';
  if (exact === 0 && final > tooBroadMin && fallbackUsed) return 'TOO_BROAD';
  if (final < 12) return 'THIN';
  return 'GOOD';
}

function recommend(
  status: Exclude<RowStatus, 'ERROR'>,
  row: Pick<
    AuditRow,
    'page_type' | 'manifest_indexable' | 'uses_seo_tags' | 'fallback_used'
  >
): RecommendedAction {
  if (status === 'GOOD') return 'keep';
  if (status === 'EMPTY') {
    return row.page_type === 'seo_manifest' ? 'disable route' : 'improve mapping';
  }
  if (status === 'TOO_BROAD') {
    if (row.manifest_indexable === true) return 'noindex';
    return 'narrow fallback';
  }
  if (status === 'THIN') {
    return row.fallback_used ? 'narrow fallback' : 'improve mapping';
  }
  return 'keep';
}

function reasonFor(
  status: Exclude<RowStatus, 'ERROR'>,
  exact: number,
  final: number,
  tooBroadMin: number,
  fb: boolean
): string {
  switch (status) {
    case 'GOOD':
      return `final=${final}≥12; exact=${exact}; fallback_used=${fb}`;
    case 'THIN':
      return `final=${final} in [1,11]; exact=${exact}; fallback_used=${fb}`;
    case 'EMPTY':
      return 'No rows after listing pipeline';
    case 'TOO_BROAD':
      return `exact=0, fallback filled ${final} results (>${tooBroadMin}) — likely nuclear/broad pool`;
    default:
      return '';
  }
}

function snapshotCompare(
  entry: SeoScholarshipRouteManifestEntry | undefined,
  live: number
): { snapshot_count: number | null; snapshot_vs_live: string | null } {
  const snap =
    entry?.minCountSnapshot ?? entry?.scholarshipsCount ?? null;
  if (snap == null || !Number.isFinite(snap))
    return { snapshot_count: null, snapshot_vs_live: null };
  const s = Number(snap);
  if (s <= 0) return { snapshot_count: s, snapshot_vs_live: null };
  const ratio = live / s;
  if (ratio < 0.5 || ratio > 2)
    return {
      snapshot_count: s,
      snapshot_vs_live: `snapshot=${s} live=${live} ratio≈${ratio.toFixed(2)}`
    };
  return { snapshot_count: s, snapshot_vs_live: null };
}

/** Lower = more problematic. */
function problemSortKey(r: AuditRow): [number, number] {
  switch (r.status) {
    case 'ERROR':
      return [0, 0];
    case 'EMPTY':
      return [1, 0];
    case 'TOO_BROAD':
      return [2, -r.final_rendered_count];
    case 'THIN':
      return [3, r.final_rendered_count];
    case 'GOOD':
    default:
      return [9, 0];
  }
}

async function countSubjectJoin(
  supabase: ReturnType<typeof createClient<Database>>,
  slug: string
): Promise<number | null> {
  const { data: cat, error: e1 } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (e1 || !cat?.id) return null;
  const { count, error: e2 } = await supabase
    .from('scholarship_categories')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', cat.id);
  if (e2) return null;
  return count ?? 0;
}

async function main() {
  loadEnvFiles();

  const origLog = console.log.bind(console);
  console.log = (...args: unknown[]) => {
    const a0 = args[0];
    if (a0 === 'FALLBACK CHECK') return;
    if (typeof a0 === 'string') {
      if (a0.startsWith('SEO MODE ACTIVE')) return;
      if (a0.startsWith('SEO TAG FILTER')) return;
    }
    origLog(...args);
  };

  const tooBroadMin = Math.max(
    1,
    Number.parseInt(process.env.TOO_BROAD_MIN ?? '500', 10) || 500
  );
  const skipL2 = process.env.SKIP_L2 === '1';

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

  const supabase = createClient<Database>(url, key);
  const bounds = await fetchGlobalFilterBounds(supabase);
  const defaultMf = () => defaultMoreFiltersFromBounds(bounds);

  const rows: AuditRow[] = [];

  const pushRow = (r: AuditRow) => {
    rows.push(r);
    origLog(
      `[${r.page_type}] ${r.route}\texact=${r.exact_count}\tfinal=${r.final_rendered_count}\tfb=${r.fallback_used}\t${r.status}\t→ ${r.recommended_action}`
    );
  };

  const runSeoPipeline = async (opts: {
    route: string;
    page_type: PageType;
    req: ReturnType<typeof scholarshipListRequestFromParts>;
    slugOnlyMf: MoreFiltersState | null;
    seoEnable: boolean;
    isCategorySeo: boolean;
    uses_seo_tags: boolean;
    data_source_hint: string;
    manifest_entry?: SeoScholarshipRouteManifestEntry;
    subject_join_count?: number | null;
    category_l1_slug?: boolean;
    notes?: string;
  }): Promise<void> => {
    const {
      route,
      page_type,
      req,
      slugOnlyMf,
      seoEnable,
      isCategorySeo,
      uses_seo_tags,
      data_source_hint,
      manifest_entry,
      subject_join_count,
      category_l1_slug,
      notes
    } = opts;

    try {
      const exactRes = await executeScholarshipListQuery(supabase, req, {
        countOnly: true,
        includeMeta: false,
        isProSubscriber: false
      });
      const exact_count = exactRes.total;

      const fbRes = await executeScholarshipListQueryWithSeoFallback(
        supabase,
        req,
        {
          countOnly: true,
          includeMeta: false,
          isProSubscriber: false
        },
        {
          enable: seoEnable,
          slugOnlyMoreFilters: slugOnlyMf,
          bounds,
          isCategorySeo
        }
      );

      const final_rendered_count = fbRes.total;
      /** True when the user-visible total comes from a relaxed/nuclear path (exact was 0, rows exist). */
      const fallback_used =
        exact_count === 0 && final_rendered_count > 0;
      const fallback_count = fallback_used ? final_rendered_count : 0;

      const status = classifyStatus(
        exact_count,
        final_rendered_count,
        tooBroadMin,
        fallback_used
      );

      const snap =
        page_type === 'seo_manifest' && manifest_entry
          ? snapshotCompare(manifest_entry, final_rendered_count)
          : { snapshot_count: null as number | null, snapshot_vs_live: null as string | null };

      const base: AuditRow = {
        route,
        page_type,
        exact_count,
        fallback_count,
        final_rendered_count,
        fallback_used,
        status,
        reason: reasonFor(
          status,
          exact_count,
          final_rendered_count,
          tooBroadMin,
          fallback_used
        ),
        recommended_action: recommend(status, {
          page_type,
          manifest_indexable: manifest_entry?.indexable,
          uses_seo_tags,
          fallback_used
        }),
        uses_seo_tags,
        data_source_hint,
        manifest_indexable: manifest_entry?.indexable,
        snapshot_count: snap.snapshot_count,
        snapshot_vs_live: snap.snapshot_vs_live,
        subject_join_count,
        category_l1_slug,
        notes
      };

      if (
        manifest_entry?.indexable === true &&
        exact_count === 0 &&
        final_rendered_count >= 3000 &&
        fallback_used
      ) {
        base.notes = [base.notes, 'indexable_manifest_huge_fallback'].filter(Boolean).join('; ');
        if (base.recommended_action === 'keep')
          base.recommended_action = 'noindex';
      }

      if (snap.snapshot_vs_live) {
        base.notes = [base.notes, `AI_SNAPSHOT_DRIFT:${snap.snapshot_vs_live}`]
          .filter(Boolean)
          .join('; ');
      }

      pushRow(base);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      pushRow({
        route,
        page_type,
        exact_count: -1,
        fallback_count: -1,
        final_rendered_count: -1,
        fallback_used: false,
        status: 'ERROR',
        reason: msg,
        recommended_action: 'improve mapping',
        uses_seo_tags,
        data_source_hint,
        manifest_indexable: manifest_entry?.indexable,
        subject_join_count,
        category_l1_slug,
        notes,
        error: msg
      });
    }
  };

  try {
    const manifest = JSON.parse(
      fs.readFileSync(MANIFEST, 'utf8')
    ) as { routes: SeoScholarshipRouteManifestEntry[] };
    let manifestRoutes = manifest.routes ?? [];
    const maxEnv = process.env.MAX_ROUTES?.trim();
    if (maxEnv) {
      const n = Number.parseInt(maxEnv, 10);
      if (Number.isFinite(n) && n > 0)
        manifestRoutes = manifestRoutes.slice(0, n);
    }

    origLog(`=== Manifest SEO routes (${manifestRoutes.length}) ===`);

    for (const entry of manifestRoutes) {
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
      const requiredSeoTags = requiredSeoTagsForListingPath(slug);

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
        listScope: 'catalog',
        requiredSeoTags
      });

      const dataHint =
        requiredSeoTags.length > 0
          ? 'seo_tags+legacy_merge'
          : lt.length > 0
            ? 'legacy_long_tail_only'
            : 'manifest_filters_only';

      await runSeoPipeline({
        route,
        page_type: 'seo_manifest',
        req,
        slugOnlyMf,
        seoEnable: true,
        isCategorySeo: false,
        uses_seo_tags: requiredSeoTags.length > 0,
        data_source_hint: dataHint,
        manifest_entry: entry
      });
    }

    origLog(`=== Category L1 (${SCHOLARSHIP_CATEGORY_ORDER.length}) ===`);

    for (const catSlug of SCHOLARSHIP_CATEGORY_ORDER) {
      const route = `/scholarships/category/${catSlug}`;
      const req = scholarshipListRequestFromParts({
        page: 1,
        limit: 12,
        sort: 'most_recent',
        tab: 'matches',
        q: '',
        category: null,
        categoryPageSlug: catSlug,
        deadline: 'any',
        state: null,
        ignored: null,
        saved: null,
        started: null,
        submitted: null,
        moreFilters: defaultMf(),
        longTailLegacySlugs: [],
        similarTo: null,
        similarCategorySlug: null,
        listScope: 'catalog',
        requiredSeoTags: []
      });

      const sj = await countSubjectJoin(supabase, catSlug);

      await runSeoPipeline({
        route,
        page_type: 'category_l1',
        req,
        slugOnlyMf: null,
        seoEnable: true,
        isCategorySeo: true,
        uses_seo_tags: false,
        data_source_hint: 'category_legacy_filter+optional_join',
        subject_join_count: sj,
        category_l1_slug: true,
        notes:
          sj != null
            ? 'L1: compare subject_join_count vs listing pipeline'
            : 'L1: no matching row in public.categories for slug'
      });
    }

    if (!skipL2) {
      origLog('=== Category L2 (public.categories) ===');
      const { data: l2rows, error: l2err } = await supabase
        .from('categories')
        .select('slug')
        .eq('level', 2);

      if (l2err) {
        origLog(`L2 fetch error: ${l2err.message}`);
      } else {
        const slugs = (l2rows ?? [])
          .map((r) => String(r.slug ?? '').trim())
          .filter(Boolean)
          .sort();

        origLog(`L2 rows: ${slugs.length}`);

        for (const l2slug of slugs) {
          const route = `/scholarships/category/${l2slug}`;
          const req = scholarshipListRequestFromParts({
            page: 1,
            limit: 12,
            sort: 'most_recent',
            tab: 'matches',
            q: '',
            category: null,
            categoryPageSlug: l2slug,
            deadline: 'any',
            state: null,
            ignored: null,
            saved: null,
            started: null,
            submitted: null,
            moreFilters: defaultMf(),
            longTailLegacySlugs: [],
            similarTo: null,
            similarCategorySlug: null,
            listScope: 'catalog',
            requiredSeoTags: []
          });

          const sj = await countSubjectJoin(supabase, l2slug);

          await runSeoPipeline({
            route,
            page_type: 'category_l2',
            req,
            slugOnlyMf: null,
            seoEnable: true,
            isCategorySeo: true,
            uses_seo_tags: false,
            data_source_hint: 'category_legacy_filter+scholarship_categories_join_audit',
            subject_join_count: sj,
            category_l1_slug: false,
            notes:
              'UI uses legacy category_slug/tags scope; subject_join_count is scholarship_categories join'
          });
        }
      }
    } else {
      origLog('=== Category L2 skipped (SKIP_L2=1) ===');
    }

    origLog('=== Main listing hub + samples ===');

    const hubReq = scholarshipListRequestFromParts({
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
      moreFilters: defaultMf(),
      longTailLegacySlugs: [],
      similarTo: null,
      similarCategorySlug: null,
      listScope: 'catalog',
      requiredSeoTags: []
    });

    await runSeoPipeline({
      route: '/scholarships (hub tab=matches catalog)',
      page_type: 'main_listing',
      req: hubReq,
      slugOnlyMf: null,
      seoEnable: false,
      isCategorySeo: false,
      uses_seo_tags: false,
      data_source_hint: 'hub_no_seo_fallback',
      notes: 'Mirrors API when seoListingFallback absent (hub primary uses best-matches; guest UX normalizes to matches — this row is matches)'
    });

    await runSeoPipeline({
      route: '/scholarships?tab=best-matches (hub)',
      page_type: 'main_listing',
      req: scholarshipListRequestFromParts({
        page: 1,
        limit: 12,
        sort: 'most_recent',
        tab: 'best-matches',
        q: '',
        category: null,
        categoryPageSlug: null,
        deadline: 'any',
        state: null,
        ignored: null,
        saved: null,
        started: null,
        submitted: null,
        moreFilters: defaultMf(),
        longTailLegacySlugs: [],
        similarTo: null,
        similarCategorySlug: null,
        listScope: 'catalog',
        requiredSeoTags: []
      }),
      slugOnlyMf: null,
      seoEnable: false,
      isCategorySeo: false,
      uses_seo_tags: false,
      data_source_hint: 'hub_best_matches_no_seo_fallback'
    });

    const samples: {
      label: string;
      state?: string | null;
    }[] = [
      { label: 'CA', state: 'CA' },
      { label: 'TX', state: 'TX' },
      { label: 'FL', state: 'FL' },
      { label: 'NY', state: 'NY' }
    ];

    for (const s of samples) {
      const req = scholarshipListRequestFromParts({
        page: 1,
        limit: 12,
        sort: 'most_recent',
        tab: 'matches',
        q: '',
        category: null,
        categoryPageSlug: null,
        deadline: 'any',
        state: s.state,
        ignored: null,
        saved: null,
        started: null,
        submitted: null,
        moreFilters: defaultMf(),
        longTailLegacySlugs: [],
        similarTo: null,
        similarCategorySlug: null,
        listScope: 'catalog',
        requiredSeoTags: []
      });

      await runSeoPipeline({
        route: `/scholarships?state=${s.label}`,
        page_type: 'main_listing',
        req,
        slugOnlyMf: null,
        seoEnable: false,
        isCategorySeo: false,
        uses_seo_tags: false,
        data_source_hint: 'hub_state_filter_only'
      });
    }

    const summary = {
      total: rows.length,
      GOOD: rows.filter((r) => r.status === 'GOOD').length,
      THIN: rows.filter((r) => r.status === 'THIN').length,
      EMPTY: rows.filter((r) => r.status === 'EMPTY').length,
      TOO_BROAD: rows.filter((r) => r.status === 'TOO_BROAD').length,
      ERROR: rows.filter((r) => r.status === 'ERROR').length
    };

    const manifestRows = rows.filter((r) => r.page_type === 'seo_manifest');
    const usage = {
      seo_manifest_with_seo_tags: manifestRows.filter((r) => r.uses_seo_tags).length,
      seo_manifest_legacy_only: manifestRows.filter(
        (r) => !r.uses_seo_tags && r.data_source_hint.includes('legacy')
      ).length,
      seo_manifest_filters_only: manifestRows.filter(
        (r) => r.data_source_hint === 'manifest_filters_only'
      ).length
    };

    const indexableTooBroad = rows.filter(
      (r) =>
        r.page_type === 'seo_manifest' &&
        r.manifest_indexable === true &&
        r.exact_count === 0 &&
        r.final_rendered_count >= 3000 &&
        r.fallback_used
    );

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
      page_type: r.page_type,
      status: r.status,
      why: r.reason,
      what: r.recommended_action,
      exact: r.exact_count,
      final: r.final_rendered_count,
      fallback_used: r.fallback_used,
      notes: r.notes,
      error: r.error
    }));

    origLog('');
    origLog('=== SUMMARY (all page types) ===');
    origLog(JSON.stringify(summary, null, 2));
    origLog('');
    origLog('=== SEO manifest data hints ===');
    origLog(JSON.stringify(usage, null, 2));
    origLog('');
    origLog(
      `=== Indexable manifest + exact=0 + huge fallback (>=3000): ${indexableTooBroad.length} ===`
    );
    origLog('');
    origLog('=== TOP 30 problem pages ===');
    for (const t of top30) {
      origLog(
        `${t.route}\t${t.status}\t${t.why}\t→ ${t.what}` +
          (t.notes ? `\t(${t.notes})` : '') +
          (t.error ? `\tERR:${t.error}` : '')
      );
    }

    fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
    fs.writeFileSync(
      REPORT_JSON,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          tooBroadMin,
          summary,
          manifestUsage: usage,
          indexableHugeFallback: indexableTooBroad.map((r) => r.route),
          top30Problematic: top30,
          rows
        },
        null,
        2
      ),
      'utf8'
    );
    origLog('');
    origLog(`Full report: ${REPORT_JSON}`);
  } finally {
    console.log = origLog;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
