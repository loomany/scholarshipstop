/**
 * Stage 2 ES/FR internal link audit + navbar click smoke tests.
 * Usage: SCREENSHOT_BASE_URL=http://localhost:3000 npx tsx scripts/i18n-locale-link-audit.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import {
  isExplicitEnglishOnlyInternalLink,
  isLocalizedFunnelPath,
  localizedPilotHref,
  localizedPilotHrefWithEnglishFallback
} from '../lib/i18n/localizedHref';
import {
  isStage2PilotCanonicalPath,
  STAGE2_PILOT_CANONICAL_PATHS,
  type Stage2PilotLocale
} from '../lib/i18n/pilotRoutes';
import {
  availableLocalesForPilotPath,
  getLocalizedPilotPage
} from '../lib/i18n/staticTranslations';
import { normalizeCanonicalPath, stripLocalePrefix } from '../lib/i18n/paths';

const BASE = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:3000';
/** Set `LINK_AUDIT_CLICKS_ONLY=1` to skip the 106-page crawl (faster iteration on nav/footer clicks). */
const CLICKS_ONLY = process.env.LINK_AUDIT_CLICKS_ONLY === '1';
const OUT_JSON = join(
  process.cwd(),
  'reports/seo/i18n-locale-link-audit-2026-05-19.json'
);
const OUT_MD = join(
  process.cwd(),
  'reports/seo/i18n-locale-link-audit-2026-05-19.md'
);

const PILOT_HUBS = new Set([
  '/',
  '/scholarships',
  '/essays',
  '/providers',
  '/compare',
  '/resources'
]);

/** Hub tab subpaths under `/scholarships/hub/*` must be locale-prefixed on ES/FR. */
function isPilotHubTabPath(path: string): boolean {
  return /^\/scholarships\/hub\/[^/]+$/.test(path);
}

/**
 * Path is a published static/pilot route on this locale (must be linked locale-prefixed).
 * Includes `/scholarships/hub/*` tabs, since locale catch-all `[locale]/scholarships/[[...slugPath]]`
 * serves them.
 */
function isLocalizedStaticTarget(
  locale: Stage2PilotLocale,
  canonical: string
): boolean {
  if (isStage2PilotCanonicalPath(canonical) && getLocalizedPilotPage(locale, canonical)) {
    return true;
  }
  if (isPilotHubTabPath(canonical)) return true;
  if (isLocalizedFunnelPath(canonical)) return true;
  return false;
}

type LinkIssue = {
  href: string;
  text: string;
  issue: string;
  severity:
    | 'blocking'
    | 'allowed'
    | 'language-switcher'
    | 'cross-locale-switcher';
};

type ClickTest = {
  locale: Stage2PilotLocale;
  label: string;
  /** CSS selector used to find the clickable (for the report). */
  selector: string;
  expectedPath: string;
  pass: boolean;
  actualUrl?: string;
  error?: string;
};

type PageAudit = {
  url: string;
  locale: Stage2PilotLocale;
  canonicalPath: string;
  linkIssues: LinkIssue[];
  status: number | null;
  error?: string;
};

type AuditReport = {
  generatedAt: string;
  baseUrl: string;
  pageAudits: PageAudit[];
  clickTests: ClickTest[];
  summary: {
    pagesCrawled: number;
    blockingLinkIssues: number;
    allowedEnglishLinks: number;
    languageSwitcherLinks: number;
    crossLocaleSwitcherLinks: number;
    clickTestsPassed: number;
    clickTestsFailed: number;
  };
};

function canonicalFromHref(href: string): string {
  const raw = href.split(/[?#]/, 1)[0] ?? href;
  return stripLocalePrefix(normalizeCanonicalPath(raw));
}

function isUnsupportedLocaleHref(href: string): boolean {
  const path = normalizeCanonicalPath(href.split(/[?#]/, 1)[0] ?? href);
  return (
    path.startsWith('/en/') ||
    path === '/en' ||
    /^\/(de|pt|ar|zh-hans|hi|id|vi|ru)(\/|$)/i.test(path)
  );
}

function auditHref(
  href: string,
  locale: Stage2PilotLocale,
  text: string,
  currentPageCanonical: string | undefined,
  languageSwitcher: boolean
): LinkIssue | null {
  if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#') || href.startsWith('javascript:')) {
    return null;
  }
  if (isUnsupportedLocaleHref(href)) {
    return { href, text, issue: 'unsupported or /en locale in href', severity: 'blocking' };
  }

  const path = normalizeCanonicalPath(href.split(/[?#]/, 1)[0] ?? href);
  const prefix = `/${locale}`;
  const canonical = canonicalFromHref(href);

  if (languageSwitcher) {
    if (/^\/(es|fr)(\/|$)/.test(path) && !path.startsWith(prefix)) {
      return {
        href,
        text,
        issue: 'language switcher → other Stage 2 locale',
        severity: 'cross-locale-switcher'
      };
    }
    if (currentPageCanonical && canonical === currentPageCanonical && !path.startsWith(prefix)) {
      return {
        href,
        text,
        issue: 'language switcher → English canonical of current page',
        severity: 'language-switcher'
      };
    }
    /** Generic language-switcher anchor that points to a non-localized canonical (e.g. home). */
    if (!path.startsWith(prefix) && !/^\/(es|fr)(\/|$)/.test(path)) {
      return {
        href,
        text,
        issue: 'language switcher → English canonical',
        severity: 'language-switcher'
      };
    }
    return null;
  }

  if (currentPageCanonical && canonical === currentPageCanonical && !path.startsWith(prefix)) {
    return {
      href,
      text,
      issue: 'language switcher (EN) link to current page canonical',
      severity: 'allowed'
    };
  }

  // Already locale-prefixed (any locale) — accept.
  if (path === prefix || path.startsWith(`${prefix}/`)) {
    return null;
  }
  // Other Stage 2 locale prefix on a non-self page (e.g. /es link from /fr crawl) — accept,
  // language switcher legitimately links cross-locale.
  if (/^\/(es|fr)(\/|$)/.test(path)) {
    return null;
  }

  if (PILOT_HUBS.has(canonical)) {
    return {
      href,
      text,
      issue: `pilot hub ${canonical} missing ${prefix} prefix`,
      severity: 'blocking'
    };
  }

  if (isPilotHubTabPath(canonical)) {
    return {
      href,
      text,
      issue: `pilot hub tab ${canonical} missing ${prefix} prefix (localized wrapper exists)`,
      severity: 'blocking'
    };
  }

  if (isLocalizedFunnelPath(canonical)) {
    return {
      href,
      text,
      issue: `ES/FR links to English funnel ${canonical} — localized wrapper at ${prefix}${canonical} should be used`,
      severity: 'blocking'
    };
  }

  if (
    canonical === '/subscription' ||
    canonical === '/pricing' ||
    canonical.startsWith('/subscription/')
  ) {
    const localizedSubscription = `/${locale}/subscription`;
    if (locale !== 'en' && href === canonical) {
      return {
        href,
        text,
        issue: `ES/FR links to English subscription — use ${localizedSubscription}`,
        severity: 'blocking'
      };
    }
    return null;
  }

  if (isStage2PilotCanonicalPath(canonical) && getLocalizedPilotPage(locale, canonical)) {
    const available = availableLocalesForPilotPath(canonical);
    if (available.includes(locale)) {
      return {
        href,
        text,
        issue: `localized page exists at ${prefix}${canonical} but link points to ${canonical}`,
        severity: 'blocking'
      };
    }
  }

  if (isExplicitEnglishOnlyInternalLink(href)) {
    return {
      href,
      text,
      issue: 'allowed English-only (Zone C: DB/long-tail or product flow)',
      severity: 'allowed'
    };
  }

  return null;
}

async function collectLinkIssues(
  page: Page,
  locale: Stage2PilotLocale,
  canonicalPath: string
): Promise<LinkIssue[]> {
  const anchors = await page.$$eval('a[href]', (els) =>
    els.map((a) => {
      const el = a as HTMLAnchorElement;
      return {
        href: el.getAttribute('href') ?? '',
        text: (el.textContent ?? '').trim().slice(0, 80),
        languageSwitcher: !!el.closest('[data-language-switcher="true"]')
      };
    })
  );
  const issues: LinkIssue[] = [];
  for (const { href, text, languageSwitcher } of anchors) {
    const issue = auditHref(href, locale, text, canonicalPath, languageSwitcher);
    if (issue) issues.push(issue);
  }
  return issues;
}

async function auditPage(
  context: BrowserContext,
  locale: Stage2PilotLocale,
  canonicalPath: string,
  overridePath?: string
): Promise<PageAudit> {
  const path =
    overridePath ??
    (localizedPilotHref(locale, canonicalPath) ??
      localizedPilotHrefWithEnglishFallback(locale, canonicalPath));
  const url = `${BASE}${path}`;
  const page = await context.newPage();
  let status: number | null = null;
  try {
    const res = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000
    });
    status = res?.status() ?? null;
    /** Navbar is client-only (`ssr: false`); hub cards hydrate after listing payload. */
    await page
      .locator(`nav a[href^="/${locale}/"], nav a[href^="/${locale}"]`)
      .first()
      .waitFor({ state: 'attached', timeout: 20_000 })
      .catch(() => undefined);
    await page.waitForTimeout(2000);
    const linkIssues = await collectLinkIssues(page, locale, canonicalPath);
    await page.close();
    return { url, locale, canonicalPath, linkIssues, status };
  } catch (e) {
    await page.close().catch(() => {});
    return {
      url,
      locale,
      canonicalPath,
      linkIssues: [],
      status,
      error: e instanceof Error ? e.message : String(e)
    };
  }
}

type NavClick = { label: string; expectedPath: string };

const ES_NAV_CLICKS: NavClick[] = [
  { label: 'Buscar becas', expectedPath: '/es/scholarships' },
  { label: 'Proveedores', expectedPath: '/es/providers' },
  { label: 'Comparar', expectedPath: '/es/compare' },
  { label: 'Recursos', expectedPath: '/es/resources' },
  { label: 'Ensayos', expectedPath: '/es/essays' }
];

const FR_NAV_CLICKS: NavClick[] = [
  { label: 'Chercher des bourses', expectedPath: '/fr/scholarships' },
  { label: 'Fournisseurs', expectedPath: '/fr/providers' },
  { label: 'Comparer', expectedPath: '/fr/compare' },
  { label: 'Ressources', expectedPath: '/fr/resources' },
  { label: "Guides d'essai", expectedPath: '/fr/essays' }
];

const FOOTER_CLICKS: Record<Stage2PilotLocale, Array<{ label: string; path: string }>> = {
  es: [
    { label: 'About', path: '/es/about' },
    { label: 'Terms', path: '/es/terms' },
    { label: 'FAQ', path: '/es/faq' },
    { label: 'Privacy', path: '/es/privacy-policy' }
  ],
  fr: [
    { label: 'About', path: '/fr/about' },
    { label: 'Terms', path: '/fr/terms' },
    { label: 'FAQ', path: '/fr/faq' },
    { label: 'Privacy', path: '/fr/privacy-policy' }
  ]
};

/** Site chrome: `<nav>` (Navbar) is the sibling immediately before `<main id="skip">`. */
function topNavLinkLocator(page: Page, href: string) {
  return page
    .locator(`xpath=//main[@id="skip"]/preceding-sibling::nav[1]//a[@href="${href}"]`)
    .first();
}

async function runClickTests(
  locale: Stage2PilotLocale,
  startPath: string,
  navClicks: NavClick[]
): Promise<ClickTest[]> {
  const results: ClickTest[] = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  for (const nav of navClicks) {
    const selector = `xpath=//main[@id="skip"]/preceding-sibling::nav[1]//a[@href="${nav.expectedPath}"]`;
    try {
      await page.goto(`${BASE}${startPath}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      /** Navbar is `dynamic(..., { ssr: false })` — wait for client bundle + hydration. */
      const link = topNavLinkLocator(page, nav.expectedPath);
      await link.waitFor({ state: 'visible', timeout: 90_000 });
      await link.click();
      const expected = nav.expectedPath.replace(/\/$/, '') || '/';
      await page.waitForURL(
        (url) => {
          const p = url.pathname.replace(/\/$/, '') || '/';
          return p === expected || p.startsWith(`${expected}/hub/`);
        },
        { timeout: 30_000 }
      );
      const actualPath = new URL(page.url()).pathname.replace(/\/$/, '') || '/';
      const pass =
        actualPath === expected || actualPath.startsWith(`${expected}/hub/`);
      results.push({
        locale,
        label: nav.label,
        selector,
        expectedPath: expected,
        actualUrl: page.url(),
        pass
      });
    } catch (e) {
      results.push({
        locale,
        label: nav.label,
        selector,
        expectedPath: nav.expectedPath,
        pass: false,
        error: e instanceof Error ? e.message : String(e)
      });
    }
  }

  for (const footer of FOOTER_CLICKS[locale]) {
    const selector = `footer a[href="${footer.path}"]`;
    try {
      await page.goto(`${BASE}${startPath}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      await page.waitForSelector(selector, { state: 'visible', timeout: 90_000 });
      await page.locator(selector).first().click();
      await page.waitForURL(
        (url) => url.pathname.replace(/\/$/, '') === footer.path.replace(/\/$/, ''),
        { timeout: 30_000 }
      );
      const actualPath = new URL(page.url()).pathname.replace(/\/$/, '') || '/';
      const expected = footer.path.replace(/\/$/, '') || '/';
      results.push({
        locale,
        label: `Footer ${footer.label}`,
        selector,
        expectedPath: expected,
        actualUrl: page.url(),
        pass: actualPath === expected
      });
    } catch (e) {
      results.push({
        locale,
        label: `Footer ${footer.label}`,
        selector,
        pass: false,
        expectedPath: footer.path,
        error: e instanceof Error ? e.message : String(e)
      });
    }
  }

  await browser.close();
  return results;
}

/** Extra Zone B funnel/auth pages crawled beyond static pilot pages. */
const EXTRA_LOCALIZED_TARGETS: Array<{ canonical: string; pathTemplate: (loc: Stage2PilotLocale) => string }> = [
  { canonical: '/get-scholarships', pathTemplate: (loc) => `/${loc}/get-scholarships` },
  { canonical: '/signin', pathTemplate: (loc) => `/${loc}/signin` },
  { canonical: '/scholarships/hub/best-recommendation', pathTemplate: (loc) => `/${loc}/scholarships/hub/best-recommendation` },
  { canonical: '/scholarships/hub/matches', pathTemplate: (loc) => `/${loc}/scholarships/hub/matches` },
  { canonical: '/scholarships/hub/easy-apply', pathTemplate: (loc) => `/${loc}/scholarships/hub/easy-apply` },
  { canonical: '/scholarships/hub/international-friendly', pathTemplate: (loc) => `/${loc}/scholarships/hub/international-friendly` }
];

async function main() {
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });

  const pilotPaths = STAGE2_PILOT_CANONICAL_PATHS.filter((p) => {
    return getLocalizedPilotPage('es', p) && getLocalizedPilotPage('fr', p);
  });

  const pageAudits: PageAudit[] = [];
  let crawlBrowser: Browser | null = null;
  let crawlContext: BrowserContext | null = null;
  if (!CLICKS_ONLY) {
    crawlBrowser = await chromium.launch({ headless: true });
    crawlContext = await crawlBrowser.newContext();
    for (const locale of ['es', 'fr'] as const) {
      for (const canonicalPath of pilotPaths) {
        console.log(`Auditing ${locale} ${canonicalPath}...`);
        pageAudits.push(await auditPage(crawlContext, locale, canonicalPath));
      }
      for (const extra of EXTRA_LOCALIZED_TARGETS) {
        const overridePath = extra.pathTemplate(locale);
        console.log(`Auditing ${locale} ${extra.canonical} (extra)...`);
        pageAudits.push(await auditPage(crawlContext, locale, extra.canonical, overridePath));
      }
    }
    await crawlContext.close();
    await crawlBrowser.close();
  } else {
    console.log('LINK_AUDIT_CLICKS_ONLY=1 — skipping page crawl');
    if (existsSync(OUT_JSON)) {
      try {
        const prior = JSON.parse(readFileSync(OUT_JSON, 'utf8')) as {
          pageAudits?: PageAudit[];
        };
        if (Array.isArray(prior.pageAudits)) {
          pageAudits.push(...prior.pageAudits);
        }
      } catch {
        /* use empty */
      }
    }
  }

  const clickTests: ClickTest[] = [
    ...(await runClickTests('es', '/es', ES_NAV_CLICKS)),
    ...(await runClickTests('fr', '/fr', FR_NAV_CLICKS))
  ];

  const pricingVisibleEs = await (async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`${BASE}/es`, { waitUntil: 'domcontentloaded' });
    const visible = await page
      .locator(
        'nav a[href="/subscription"], nav a[href="/es/subscription"], nav a[href="/fr/subscription"]'
      )
      .first()
      .isVisible()
      .catch(() => false);
    await browser.close();
    return visible;
  })();

  const blockingLinkIssues = pageAudits.flatMap((p) =>
    p.linkIssues.filter((i) => i.severity === 'blocking')
  );
  const allowedEnglish = pageAudits.flatMap((p) =>
    p.linkIssues.filter((i) => i.severity === 'allowed')
  );
  const languageSwitcher = pageAudits.flatMap((p) =>
    p.linkIssues.filter((i) => i.severity === 'language-switcher')
  );
  const crossLocaleSwitcher = pageAudits.flatMap((p) =>
    p.linkIssues.filter((i) => i.severity === 'cross-locale-switcher')
  );

  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    pageAudits,
    clickTests,
    summary: {
      pagesCrawled: pageAudits.length,
      blockingLinkIssues: blockingLinkIssues.length,
      allowedEnglishLinks: allowedEnglish.length,
      languageSwitcherLinks: languageSwitcher.length,
      crossLocaleSwitcherLinks: crossLocaleSwitcher.length,
      clickTestsPassed: clickTests.filter((t) => t.pass).length,
      clickTestsFailed: clickTests.filter((t) => !t.pass).length
    }
  };

  writeFileSync(OUT_JSON, JSON.stringify({ ...report, pricingVisibleOnEsNav: pricingVisibleEs }, null, 2));

  const blockingByPage = new Map<string, LinkIssue[]>();
  for (const audit of pageAudits) {
    const blocking = audit.linkIssues.filter((i) => i.severity === 'blocking');
    if (blocking.length > 0) blockingByPage.set(`${audit.locale} ${audit.url}`, blocking);
  }

  const blockingByIssue = new Map<string, number>();
  for (const issue of blockingLinkIssues) {
    const key = issue.issue.replace(/`[^`]+`/g, '`X`').replace(/ at \/[a-z\-]+/, '');
    blockingByIssue.set(key, (blockingByIssue.get(key) ?? 0) + 1);
  }
  const byIssueSorted = [...blockingByIssue.entries()].sort((a, b) => b[1] - a[1]);

  const md = [
    '# Stage 2 locale link audit',
    '',
    `Generated: ${report.generatedAt}`,
    `Base URL: ${BASE}`,
    `Mode: ${CLICKS_ONLY ? 'clicks-only' : 'full crawl'}`,
    '',
    '## Summary',
    '',
    `- Pages crawled: ${report.summary.pagesCrawled}`,
    `- Total links scanned: ${pageAudits.reduce((acc, p) => acc + p.linkIssues.length, 0)} (issues only)`,
    `- Blocking link issues: ${report.summary.blockingLinkIssues}`,
    `- Allowed explicit English (Zone C: DB/long-tail / product flow): ${report.summary.allowedEnglishLinks}`,
    `- Language-switcher cross-locale links (informational): ${report.summary.languageSwitcherLinks + report.summary.crossLocaleSwitcherLinks}`,
    `  - to other Stage 2 locale (es ↔ fr): ${report.summary.crossLocaleSwitcherLinks}`,
    `  - to English canonical (current page / home): ${report.summary.languageSwitcherLinks}`,
    `- Click tests passed: ${report.summary.clickTestsPassed}`,
    `- Click tests failed: ${report.summary.clickTestsFailed}`,
    `- Pricing visible on /es nav: ${pricingVisibleEs ? 'yes (unexpected)' : 'no (expected)'}`,
    '',
    '## Blocking by category',
    '',
    ...byIssueSorted.map(([k, v]) => `- ${v} × ${k}`),
    '',
    '## Blocking by page (top 30)',
    '',
    ...[...blockingByPage.entries()].slice(0, 30).map(
      ([page, issues]) => `### ${page}\n${issues.slice(0, 8).map((i) => `- \`${i.href}\` — ${i.issue} (${i.text || 'no text'})`).join('\n')}`
    ),
    '',
    '## Blocking links (first 40)',
    '',
    ...blockingLinkIssues.slice(0, 40).map(
      (i) => `- \`${i.href}\` — ${i.issue} (${i.text || 'no text'})`
    ),
    '',
    '## Click tests',
    '',
    ...clickTests.map(
      (t) =>
        `- [${t.pass ? 'x' : ' '}] ${t.locale} ${t.label} → expected \`${t.expectedPath}\`${t.actualUrl ? ` got \`${new URL(t.actualUrl).pathname}\`` : ''}${t.selector ? ` (\`${t.selector}\`)` : ''}${t.error ? ` — ${t.error.slice(0, 140)}` : ''}`
    )
  ].join('\n');

  writeFileSync(OUT_MD, md);
  console.log(JSON.stringify(report.summary, null, 2));
  if (report.summary.blockingLinkIssues > 0 || report.summary.clickTestsFailed > 0) {
    process.exitCode = 1;
  }
}

void main();
