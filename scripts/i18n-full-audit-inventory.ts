/**
 * Audit-only inventory generator for ES/FR localization coverage.
 * Does not modify product code or call external APIs.
 *
 * Usage: npx tsx scripts/i18n-full-audit-inventory.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  STAGE2_PILOT_CANONICAL_PATHS,
  STAGE2_PILOT_LOCALES
} from '../lib/i18n/pilotRoutes';
import {
  availableLocalesForPilotPath,
  getLocalizedPilotPage,
  listLocalizedPilotPages
} from '../lib/i18n/staticTranslations';
import { getTranslatedPageSeoDecision } from '../lib/i18n/translationPolicy';
import { SUBSCRIPTION_CANONICAL_PATH } from '../lib/i18n/subscriptionPageCopy';

const REPORT_DIR = join(process.cwd(), 'reports/seo');
const DATE = '2026-05-19';

type RouteType = 'A' | 'B' | 'C' | 'D' | 'E';
type Risk = 'none' | 'low' | 'medium' | 'high';

type RouteRow = {
  route: string;
  file: string;
  routeType: RouteType;
  routeTypeLabel: string;
  englishStatus: string;
  esExists: boolean;
  frExists: boolean;
  sameTemplate: string;
  translatedVisibleUi: string;
  languageSwitcher: string;
  localizedLinks: string;
  indexPolicy: string;
  inSitemap: string;
  hreflang: string;
  dbBacked: boolean;
  risk: Risk;
  recommendedAction: string;
};

const ROUTE_INVENTORY: Omit<
  RouteRow,
  'esExists' | 'frExists' | 'hreflang' | 'inSitemap' | 'translatedVisibleUi'
>[] = [
  // A — Public SEO static
  {
    route: '/',
    file: 'app/page.tsx + app/[locale]/[[...slugPath]]/page.tsx',
    routeType: 'A',
    routeTypeLabel: 'Public SEO static',
    englishStatus: 'live',
    sameTemplate: 'yes (HomePageContent)',
    languageSwitcher: 'yes',
    localizedLinks: 'yes',
    indexPolicy: 'index',
    dbBacked: false,
    risk: 'none',
    recommendedAction: 'maintain'
  },
  {
    route: '/about',
    file: 'app/about/page.tsx + localized pilot',
    routeType: 'A',
    routeTypeLabel: 'Public SEO static',
    englishStatus: 'live',
    sameTemplate: 'yes (TrustPageTemplate)',
    languageSwitcher: 'yes',
    localizedLinks: 'yes',
    indexPolicy: 'index',
    dbBacked: false,
    risk: 'none',
    recommendedAction: 'maintain'
  },
  {
    route: '/scholarships',
    file: 'app/scholarships/[[...slugPath]]/page.tsx + app/[locale]/scholarships/[[...slugPath]]/page.tsx',
    routeType: 'A',
    routeTypeLabel: 'Public SEO hub (DB catalog UI)',
    englishStatus: 'live',
    sameTemplate: 'yes (ScholarshipsSlugPathPageBody)',
    languageSwitcher: 'yes',
    localizedLinks: 'partial (Zone C detail links)',
    indexPolicy: 'index',
    dbBacked: true,
    risk: 'medium',
    recommendedAction: 'Stage 3B taxonomy labels; Stage 4 DB body'
  },
  {
    route: '/scholarships/hub/*',
    file: 'app/scholarships/[[...slugPath]]/page.tsx',
    routeType: 'A',
    routeTypeLabel: 'Public SEO hub tabs',
    englishStatus: 'live',
    sameTemplate: 'yes (ES/FR via [locale]/scholarships)',
    languageSwitcher: 'yes',
    localizedLinks: 'partial (Zone C cards)',
    indexPolicy: 'index',
    dbBacked: true,
    risk: 'medium',
    recommendedAction: 'maintain UI copy; DB cards remain EN'
  },
  {
    route: '/scholarships/category/[slug]',
    file: 'app/scholarships/category/[slug]/page.tsx',
    routeType: 'B',
    routeTypeLabel: 'Public SEO DB-backed',
    englishStatus: 'live',
    sameTemplate: 'EN only',
    languageSwitcher: 'no',
    localizedLinks: 'EN only',
    indexPolicy: 'index (EN)',
    dbBacked: true,
    risk: 'high',
    recommendedAction: 'Stage 4 DB translation pilot'
  },
  {
    route: '/scholarships/[state]/[university]',
    file: 'app/scholarships/[state]/[university]/page.tsx',
    routeType: 'B',
    routeTypeLabel: 'Public SEO DB-backed',
    englishStatus: 'live',
    sameTemplate: 'EN only',
    languageSwitcher: 'no',
    localizedLinks: 'EN only',
    indexPolicy: 'index (EN)',
    dbBacked: true,
    risk: 'high',
    recommendedAction: 'Stage 4 DB translation pilot'
  },
  {
    route: '/scholarships/[[...slugPath]] (detail/SEO long-tail)',
    file: 'app/scholarships/[[...slugPath]]/page.tsx',
    routeType: 'B',
    routeTypeLabel: 'Public SEO DB-backed',
    englishStatus: 'live',
    sameTemplate: 'EN only (ES/FR hub route for /scholarships only)',
    languageSwitcher: 'no on detail',
    localizedLinks: 'EN only',
    indexPolicy: 'index (EN, quality-gated)',
    dbBacked: true,
    risk: 'high',
    recommendedAction: 'Stage 4 DB translation pilot'
  },
  {
    route: '/essays',
    file: 'app/essays/page.tsx + localized pilot',
    routeType: 'A',
    routeTypeLabel: 'Public SEO hub',
    englishStatus: 'live',
    sameTemplate: 'yes (EssaysIndexPageContent)',
    languageSwitcher: 'yes',
    localizedLinks: 'yes (static guides)',
    indexPolicy: 'index',
    dbBacked: true,
    risk: 'low',
    recommendedAction: 'maintain; DB grid hidden on ES/FR'
  },
  {
    route: '/essays/{static-guide-slugs}',
    file: 'app/essays/[slug]/page.tsx + staticTranslations',
    routeType: 'A',
    routeTypeLabel: 'Public SEO static guide',
    englishStatus: 'live',
    sameTemplate: 'yes',
    languageSwitcher: 'yes',
    localizedLinks: 'yes',
    indexPolicy: 'index',
    dbBacked: false,
    risk: 'none',
    recommendedAction: 'maintain'
  },
  {
    route: '/essays/[slug] (DB)',
    file: 'app/essays/[slug]/page.tsx',
    routeType: 'B',
    routeTypeLabel: 'Public SEO DB-backed',
    englishStatus: 'live',
    sameTemplate: 'EN only',
    languageSwitcher: 'no',
    localizedLinks: 'EN only',
    indexPolicy: 'index (EN)',
    dbBacked: true,
    risk: 'high',
    recommendedAction: 'Stage 4 DB translation pilot'
  },
  {
    route: '/providers',
    file: 'app/providers/page.tsx + localized pilot',
    routeType: 'A',
    routeTypeLabel: 'Public SEO hub',
    englishStatus: 'live',
    sameTemplate: 'yes (ProvidersIndexPageContent)',
    languageSwitcher: 'yes',
    localizedLinks: 'partial (Zone C profile links)',
    indexPolicy: 'index',
    dbBacked: true,
    risk: 'medium',
    recommendedAction: 'Stage 3B provider search chrome; Stage 4 profiles'
  },
  {
    route: '/providers/[id]',
    file: 'app/providers/[id]/page.tsx',
    routeType: 'B',
    routeTypeLabel: 'Public SEO DB-backed',
    englishStatus: 'live',
    sameTemplate: 'EN only',
    languageSwitcher: 'no',
    localizedLinks: 'EN only',
    indexPolicy: 'index (EN, quality-gated)',
    dbBacked: true,
    risk: 'high',
    recommendedAction: 'Stage 4 DB translation pilot'
  },
  {
    route: '/compare',
    file: 'app/compare/page.tsx + localized pilot',
    routeType: 'A',
    routeTypeLabel: 'Public SEO hub',
    englishStatus: 'live',
    sameTemplate: 'yes (CompareIndexPageContent)',
    languageSwitcher: 'yes',
    localizedLinks: 'yes (static guides)',
    indexPolicy: 'index',
    dbBacked: true,
    risk: 'low',
    recommendedAction: 'maintain; DB list hidden on ES/FR'
  },
  {
    route: '/compare/{static-guide-slugs}',
    file: 'app/compare/[slug]/page.tsx + staticTranslations',
    routeType: 'A',
    routeTypeLabel: 'Public SEO static guide',
    englishStatus: 'live',
    sameTemplate: 'yes',
    languageSwitcher: 'yes',
    localizedLinks: 'yes',
    indexPolicy: 'index',
    dbBacked: false,
    risk: 'none',
    recommendedAction: 'maintain'
  },
  {
    route: '/compare/states/*, /compare/universities/*',
    file: 'app/compare/states/**, app/compare/universities/**',
    routeType: 'B',
    routeTypeLabel: 'Public SEO DB-backed',
    englishStatus: 'live',
    sameTemplate: 'EN only',
    languageSwitcher: 'no',
    localizedLinks: 'EN only',
    indexPolicy: 'index/noindex (quality-gated)',
    dbBacked: true,
    risk: 'high',
    recommendedAction: 'Stage 4 DB translation pilot'
  },
  {
    route: '/resources',
    file: 'app/resources/page.tsx + localized pilot',
    routeType: 'A',
    routeTypeLabel: 'Public SEO hub',
    englishStatus: 'live',
    sameTemplate: 'yes (ResourcesIndexPageContent)',
    languageSwitcher: 'yes',
    localizedLinks: 'yes (static guides)',
    indexPolicy: 'index',
    dbBacked: true,
    risk: 'medium',
    recommendedAction: 'Stage 3A optional static-guide filter UI'
  },
  {
    route: '/resources/{static-guide-slugs}',
    file: 'app/resources/** + staticTranslations',
    routeType: 'A',
    routeTypeLabel: 'Public SEO static guide',
    englishStatus: 'live',
    sameTemplate: 'yes',
    languageSwitcher: 'yes',
    localizedLinks: 'yes',
    indexPolicy: 'index',
    dbBacked: false,
    risk: 'none',
    recommendedAction: 'maintain'
  },
  {
    route: '/resources/[slug] (DB CMS)',
    file: 'app/resources/[slug]/page.tsx',
    routeType: 'B',
    routeTypeLabel: 'Public SEO DB-backed',
    englishStatus: 'live',
    sameTemplate: 'EN only',
    languageSwitcher: 'no',
    localizedLinks: 'EN only',
    indexPolicy: 'index (EN)',
    dbBacked: true,
    risk: 'high',
    recommendedAction: 'Stage 4 DB translation pilot'
  },
  {
    route: '/terms, /privacy-policy, /refund-policy, /help, /faq',
    file: 'app/{terms,privacy-policy,...}/page.tsx + LegalDocumentPage',
    routeType: 'A',
    routeTypeLabel: 'Public SEO legal/help',
    englishStatus: 'live',
    sameTemplate: 'yes',
    languageSwitcher: 'yes',
    localizedLinks: 'yes',
    indexPolicy: 'index',
    dbBacked: false,
    risk: 'none',
    recommendedAction: 'maintain'
  },
  {
    route: '/international-students, /for-organizations, /submit-grant',
    file: 'app/*/page.tsx + LocalizedMarketingPage',
    routeType: 'A',
    routeTypeLabel: 'Public SEO marketing',
    englishStatus: 'live',
    sameTemplate: 'yes',
    languageSwitcher: 'yes',
    localizedLinks: 'yes',
    indexPolicy: 'index',
    dbBacked: false,
    risk: 'low',
    recommendedAction: 'maintain'
  },
  {
    route: '/trust pages (9)',
    file: 'app/*/page.tsx + trustPageContent.ts',
    routeType: 'A',
    routeTypeLabel: 'Public SEO trust',
    englishStatus: 'live',
    sameTemplate: 'yes',
    languageSwitcher: 'yes',
    localizedLinks: 'yes',
    indexPolicy: 'index',
    dbBacked: false,
    risk: 'none',
    recommendedAction: 'maintain'
  },
  // C — Funnel
  {
    route: '/get-scholarships',
    file: 'app/get-scholarships/page.tsx + app/[locale]/get-scholarships/page.tsx',
    routeType: 'C',
    routeTypeLabel: 'Public funnel',
    englishStatus: 'live',
    sameTemplate: 'yes (GetScholarshipsQuizWizard)',
    languageSwitcher: 'no',
    localizedLinks: 'yes',
    indexPolicy: 'noindex,follow',
    dbBacked: false,
    risk: 'medium',
    recommendedAction: 'maintain; verify locale after quiz redirect'
  },
  {
    route: '/signin, /signin/[id]',
    file: 'app/signin/** + app/[locale]/signin/**',
    routeType: 'C',
    routeTypeLabel: 'Public funnel auth',
    englishStatus: 'live',
    sameTemplate: 'yes (auth forms + authUiCopy)',
    languageSwitcher: 'no',
    localizedLinks: 'yes',
    indexPolicy: 'noindex,follow',
    dbBacked: false,
    risk: 'medium',
    recommendedAction: 'maintain; auth callbacks stay EN'
  },
  {
    route: '/subscription',
    file: 'app/subscription/page.tsx + app/[locale]/subscription/page.tsx',
    routeType: 'C',
    routeTypeLabel: 'Public funnel pricing',
    englishStatus: 'live',
    sameTemplate: 'yes (SubscriptionPageView)',
    languageSwitcher: 'yes',
    localizedLinks: 'yes',
    indexPolicy: 'index (default)',
    dbBacked: true,
    risk: 'medium',
    recommendedAction: 'maintain; payment logic unchanged'
  },
  {
    route: '/subscription/success',
    file: 'app/subscription/success/page.tsx',
    routeType: 'C',
    routeTypeLabel: 'Billing post-checkout',
    englishStatus: 'live',
    sameTemplate: 'EN only',
    languageSwitcher: 'no',
    localizedLinks: 'EN only',
    indexPolicy: 'noindex',
    dbBacked: false,
    risk: 'high',
    recommendedAction: 'defer; Lemon redirect target'
  },
  {
    route: '/signup',
    file: 'app/signup/page.tsx',
    routeType: 'C',
    routeTypeLabel: 'Redirect → /onboarding',
    englishStatus: 'redirect',
    sameTemplate: 'n/a',
    languageSwitcher: 'no',
    localizedLinks: 'EN only',
    indexPolicy: 'n/a',
    dbBacked: false,
    risk: 'low',
    recommendedAction: 'Stage 3M onboarding locale (future)'
  },
  {
    route: '/onboarding',
    file: 'app/onboarding/page.tsx',
    routeType: 'C',
    routeTypeLabel: 'Private signup wizard',
    englishStatus: 'live',
    sameTemplate: 'partial funnelUiCopy',
    languageSwitcher: 'no',
    localizedLinks: 'EN only',
    indexPolicy: 'noindex',
    dbBacked: true,
    risk: 'high',
    recommendedAction: 'Stage 3M account funnel'
  },
  {
    route: '/essay, /essay/[id]',
    file: 'app/essay/**',
    routeType: 'C',
    routeTypeLabel: 'Paid product',
    englishStatus: 'live',
    sameTemplate: 'EN only',
    languageSwitcher: 'no',
    localizedLinks: 'Zone C allowed',
    indexPolicy: 'index/noindex mixed',
    dbBacked: true,
    risk: 'high',
    recommendedAction: 'defer product localization'
  },
  {
    route: '/iq/*',
    file: 'app/iq/**',
    routeType: 'C',
    routeTypeLabel: 'Sub-brand product',
    englishStatus: 'live',
    sameTemplate: 'EN only (iq subdomain)',
    languageSwitcher: 'no',
    localizedLinks: 'Zone C allowed',
    indexPolicy: 'index (iq subdomain)',
    dbBacked: true,
    risk: 'low',
    recommendedAction: 'separate product; not Stage 2'
  },
  {
    route: '/tools/*',
    file: 'app/tools/**',
    routeType: 'A',
    routeTypeLabel: 'Public SEO static',
    englishStatus: 'live',
    sameTemplate: 'EN only',
    languageSwitcher: 'no',
    localizedLinks: 'EN only',
    indexPolicy: 'index',
    dbBacked: false,
    risk: 'low',
    recommendedAction: 'P2 optional static translation'
  },
  // D — Private
  {
    route: '/account, /account/saved-scholarships',
    file: 'app/account/**',
    routeType: 'D',
    routeTypeLabel: 'Private account',
    englishStatus: 'live',
    sameTemplate: 'EN only',
    languageSwitcher: 'no',
    localizedLinks: 'EN only',
    indexPolicy: 'noindex',
    dbBacked: true,
    risk: 'high',
    recommendedAction: 'Stage 3M account UI'
  },
  {
    route: '/dashboard',
    file: 'app/dashboard/page.tsx',
    routeType: 'D',
    routeTypeLabel: 'Private legacy',
    englishStatus: 'live',
    sameTemplate: 'EN only',
    languageSwitcher: 'no',
    localizedLinks: 'EN only',
    indexPolicy: 'noindex',
    dbBacked: false,
    risk: 'medium',
    recommendedAction: 'dedupe with /account'
  },
  {
    route: '/essays/u/[id]',
    file: 'app/essays/u/[id]/page.tsx',
    routeType: 'D',
    routeTypeLabel: 'Private essay workspace',
    englishStatus: 'live',
    sameTemplate: 'EN only',
    languageSwitcher: 'no',
    localizedLinks: 'EN only',
    indexPolicy: 'noindex',
    dbBacked: true,
    risk: 'high',
    recommendedAction: 'defer'
  },
  {
    route: '/auth/reset_password',
    file: 'app/auth/reset_password/page.tsx',
    routeType: 'C',
    routeTypeLabel: 'Auth deep-link',
    englishStatus: 'live',
    sameTemplate: 'EN only',
    languageSwitcher: 'no',
    localizedLinks: 'EN only',
    indexPolicy: 'noindex',
    dbBacked: false,
    risk: 'medium',
    recommendedAction: 'UI-only ES/FR optional; email links EN'
  },
  // E — API
  {
    route: '/api/**',
    file: 'app/api/**',
    routeType: 'E',
    routeTypeLabel: 'API/internal',
    englishStatus: 'live',
    sameTemplate: 'n/a',
    languageSwitcher: 'n/a',
    localizedLinks: 'n/a',
    indexPolicy: 'disallow robots',
    dbBacked: true,
    risk: 'high',
    recommendedAction: 'no localization'
  },
  {
    route: '/sitemap.xml, /sitemaps/[slug].xml',
    file: 'app/sitemap.xml/route.ts, lib/seo/sitemaps.ts',
    routeType: 'E',
    routeTypeLabel: 'SEO infrastructure',
    englishStatus: 'live',
    sameTemplate: 'n/a',
    languageSwitcher: 'n/a',
    localizedLinks: 'n/a',
    indexPolicy: 'n/a',
    dbBacked: true,
    risk: 'medium',
    recommendedAction: 'monitor EN buckets unchanged'
  }
];

function pilotEsFr(path: string): { es: boolean; fr: boolean } {
  return {
    es: Boolean(getLocalizedPilotPage('es', path)),
    fr: Boolean(getLocalizedPilotPage('fr', path))
  };
}

function enrichRow(
  base: (typeof ROUTE_INVENTORY)[number]
): RouteRow {
  const pilot = STAGE2_PILOT_CANONICAL_PATHS.includes(
    base.route as (typeof STAGE2_PILOT_CANONICAL_PATHS)[number]
  )
    ? pilotEsFr(base.route)
    : { es: false, fr: false };

  const funnelLocalized =
    base.route.startsWith('/get-scholarships') ||
    base.route.startsWith('/signin') ||
    base.route === '/subscription';

  const esExists =
    pilot.es ||
    (funnelLocalized && base.route !== '/subscription/success') ||
    base.route.includes('[locale]') ||
    base.route.includes('hub');
  const frExists =
    pilot.fr ||
    (funnelLocalized && base.route !== '/subscription/success') ||
    base.route.includes('[locale]') ||
    base.route.includes('hub');

  let hreflang = 'none';
  let inSitemap = base.inSitemap ?? 'n/a';
  let translatedVisibleUi = base.translatedVisibleUi ?? 'n/a';

  if (pilot.es || pilot.fr) {
    const locales = availableLocalesForPilotPath(base.route);
    hreflang =
      locales.length >= 2
        ? `en, ${locales.join(', ')}, x-default`
        : locales.join(', ');
    inSitemap = 'locale-es-*, locale-fr-* pilot buckets';
    translatedVisibleUi = 'full (pilot static)';
  } else if (base.route === '/subscription') {
    hreflang = 'en, es, fr, x-default';
    inSitemap = 'not in sitemap (unchanged)';
    translatedVisibleUi = 'full (UI copy only)';
    return {
      ...base,
      esExists: true,
      frExists: true,
      hreflang,
      inSitemap,
      translatedVisibleUi
    };
  } else if (funnelLocalized) {
    translatedVisibleUi = 'full (funnelUiCopy/authUiCopy)';
    hreflang = 'none (noindex funnel)';
    inSitemap = 'excluded';
  } else if (base.routeType === 'B') {
    translatedVisibleUi = 'EN body; partial hub chrome on ES/FR hubs only';
    hreflang = 'EN only';
    inSitemap = 'EN sitemap buckets only';
  } else if (base.englishStatus === 'live' && base.routeType === 'A') {
    translatedVisibleUi = base.route.includes('trust') ? 'full' : 'EN only';
  }

  return {
    ...base,
    esExists,
    frExists,
    hreflang,
    inSitemap,
    translatedVisibleUi
  };
}

function csvEscape(value: string | boolean): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeRouteInventory(): void {
  const rows = ROUTE_INVENTORY.map(enrichRow);
  const header = [
    'route',
    'file',
    'route_type',
    'route_type_label',
    'english_status',
    'es_route_exists',
    'fr_route_exists',
    'same_production_template',
    'translated_visible_ui',
    'language_switcher',
    'localized_links',
    'index_noindex',
    'in_sitemap',
    'hreflang',
    'db_backed',
    'risk_level',
    'recommended_action'
  ].join(',');

  const csv = [
    header,
    ...rows.map((r) =>
      [
        r.route,
        r.file,
        r.routeType,
        r.routeTypeLabel,
        r.englishStatus,
        r.esExists,
        r.frExists,
        r.sameTemplate,
        r.translatedVisibleUi,
        r.languageSwitcher,
        r.localizedLinks,
        r.indexPolicy,
        r.inSitemap,
        r.hreflang,
        r.dbBacked,
        r.risk,
        r.recommendedAction
      ]
        .map(csvEscape)
        .join(',')
    )
  ].join('\n');

  writeFileSync(
    join(REPORT_DIR, `i18n-full-route-translation-inventory-${DATE}.csv`),
    csv,
    'utf8'
  );

  const md = [
    `# Full route translation inventory (${DATE})`,
    '',
    'Generated by `scripts/i18n-full-audit-inventory.ts`. Audit-only; no product changes.',
    '',
    `| Route | Type | File | EN | ES | FR | Template | UI | Switcher | Links | Index | Sitemap | Hreflang | DB | Risk | Action |`,
    `| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`,
    ...rows.map(
      (r) =>
        `| ${r.route} | ${r.routeType} | ${r.file.replace(/\|/g, '\\|')} | ${r.englishStatus} | ${r.esExists ? '✅' : '❌'} | ${r.frExists ? '✅' : '❌'} | ${r.sameTemplate} | ${r.translatedVisibleUi} | ${r.languageSwitcher} | ${r.localizedLinks} | ${r.indexPolicy} | ${r.inSitemap} | ${r.hreflang} | ${r.dbBacked ? 'yes' : 'no'} | ${r.risk} | ${r.recommendedAction} |`
    )
  ].join('\n');

  writeFileSync(
    join(REPORT_DIR, `i18n-full-route-translation-inventory-${DATE}.md`),
    md,
    'utf8'
  );
}

type SeoCoverageRow = {
  canonicalPath: string;
  group: string;
  enUrl: string;
  esUrl: string;
  frUrl: string;
  esPublished: boolean;
  frPublished: boolean;
  indexable: boolean;
  inEnSitemap: string;
  inEsSitemap: boolean;
  inFrSitemap: boolean;
  hreflangComplete: boolean;
  notes: string;
};

function classifyPath(path: string): string {
  if (path === '/subscription') return 'funnel-pricing';
  if (
    ['/get-scholarships', '/signin'].some((p) => path.startsWith(p))
  )
    return 'funnel-noindex';
  if (path.startsWith('/essays/')) return 'static-essay-guide';
  if (path.startsWith('/resources/')) return 'static-resource-guide';
  if (path.startsWith('/compare/')) return 'static-compare-guide';
  if (
    [
      '/terms',
      '/privacy-policy',
      '/refund-policy',
      '/help',
      '/faq'
    ].includes(path)
  )
    return 'legal-help';
  if (
    ['/international-students', '/for-organizations', '/submit-grant'].includes(
      path
    )
  )
    return 'marketing';
  if (
    [
      '/about',
      '/editorial-policy',
      '/scholarship-verification-methodology',
      '/how-we-rank-scholarships',
      '/how-scholarshiptop-works',
      '/financial-aid-disclaimer',
      '/contact',
      '/corrections',
      '/scholarship-scam-warning',
      '/how-we-make-money'
    ].includes(path)
  )
    return 'trust';
  if (
    ['/', '/scholarships', '/essays', '/providers', '/compare', '/resources'].includes(
      path
    )
  )
    return 'hub';
  return 'other';
}

function writeSeoCoverage(): void {
  const pilotPages = listLocalizedPilotPages();
  const esSet = new Set(
    pilotPages.filter((p) => p.locale === 'es').map((p) => p.canonicalPath)
  );
  const frSet = new Set(
    pilotPages.filter((p) => p.locale === 'fr').map((p) => p.canonicalPath)
  );

  const subscriptionPaths = [SUBSCRIPTION_CANONICAL_PATH];
  const funnelPaths = [
    '/get-scholarships',
    '/signin',
    '/signin/password_signin',
    '/signin/email_signin',
    '/signin/forgot_password',
    '/signin/signup'
  ];

  const allCanonical = [
    ...STAGE2_PILOT_CANONICAL_PATHS,
    ...subscriptionPaths,
    ...funnelPaths
  ];

  const uniqueCanonical = [...new Set(allCanonical)];

  const rows: SeoCoverageRow[] = uniqueCanonical.map((canonicalPath) => {
    const esPublished = esSet.has(canonicalPath);
    const frPublished = frSet.has(canonicalPath);
    const isSubscription = canonicalPath === '/subscription';
    const isFunnel = funnelPaths.some((p) => canonicalPath.startsWith(p));

    const decisionEs = esPublished
      ? getTranslatedPageSeoDecision({
          locale: 'es',
          canonicalPath,
          sourceIndexable: true,
          translationStatus: 'published',
          qualityScore: getLocalizedPilotPage('es', canonicalPath)?.qualityScore ?? 90,
          hasLocalizedTitle: true,
          hasLocalizedH1: true,
          hasLocalizedBody: true,
          hasMixedLanguageRisk: false
        })
      : null;

    const locales = isSubscription
      ? (['en', 'es', 'fr'] as const)
      : availableLocalesForPilotPath(canonicalPath);

    const hreflangComplete =
      isSubscription || (locales.includes('es') && locales.includes('fr'));

    return {
      canonicalPath,
      group: isSubscription
        ? 'funnel-pricing'
        : isFunnel
          ? 'funnel-noindex'
          : classifyPath(canonicalPath),
      enUrl: canonicalPath === '/' ? 'https://scholarshiptop.com/' : `https://scholarshiptop.com${canonicalPath}`,
      esUrl: esPublished || isSubscription
        ? `https://scholarshiptop.com/es${canonicalPath === '/' ? '' : canonicalPath}`
        : '',
      frUrl: frPublished || isSubscription
        ? `https://scholarshiptop.com/fr${canonicalPath === '/' ? '' : canonicalPath}`
        : '',
      esPublished: esPublished || isSubscription,
      frPublished: frPublished || isSubscription,
      indexable: !isFunnel,
      inEnSitemap: isFunnel
        ? 'excluded'
        : isSubscription
          ? 'excluded (unchanged)'
          : 'core/resources/essays/compare bucket',
      inEsSitemap: esPublished && (decisionEs?.includeInSitemap ?? false),
      inFrSitemap: frPublished,
      hreflangComplete,
      notes: isFunnel
        ? 'noindex,follow; not in localized sitemap'
        : isSubscription
          ? 'indexable; UI localized; not in sitemap'
          : esPublished && frPublished
            ? 'pilot static published'
            : 'missing translation'
    };
  });

  const header = [
    'canonical_path',
    'group',
    'en_url',
    'es_url',
    'fr_url',
    'es_published',
    'fr_published',
    'indexable',
    'en_sitemap',
    'es_sitemap',
    'fr_sitemap',
    'hreflang_complete',
    'notes'
  ].join(',');

  const csv = [
    header,
    ...rows.map((r) =>
      Object.values(r)
        .map((v) => csvEscape(String(v)))
        .join(',')
    )
  ].join('\n');

  writeFileSync(
    join(REPORT_DIR, `i18n-es-fr-seo-coverage-${DATE}.csv`),
    csv,
    'utf8'
  );

  const pilotCount = STAGE2_PILOT_CANONICAL_PATHS.length;
  const esCount = listLocalizedPilotPages({ locale: 'es' }).length;
  const frCount = listLocalizedPilotPages({ locale: 'fr' }).length;

  const md = [
    `# ES/FR SEO coverage report (${DATE})`,
    '',
    'Generated by `scripts/i18n-full-audit-inventory.ts`.',
    '',
    '## Counts',
    '',
    `| Metric | Value |`,
    `| --- | ---: |`,
    `| English pilot canonical paths | ${pilotCount} |`,
    `| ES published pilot URLs | ${esCount} |`,
    `| FR published pilot URLs | ${frCount} |`,
    `| ES+FR pilot URL pairs | ${esCount + frCount} (${esCount} + ${frCount}) |`,
    `| Funnel paths (noindex) | ${funnelPaths.length} + subscription |`,
    `| English DB long-tail (not translated) | ~39k+ sitemap URLs (see multilingual-implementation-map) |`,
    '',
    '## Coverage by group',
    '',
    ...['hub', 'trust', 'legal-help', 'marketing', 'static-essay-guide', 'static-resource-guide', 'static-compare-guide', 'funnel-pricing', 'funnel-noindex'].map(
      (group) => {
        const groupRows = rows.filter((r) => r.group === group);
        const translated = groupRows.filter((r) => r.esPublished && r.frPublished).length;
        return `- **${group}**: ${translated}/${groupRows.length} paths with ES+FR`;
      }
    ),
    '',
    '## Detail table',
    '',
    `| Path | Group | ES | FR | Index | ES sitemap | FR sitemap | Hreflang | Notes |`,
    `| --- | --- | --- | --- | --- | --- | --- | --- | --- |`,
    ...rows.map(
      (r) =>
        `| ${r.canonicalPath} | ${r.group} | ${r.esPublished ? '✅' : '❌'} | ${r.frPublished ? '✅' : '❌'} | ${r.indexable ? 'index' : 'noindex'} | ${r.inEsSitemap ? '✅' : '❌'} | ${r.inFrSitemap ? '✅' : '❌'} | ${r.hreflangComplete ? '✅' : '❌'} | ${r.notes} |`
    )
  ].join('\n');

  writeFileSync(
    join(REPORT_DIR, `i18n-es-fr-seo-coverage-${DATE}.md`),
    md,
    'utf8'
  );
}

function main(): void {
  mkdirSync(REPORT_DIR, { recursive: true });
  writeRouteInventory();
  writeSeoCoverage();
  console.log('Wrote route inventory and SEO coverage reports to reports/seo/');
  console.log(
    `Pilot pages: ${listLocalizedPilotPages().length} total (${STAGE2_PILOT_LOCALES.join(', ')})`
  );
}

main();
