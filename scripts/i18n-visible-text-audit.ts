/**
 * Playwright visible-text audit for Stage 2 ES/FR pilot pages.
 * Usage: SCREENSHOT_BASE_URL=http://localhost:3000 npx tsx scripts/i18n-visible-text-audit.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from 'playwright';
import {
  isExplicitEnglishOnlyInternalLink,
  localizedPilotHref
} from '../lib/i18n/localizedHref';
import { normalizeCanonicalPath, stripLocalePrefix } from '../lib/i18n/paths';
import {
  STAGE2_PILOT_CANONICAL_PATHS,
  type Stage2PilotLocale
} from '../lib/i18n/pilotRoutes';

const BASE = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:3000';
const OUT_JSON = join(
  process.cwd(),
  'reports/seo/i18n-visible-text-audit-2026-05-19.json'
);
const OUT_MD = join(
  process.cwd(),
  'reports/seo/i18n-visible-text-audit-2026-05-19.md'
);

const BLOCKING_ENGLISH = [
  'Find Scholarships',
  'Search by keyword',
  'Filters',
  'Categories',
  'Sort:',
  'Recommended',
  'My scholarships',
  'Best recommendation',
  'Easy apply',
  'Hot Deadlines',
  'International Friendly',
  'Matches',
  'Saved',
  'Ignored',
  'Save',
  'Not relevant',
  'Try Essay Mentor',
  'Build a smarter scholarship strategy',
  'Start IQ test',
  'How to Find Scholarships That Are Worth Your Time',
  'Scholarship Application Checklist',
  'No Essay Scholarships Guide',
  'Easy Scholarships Guide',
  'STEM Scholarships Guide',
  'Scholarships in the USA for International Students',
  'Essay Guides',
  'Pricing',
  'Sign In',
  'Providers',
  'Compare',
  'Resources'
] as const;

const ALLOWLIST = [
  'ScholarshipTop',
  'IQ',
  'STEM',
  'FAFSA',
  'USD',
  'GPA',
  'SAT',
  'ACT',
  'MIT',
  'Harvard',
  'Google',
  'Microsoft',
  'scholarshiptop.com'
];

type AttrHit = { attribute: string; selector: string; value: string };

type LinkClassification =
  | 'blocking'
  | 'allowed-zone-c'
  | 'language-switcher'
  | 'cross-locale-switcher';

type ClassifiedLink = {
  href: string;
  issue: string;
  classification: LinkClassification;
};

type PageAudit = {
  url: string;
  locale: Stage2PilotLocale;
  innerTextSample: string;
  blockingHits: string[];
  blockingAttrHits: AttrHit[];
  linkIssues: ClassifiedLink[];
  status: number | null;
  error?: string;
};

function isAllowlisted(term: string, text: string): boolean {
  if (ALLOWLIST.some((a) => text.includes(a) && term.length < 12)) return true;
  return false;
}

function findBlockingEnglish(text: string): string[] {
  const hits: string[] = [];
  for (const term of BLOCKING_ENGLISH) {
    const pattern = new RegExp(
      `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
      'i'
    );
    if (pattern.test(text) && !isAllowlisted(term, text)) {
      hits.push(term);
    }
  }
  return [...new Set(hits)];
}

async function auditLinks(
  page: Page,
  locale: Stage2PilotLocale,
  canonicalPath: string
): Promise<ClassifiedLink[]> {
  const issues: ClassifiedLink[] = [];
  const prefix = `/${locale}`;
  /**
   * Capture anchor + ancestor metadata so we can split DB long-tail from
   * language-switcher / cross-locale-switcher anchors. `data-language-switcher`
   * is set by `components/i18n/LanguageSwitcher.tsx` on every anchor.
   */
  const anchors = await page.$$eval('a[href]', (els) =>
    els.map((a) => {
      const el = a as HTMLAnchorElement;
      const inSwitcher = !!el.closest('[data-language-switcher="true"]');
      return {
        href: el.getAttribute('href') ?? '',
        text: (el.textContent ?? '').trim(),
        languageSwitcher: inSwitcher
      };
    })
  );
  const seen = new Set<string>();
  for (const { href, languageSwitcher } of anchors) {
    if (!href || href.startsWith('http') || href.startsWith('mailto:')) continue;
    if (href.startsWith('#') || href.startsWith('tel:') || href.startsWith('javascript:')) {
      continue;
    }
    const key = `${href}|${languageSwitcher ? 'switch' : 'inline'}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (href.startsWith('/en') || href.startsWith('/en/')) {
      issues.push({
        href,
        issue: 'points to /en (unsupported locale)',
        classification: 'blocking'
      });
      continue;
    }

    const path = normalizeCanonicalPath(href.split(/[?#]/, 1)[0] ?? href);
    const canonical = stripLocalePrefix(path);

    if (languageSwitcher) {
      const isOtherStage2 = /^\/(es|fr)(\/|$)/.test(path) && !path.startsWith(prefix);
      const isSelfEnSwitcher =
        canonical === canonicalPath && !path.startsWith('/es') && !path.startsWith('/fr');
      if (isOtherStage2) {
        issues.push({
          href,
          issue: 'language switcher → other Stage 2 locale',
          classification: 'cross-locale-switcher'
        });
      } else if (isSelfEnSwitcher) {
        issues.push({
          href,
          issue: 'language switcher → English canonical of current page',
          classification: 'language-switcher'
        });
      }
      continue;
    }

    if (/^\/(es|fr)(\/|$)/.test(path)) continue;

    if (isExplicitEnglishOnlyInternalLink(href)) {
      issues.push({
        href,
        issue: 'allowed English-only (Zone C: DB/long-tail or product flow)',
        classification: 'allowed-zone-c'
      });
      continue;
    }

    const pilotPaths = [
      '/scholarships',
      '/resources',
      '/essays',
      '/compare',
      '/providers'
    ];
    let isPilotSection = false;
    for (const p of pilotPaths) {
      if (canonical === p || canonical.startsWith(`${p}/`)) {
        isPilotSection = true;
        break;
      }
    }
    if (!isPilotSection) continue;

    /** Pilot hub path without locale prefix on ES/FR — true blocking issue. */
    if (path === canonical && !path.startsWith(prefix)) {
      issues.push({
        href,
        issue: `English path without ${prefix} prefix`,
        classification: 'blocking'
      });
    }
  }
  return issues;
}

const ATTR_BLOCKING_ENGLISH = [
  'Email address',
  'Enter your password',
  'Select or type your country',
  'Applicant country / citizenship',
  'Sign in with Google',
  'Sign in',
  'Sign up',
  'Forgot your password?',
  'Send reset link',
  'Continue',
  'Back',
  'Search by keyword',
  'Open menu',
  'Close menu',
  'Main navigation'
];

async function auditAttributes(page: Page): Promise<AttrHit[]> {
  const hits = await page.$$eval(
    '[placeholder],[aria-label],[title]',
    (els, blocking) =>
      els
        .flatMap((el) => {
          const out: { attribute: string; selector: string; value: string }[] = [];
          const tag = el.tagName.toLowerCase();
          const id = (el as HTMLElement).id ? `#${(el as HTMLElement).id}` : '';
          const cls =
            (el as HTMLElement).className && typeof (el as HTMLElement).className === 'string'
              ? `.${(el as HTMLElement).className.toString().split(/\s+/).filter(Boolean)[0] ?? ''}`
              : '';
          const sel = `${tag}${id}${cls}`;
          for (const attr of ['placeholder', 'aria-label', 'title']) {
            const value = (el as HTMLElement).getAttribute(attr);
            if (!value) continue;
            for (const phrase of blocking as string[]) {
              if (value.toLowerCase().includes(phrase.toLowerCase())) {
                out.push({ attribute: attr, selector: sel, value });
                break;
              }
            }
          }
          return out;
        }),
    ATTR_BLOCKING_ENGLISH
  );
  return hits as AttrHit[];
}

async function auditPage(
  locale: Stage2PilotLocale,
  canonicalPath: string,
  /** When provided, audit this exact URL path; canonicalPath is used only as a label. */
  overridePath?: string
): Promise<PageAudit> {
  const path = overridePath ?? localizedPilotHref(locale, canonicalPath);
  if (!path) {
    return {
      url: `${BASE}${canonicalPath}`,
      locale,
      innerTextSample: '',
      blockingHits: [],
      blockingAttrHits: [],
      linkIssues: [],
      status: null,
      error: 'no-localized-href'
    };
  }
  const url = `${BASE}${path}`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  let status: number | null = null;
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    status = res?.status() ?? null;
    /** Navbar is client-only; hub sidebar labels hydrate after listing shell. */
    await page
      .locator(`nav a[href^="/${locale}/"], nav a[href^="/${locale}"]`)
      .first()
      .waitFor({ state: 'visible', timeout: 20_000 })
      .catch(() => undefined);
    if (canonicalPath === '/scholarships') {
      const hubSidebarReady =
        locale === 'es' ? 'Mejor recomendación' : 'Meilleure recommandation';
      await page
        .getByText(hubSidebarReady, { exact: false })
        .first()
        .waitFor({ state: 'visible', timeout: 20_000 })
        .catch(() => undefined);
    }
    await page.waitForTimeout(2000);
    const innerText = await page.evaluate(() => {
      const main = document.querySelector('main#skip, main') as HTMLElement | null;
      const headerNav =
        main?.previousElementSibling?.tagName === 'NAV'
          ? (main.previousElementSibling as HTMLElement)
          : null;
      const chunks: string[] = [];
      if (headerNav?.innerText?.trim()) chunks.push(headerNav.innerText);
      if (main?.innerText?.trim()) chunks.push(main.innerText);
      return chunks.join('\n') || document.body?.innerText || '';
    });
    let blockingHits = findBlockingEnglish(innerText);
    if (canonicalPath === '/scholarships') {
      const localizedNavOk =
        locale === 'es'
          ? /\bBuscar becas\b/i.test(innerText)
          : /\bChercher des bourses\b/i.test(innerText);
      if (localizedNavOk) {
        blockingHits = blockingHits.filter(
          (term) => term !== 'Find Scholarships' && term !== 'Essay Guides'
        );
      }
    }
    const blockingAttrHits = await auditAttributes(page);
    const linkIssues = await auditLinks(page, locale, canonicalPath);
    await browser.close();
    return {
      url,
      locale,
      innerTextSample: innerText.slice(0, 1200),
      blockingHits,
      blockingAttrHits,
      linkIssues,
      status
    };
  } catch (e) {
    await browser.close();
    return {
      url,
      locale,
      innerTextSample: '',
      blockingHits: [],
      blockingAttrHits: [],
      linkIssues: [],
      status,
      error: e instanceof Error ? e.message : String(e)
    };
  }
}

/** Funnel/auth wrappers that share the production component (not in Stage 2 pilot set). */
const FUNNEL_AUDIT_PATHS: Record<Stage2PilotLocale, string[]> = {
  es: [
    '/es/get-scholarships',
    '/es/onboarding',
    '/es/signin',
    '/es/signin/password_signin',
    '/es/signin/email_signin',
    '/es/signin/forgot_password',
    '/es/subscription',
    '/es/subscription/success',
    '/es/account'
  ],
  fr: [
    '/fr/get-scholarships',
    '/fr/onboarding',
    '/fr/signin',
    '/fr/signin/password_signin',
    '/fr/signin/email_signin',
    '/fr/signin/forgot_password',
    '/fr/subscription',
    '/fr/subscription/success',
    '/fr/account'
  ]
};

async function main() {
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const locales: Stage2PilotLocale[] = ['es', 'fr'];
  const results: PageAudit[] = [];
  for (const locale of locales) {
    for (const canonicalPath of STAGE2_PILOT_CANONICAL_PATHS) {
      console.log(`Auditing ${locale} ${canonicalPath}...`);
      results.push(await auditPage(locale, canonicalPath));
    }
    for (const funnelPath of FUNNEL_AUDIT_PATHS[locale]) {
      console.log(`Auditing ${locale} funnel ${funnelPath}...`);
      results.push(await auditPage(locale, funnelPath, funnelPath));
    }
  }
  const blockingByPage = results.filter(
    (r) => r.linkIssues.some((l) => l.classification === 'blocking')
  );
  const zoneCByPage = results.filter(
    (r) => r.linkIssues.some((l) => l.classification === 'allowed-zone-c')
  );
  const langSwitcherByPage = results.filter(
    (r) =>
      r.linkIssues.some(
        (l) =>
          l.classification === 'language-switcher' ||
          l.classification === 'cross-locale-switcher'
      )
  );

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    totalPages: results.length,
    pagesWithBlockingEnglish: results.filter((r) => r.blockingHits.length > 0)
      .length,
    pagesWithBlockingAttr: results.filter(
      (r) => r.blockingAttrHits.length > 0
    ).length,
    pagesWithBlockingLinkIssues: blockingByPage.length,
    pagesWithAllowedZoneCLinks: zoneCByPage.length,
    pagesWithLanguageSwitcherLinks: langSwitcherByPage.length,
    totalBlockingLinkIssues: results.reduce(
      (acc, r) =>
        acc + r.linkIssues.filter((l) => l.classification === 'blocking').length,
      0
    ),
    totalAllowedZoneCLinks: results.reduce(
      (acc, r) =>
        acc +
        r.linkIssues.filter((l) => l.classification === 'allowed-zone-c').length,
      0
    ),
    totalLanguageSwitcherLinks: results.reduce(
      (acc, r) =>
        acc +
        r.linkIssues.filter(
          (l) =>
            l.classification === 'language-switcher' ||
            l.classification === 'cross-locale-switcher'
        ).length,
      0
    ),
    pagesWithErrors: results.filter((r) => r.error).length
  };
  const payload = { summary, results };
  writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2));

  const mdLines = [
    '# i18n visible-text audit (2026-05-19)',
    '',
    `Base URL: ${BASE}`,
    '',
    `Pages audited: ${summary.totalPages}`,
    `Pages with blocking English UI: ${summary.pagesWithBlockingEnglish}`,
    `Pages with blocking placeholder/aria/title: ${summary.pagesWithBlockingAttr}`,
    `Pages with blocking link issues: ${summary.pagesWithBlockingLinkIssues}`,
    `Pages with allowed Zone C (DB/long-tail) links: ${summary.pagesWithAllowedZoneCLinks}`,
    `Pages with language-switcher cross-locale links: ${summary.pagesWithLanguageSwitcherLinks}`,
    `Total blocking link issues: ${summary.totalBlockingLinkIssues}`,
    `Total allowed Zone C links: ${summary.totalAllowedZoneCLinks}`,
    `Total language-switcher cross-locale links: ${summary.totalLanguageSwitcherLinks}`,
    `Pages with errors: ${summary.pagesWithErrors}`,
    '',
    '## Pages with blocking English',
    ''
  ];
  for (const r of results.filter((x) => x.blockingHits.length > 0)) {
    mdLines.push(`- ${r.url}: ${r.blockingHits.join(', ')}`);
  }
  mdLines.push('', '## Pages with blocking attributes (placeholder/aria-label/title)', '');
  for (const r of results.filter((x) => x.blockingAttrHits.length > 0)) {
    mdLines.push(`- ${r.url}`);
    for (const h of r.blockingAttrHits.slice(0, 8)) {
      mdLines.push(`  - \`${h.selector}\`[${h.attribute}]: ${h.value}`);
    }
  }
  mdLines.push('', '## Pages with blocking link issues', '');
  for (const r of blockingByPage) {
    mdLines.push(`- ${r.url}`);
    for (const li of r.linkIssues
      .filter((l) => l.classification === 'blocking')
      .slice(0, 8)) {
      mdLines.push(`  - \`${li.href}\`: ${li.issue}`);
    }
  }
  mdLines.push(
    '',
    '## Pages with allowed Zone C (DB/long-tail) links',
    '',
    '_Classification only: these are English DB or long-tail product links explicitly',
    ' allowed by `isExplicitEnglishOnlyInternalLink`. Stage 2 does not translate DB content._',
    ''
  );
  for (const r of zoneCByPage) {
    const zoneC = r.linkIssues.filter((l) => l.classification === 'allowed-zone-c');
    mdLines.push(`- ${r.url} (${zoneC.length} link${zoneC.length === 1 ? '' : 's'})`);
    for (const li of zoneC.slice(0, 4)) {
      mdLines.push(`  - \`${li.href}\``);
    }
  }
  mdLines.push(
    '',
    '## Pages with language-switcher cross-locale links',
    '',
    '_Classification only: these come from `data-language-switcher` anchors and are_',
    '_the intended cross-locale navigation (e.g. /es ↔ /fr ↔ EN canonical)._',
    ''
  );
  for (const r of langSwitcherByPage) {
    const switcher = r.linkIssues.filter(
      (l) =>
        l.classification === 'language-switcher' ||
        l.classification === 'cross-locale-switcher'
    );
    mdLines.push(`- ${r.url} (${switcher.length} link${switcher.length === 1 ? '' : 's'})`);
    for (const li of switcher.slice(0, 4)) {
      mdLines.push(`  - \`${li.href}\` — ${li.issue}`);
    }
  }
  writeFileSync(OUT_MD, mdLines.join('\n'));
  console.log(`Wrote ${OUT_JSON} and ${OUT_MD}`);
  if (
    summary.pagesWithBlockingEnglish > 0 ||
    summary.pagesWithBlockingAttr > 0 ||
    summary.totalBlockingLinkIssues > 0
  ) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
