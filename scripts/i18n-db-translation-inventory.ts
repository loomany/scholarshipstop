/**
 * DB translation inventory CSV — read-only, no Supabase writes.
 * Usage: npx tsx scripts/i18n-db-translation-inventory.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DATE = '2026-05-20';
const OUT = join(process.cwd(), 'reports/seo', `i18n-db-translation-inventory-${DATE}.csv`);

type Row = {
  contentGroup: string;
  routePattern: string;
  estPageCount: number;
  sourceTableOrLoader: string;
  fieldsToTranslate: string;
  fieldsDoNotTranslate: string;
  seoRisk: string;
  freshnessRisk: string;
  firstBatch: string;
  indexPolicyEsFr: string;
  hreflangPolicy: string;
  qualityGate: string;
  slugStrategy: string;
};

const rows: Row[] = [
  {
    contentGroup: 'scholarship_detail',
    routePattern: '/scholarships/{slug}',
    estPageCount: 19448,
    sourceTableOrLoader:
      'public.scholarships; app/scholarships/scholarshipsData.ts; scholarshipPublicPath',
    fieldsToTranslate:
      'meta_title, meta_description, summary_short, summary_long, description, seoOverview, faq blocks',
    fieldsDoNotTranslate:
      'title (official name), amount, deadline, dates, slug, id, categories IDs, apply URLs',
    seoRisk: 'high',
    freshnessRisk: 'high',
    firstBatch: 'top 100 by GSC impressions + indexable',
    indexPolicyEsFr: 'noindex until translation_status=published',
    hreflangPolicy: 'en/es/fr/x-default only when ES+FR published for same source_id',
    qualityGate: 'human review + fact-preservation prompt',
    slugStrategy: 'keep English slug under /es/ and /fr/'
  },
  {
    contentGroup: 'provider_detail',
    routePattern: '/providers/{slug}',
    estPageCount: 5061,
    sourceTableOrLoader:
      'public.providers; provider_hub_listing; lib/seo/sitemaps.ts buildProviderSitemap',
    fieldsToTranslate: 'description, ai_description, ai_faq, meta wrappers',
    fieldsDoNotTranslate: 'display_name, official URLs, state, scholarship counts',
    seoRisk: 'medium',
    freshnessRisk: 'medium',
    firstBatch: 'top 50 by linked scholarship count',
    indexPolicyEsFr: 'noindex until published',
    hreflangPolicy: 'cluster when published',
    qualityGate: 'human review sample 10%',
    slugStrategy: 'keep English slug'
  },
  {
    contentGroup: 'resources_cms',
    routePattern: '/resources/{slug}',
    estPageCount: 900,
    sourceTableOrLoader:
      'content-hub posts; lib/content-hub/articles.ts; fetch published for sitemap',
    fieldsToTranslate: 'title, meta_title, meta_description, body_html',
    fieldsDoNotTranslate: 'author names, quoted program text, internal link paths',
    seoRisk: 'medium-high',
    freshnessRisk: 'medium',
    firstBatch: 'top 50 linked from EN hub + impressions',
    indexPolicyEsFr: 'noindex until published',
    hreflangPolicy: 'cluster when published',
    qualityGate: 'editorial review required',
    slugStrategy: 'keep English slug'
  },
  {
    contentGroup: 'db_essay_guides',
    routePattern: '/essays/{slug}',
    estPageCount: 11799,
    sourceTableOrLoader: 'lib/essays/essaysServer.ts; essays sitemap bucket',
    fieldsToTranslate: 'title, meta, body, FAQ',
    fieldsDoNotTranslate: 'slug, author, canonical EN path',
    seoRisk: 'medium',
    freshnessRisk: 'medium',
    firstBatch: 'top 25 after resources pilot',
    indexPolicyEsFr: 'noindex until published',
    hreflangPolicy: 'cluster when published',
    qualityGate: 'human review',
    slugStrategy: 'keep English slug'
  },
  {
    contentGroup: 'compare_state',
    routePattern: '/compare/states/{slug}',
    estPageCount: 600,
    sourceTableOrLoader: 'compare state pages; lib/seo/stateCompareSlug.ts',
    fieldsToTranslate: 'intro narrative, comparison prose, meta',
    fieldsDoNotTranslate: 'tabular stats, rankings, numeric comparisons',
    seoRisk: 'high',
    freshnessRisk: 'low-medium',
    firstBatch: 'defer P3',
    indexPolicyEsFr: 'inherit EN noindex rules + noindex until published',
    hreflangPolicy: 'only if indexable in EN',
    qualityGate: 'strict fact QA',
    slugStrategy: 'keep English slug'
  },
  {
    contentGroup: 'compare_university',
    routePattern: '/compare/universities/{slug}',
    estPageCount: 575,
    sourceTableOrLoader: 'compare university pages; canonicalUniversityVsSlug',
    fieldsToTranslate: 'intro, narrative blocks, meta',
    fieldsDoNotTranslate: 'stats tables, university legal names',
    seoRisk: 'high',
    freshnessRisk: 'low-medium',
    firstBatch: 'defer P3',
    indexPolicyEsFr: 'noindex until published',
    hreflangPolicy: 'cluster when published',
    qualityGate: 'strict fact QA',
    slugStrategy: 'keep English slug'
  },
  {
    contentGroup: 'category_seo_l1',
    routePattern: '/scholarships/category/{id}',
    estPageCount: 11,
    sourceTableOrLoader:
      'SCHOLARSHIP_CATEGORY_ORDER; category listing SSR; sitemaps categories',
    fieldsToTranslate: 'page intro, FAQ, meta (display labels via taxonomyLabels.ts done)',
    fieldsDoNotTranslate: 'category id, slug, query params',
    seoRisk: 'medium',
    freshnessRisk: 'low',
    firstBatch: 'all 11 categories ES+FR',
    indexPolicyEsFr: 'index when published (small set)',
    hreflangPolicy: 'full cluster',
    qualityGate: 'editorial review',
    slugStrategy: 'keep English category slug'
  },
  {
    contentGroup: 'seo_programmatic_hubs',
    routePattern: '/scholarships/for-students-from/*, long-tail presets',
    estPageCount: 1626,
    sourceTableOrLoader:
      'scholarshipLongTailPresets; seo.xml; lib/seo/sitemaps drip',
    fieldsToTranslate: 'hub intro, FAQ, meta wrappers',
    fieldsDoNotTranslate: 'listing card data (EN DB), slug paths',
    seoRisk: 'medium',
    freshnessRisk: 'medium',
    firstBatch: 'top 20 hubs by traffic',
    indexPolicyEsFr: 'inherit thin-page noindex + noindex until published',
    hreflangPolicy: 'only published indexable pairs',
    qualityGate: 'SEO review + fact check',
    slugStrategy: 'keep English slug'
  },
  {
    contentGroup: 'cross_country_seo',
    routePattern: '/scholarships/* country SEO routes',
    estPageCount: 200,
    sourceTableOrLoader: 'allScholarshipCountrySeoRoutes; scholarshipCountrySeo',
    fieldsToTranslate: 'intro, meta, FAQ',
    fieldsDoNotTranslate: 'country codes, filters',
    seoRisk: 'medium',
    freshnessRisk: 'medium',
    firstBatch: 'P3 after category hubs',
    indexPolicyEsFr: 'noindex until published',
    hreflangPolicy: 'cluster when published',
    qualityGate: 'editorial',
    slugStrategy: 'keep English slug'
  }
];

const header =
  'contentGroup,routePattern,estPageCount,sourceTableOrLoader,fieldsToTranslate,fieldsDoNotTranslate,seoRisk,freshnessRisk,firstBatch,indexPolicyEsFr,hreflangPolicy,qualityGate,slugStrategy\n';

const csv =
  header +
  rows
    .map((r) =>
      [
        r.contentGroup,
        r.routePattern,
        r.estPageCount,
        r.sourceTableOrLoader,
        r.fieldsToTranslate,
        r.fieldsDoNotTranslate,
        r.seoRisk,
        r.freshnessRisk,
        r.firstBatch,
        r.indexPolicyEsFr,
        r.hreflangPolicy,
        r.qualityGate,
        r.slugStrategy
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');

mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
writeFileSync(OUT, csv, 'utf8');
console.log(`Wrote ${OUT} (${rows.length} groups)`);
