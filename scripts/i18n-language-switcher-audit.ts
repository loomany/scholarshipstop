/**
 * Playwright language-switcher parity audit for Stage 2 ES/FR rollout.
 *
 * For every page in `SWITCHER_TARGETS`, checks that:
 * - the global `LanguageSwitcher` (data-language-switcher="true") is present;
 * - it exposes English + Español + Français entries (no /en/* hrefs);
 * - each entry's href points to the equivalent locale path;
 * - the active entry matches the page locale.
 *
 * Usage:
 *   SCREENSHOT_BASE_URL=http://localhost:3000 npx tsx scripts/i18n-language-switcher-audit.ts
 *
 * Out:
 *   reports/seo/i18n-language-switcher-audit-2026-05-19.{md,json}
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type BrowserContext, type Page } from 'playwright';

const BASE = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:3000';
const OUT_JSON = join(
  process.cwd(),
  'reports/seo/i18n-language-switcher-audit-2026-05-19.json'
);
const OUT_MD = join(
  process.cwd(),
  'reports/seo/i18n-language-switcher-audit-2026-05-19.md'
);

type Locale = 'en' | 'es' | 'fr';

type SwitcherTarget = {
  /** Path to load (locale-prefixed for es/fr). */
  path: string;
  /** Active locale on this page. */
  locale: Locale;
  /** Canonical path used to compute the expected three hrefs. `/` for home. */
  canonical: string;
  /** Whether the switcher must be visible. `false` = intentionally hidden. */
  switcherExpected: boolean;
  /** Free-form note for the report (e.g. why hidden). */
  note?: string;
};

const PILOT_CLUSTERS: Array<{
  canonical: string;
  englishPath: string;
  esPath: string;
  frPath: string;
}> = [
  { canonical: '/', englishPath: '/', esPath: '/es', frPath: '/fr' },
  { canonical: '/scholarships', englishPath: '/scholarships', esPath: '/es/scholarships', frPath: '/fr/scholarships' },
  { canonical: '/scholarships/hub/best-recommendation', englishPath: '/scholarships/hub/best-recommendation', esPath: '/es/scholarships/hub/best-recommendation', frPath: '/fr/scholarships/hub/best-recommendation' },
  { canonical: '/scholarships/hub/easy-apply', englishPath: '/scholarships/hub/easy-apply', esPath: '/es/scholarships/hub/easy-apply', frPath: '/fr/scholarships/hub/easy-apply' },
  { canonical: '/scholarships/hub/hot-deadlines', englishPath: '/scholarships/hub/hot-deadlines', esPath: '/es/scholarships/hub/hot-deadlines', frPath: '/fr/scholarships/hub/hot-deadlines' },
  { canonical: '/scholarships/hub/international-friendly', englishPath: '/scholarships/hub/international-friendly', esPath: '/es/scholarships/hub/international-friendly', frPath: '/fr/scholarships/hub/international-friendly' },
  { canonical: '/essays', englishPath: '/essays', esPath: '/es/essays', frPath: '/fr/essays' },
  { canonical: '/providers', englishPath: '/providers', esPath: '/es/providers', frPath: '/fr/providers' },
  { canonical: '/compare', englishPath: '/compare', esPath: '/es/compare', frPath: '/fr/compare' },
  { canonical: '/resources', englishPath: '/resources', esPath: '/es/resources', frPath: '/fr/resources' },
  { canonical: '/terms', englishPath: '/terms', esPath: '/es/terms', frPath: '/fr/terms' },
  { canonical: '/faq', englishPath: '/faq', esPath: '/es/faq', frPath: '/fr/faq' },
  { canonical: '/privacy-policy', englishPath: '/privacy-policy', esPath: '/es/privacy-policy', frPath: '/fr/privacy-policy' },
  { canonical: '/resources/how-to-find-scholarships', englishPath: '/resources/how-to-find-scholarships', esPath: '/es/resources/how-to-find-scholarships', frPath: '/fr/resources/how-to-find-scholarships' },
  { canonical: '/essays/outline', englishPath: '/essays/outline', esPath: '/es/essays/outline', frPath: '/fr/essays/outline' },
  { canonical: '/compare/scholarship-vs-grant', englishPath: '/compare/scholarship-vs-grant', esPath: '/es/compare/scholarship-vs-grant', frPath: '/fr/compare/scholarship-vs-grant' }
];

const SWITCHER_TARGETS: SwitcherTarget[] = [
  ...PILOT_CLUSTERS.flatMap((cluster) => [
    {
      path: cluster.englishPath,
      locale: 'en' as Locale,
      canonical: cluster.canonical,
      switcherExpected: true
    },
    {
      path: cluster.esPath,
      locale: 'es' as Locale,
      canonical: cluster.canonical,
      switcherExpected: true
    },
    {
      path: cluster.frPath,
      locale: 'fr' as Locale,
      canonical: cluster.canonical,
      switcherExpected: true
    }
  ]),
  {
    path: '/subscription',
    locale: 'en' as Locale,
    canonical: '/subscription',
    switcherExpected: true
  },
  {
    path: '/es/subscription',
    locale: 'es' as Locale,
    canonical: '/subscription',
    switcherExpected: true
  },
  {
    path: '/fr/subscription',
    locale: 'fr' as Locale,
    canonical: '/subscription',
    switcherExpected: true
  }
];

type ExpectedHrefs = Record<Locale, string>;

function expectedHrefs(canonical: string): ExpectedHrefs {
  if (canonical === '/') {
    return { en: '/', es: '/es', fr: '/fr' };
  }
  return {
    en: canonical,
    es: `/es${canonical}`,
    fr: `/fr${canonical}`
  };
}

type SwitcherAnchor = {
  locale: string | null;
  href: string;
  current: boolean;
  text: string;
};

async function readSwitcherAnchors(page: Page): Promise<SwitcherAnchor[]> {
  return page.$$eval(
    'a[data-language-switcher="true"][data-language-switcher-locale]',
    (els) =>
      els.map((el) => {
        const a = el as HTMLAnchorElement;
        return {
          locale: a.getAttribute('data-language-switcher-locale'),
          href: a.getAttribute('href') ?? '',
          current: a.getAttribute('aria-current') === 'page' ||
            a.getAttribute('aria-selected') === 'true',
          text: (a.textContent ?? '').trim()
        };
      })
  );
}

type PageResult = {
  url: string;
  path: string;
  locale: Locale;
  status: number | null;
  switcherExpected: boolean;
  switcherFound: boolean;
  expected: ExpectedHrefs | null;
  actual: SwitcherAnchor[];
  issues: string[];
  note?: string;
};

function stripLocale(pathname: string): { locale: Locale; canonical: string } {
  const cleaned = pathname.split(/[?#]/, 1)[0] ?? pathname;
  if (cleaned === '/es' || cleaned.startsWith('/es/')) {
    return { locale: 'es', canonical: cleaned === '/es' ? '/' : cleaned.slice(3) };
  }
  if (cleaned === '/fr' || cleaned.startsWith('/fr/')) {
    return { locale: 'fr', canonical: cleaned === '/fr' ? '/' : cleaned.slice(3) };
  }
  return { locale: 'en', canonical: cleaned || '/' };
}

async function auditTarget(
  context: BrowserContext,
  target: SwitcherTarget
): Promise<PageResult> {
  const url = `${BASE}${target.path}`;
  const page = await context.newPage();
  const issues: string[] = [];
  let status: number | null = null;
  let actual: SwitcherAnchor[] = [];
  let triggerPresent = false;
  let effectiveCanonical = target.canonical;
  let effectiveLocale = target.locale;
  try {
    const res = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000
    });
    status = res?.status() ?? null;
    /** Navbar is `dynamic({ ssr: false })`; wait for client bundle + hydration. */
    await page
      .locator('[data-language-switcher="true"]')
      .first()
      .waitFor({ state: 'attached', timeout: 20_000 })
      .catch(() => undefined);
    await page.waitForTimeout(1500);

    /**
     * Some pages redirect (e.g. `/scholarships` → `/scholarships/hub/best-recommendation`).
     * Use the resolved client-side pathname to compute expected switcher hrefs so we
     * test the actual rendered page, not the requested path.
     */
    const finalPath = await page.evaluate(() => window.location.pathname);
    const resolved = stripLocale(finalPath);
    effectiveCanonical = resolved.canonical;
    effectiveLocale = resolved.locale;

    /**
     * Navbar mounts `LanguageSwitcher` in `variant="dropdown"`: anchors only render
     * when the trigger button is opened. Click it (no-op for inline variant since
     * trigger button is absent) to make the listbox anchors readable.
     */
    const trigger = page
      .locator('[data-language-switcher="true"] button[aria-haspopup="listbox"]')
      .first();
    triggerPresent = (await trigger.count()) > 0;
    if (triggerPresent) {
      await trigger
        .click({ timeout: 5_000 })
        .catch(() => undefined);
      await page
        .locator('[data-language-switcher="true"] [role="listbox"] a[data-language-switcher="true"]')
        .first()
        .waitFor({ state: 'attached', timeout: 5_000 })
        .catch(() => undefined);
    }
    actual = await readSwitcherAnchors(page);
  } catch (e) {
    issues.push(`navigation/render error: ${(e as Error).message.slice(0, 140)}`);
  } finally {
    await page.close().catch(() => {});
  }

  if (status != null && status >= 400) {
    issues.push(`HTTP ${status}`);
  }

  const found = actual.length > 0;
  if (target.switcherExpected) {
    const expected = expectedHrefs(effectiveCanonical);
    const byLocale = new Map<string, SwitcherAnchor>();
    for (const a of actual) {
      if (a.locale) byLocale.set(a.locale, a);
    }
    for (const locale of ['en', 'es', 'fr'] as const) {
      const entry = byLocale.get(locale);
      if (!entry) {
        issues.push(`missing ${locale} entry`);
        continue;
      }
      if (entry.href !== expected[locale]) {
        issues.push(
          `${locale} href = "${entry.href}", expected "${expected[locale]}"`
        );
      }
      if (entry.href.startsWith('/en/') || entry.href === '/en') {
        issues.push(`${locale} href points to /en (forbidden)`);
      }
    }
    const activeEntry = actual.find((a) => a.current);
    if (!activeEntry) {
      issues.push('no active (aria-current/aria-selected) entry');
    } else if (activeEntry.locale !== effectiveLocale) {
      issues.push(
        `active entry locale = "${activeEntry.locale}", expected "${effectiveLocale}"`
      );
    }
    if (!found) {
      issues.push('language switcher not rendered');
    }
    return {
      url,
      path: target.path,
      locale: target.locale,
      status,
      switcherExpected: true,
      switcherFound: found,
      expected,
      actual,
      issues,
      note: target.note
    };
  }

  /** Switcher intentionally hidden — must NOT be present. */
  if (found) {
    issues.push(
      'language switcher found on page documented as English-only — review or document'
    );
  }
  return {
    url,
    path: target.path,
    locale: target.locale,
    status,
    switcherExpected: false,
    switcherFound: found,
    expected: null,
    actual,
    issues,
    note: target.note
  };
}

async function main() {
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const results: PageResult[] = [];
  for (const target of SWITCHER_TARGETS) {
    console.log(`Auditing ${target.path}...`);
    results.push(await auditTarget(context, target));
  }
  await context.close();
  await browser.close();

  const blocking = results.filter(
    (r) => r.switcherExpected && r.issues.length > 0
  );
  const hiddenButPresent = results.filter(
    (r) => !r.switcherExpected && r.switcherFound
  );
  const intentionallyHidden = results.filter(
    (r) => !r.switcherExpected && !r.switcherFound
  );

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    totalPages: results.length,
    pagesExpectingSwitcher: results.filter((r) => r.switcherExpected).length,
    pagesPassingSwitcher: results.filter(
      (r) => r.switcherExpected && r.issues.length === 0
    ).length,
    pagesWithBlockingSwitcherIssues: blocking.length,
    pagesIntentionallyEnglishOnly: intentionallyHidden.length,
    pagesEnglishOnlyButFoundSwitcher: hiddenButPresent.length
  };
  writeFileSync(OUT_JSON, JSON.stringify({ summary, results }, null, 2));

  const lines: string[] = [
    '# i18n language-switcher audit (2026-05-19)',
    '',
    `Base URL: ${BASE}`,
    '',
    `Pages audited: ${summary.totalPages}`,
    `Pages expecting switcher: ${summary.pagesExpectingSwitcher}`,
    `Pages passing switcher checks: ${summary.pagesPassingSwitcher}`,
    `Pages with blocking switcher issues: ${summary.pagesWithBlockingSwitcherIssues}`,
    `Pages intentionally English-only (switcher hidden): ${summary.pagesIntentionallyEnglishOnly}`,
    '',
    '## Blocking switcher issues',
    ''
  ];
  if (blocking.length === 0) lines.push('_(none)_', '');
  for (const r of blocking) {
    lines.push(`- ${r.url}`);
    for (const issue of r.issues) lines.push(`  - ${issue}`);
    if (r.expected) {
      lines.push(
        `  - expected: en=\`${r.expected.en}\`, es=\`${r.expected.es}\`, fr=\`${r.expected.fr}\``
      );
    }
    if (r.actual.length > 0) {
      lines.push(
        `  - actual: ${r.actual
          .map((a) => `${a.locale ?? '?'}=\`${a.href}\`${a.current ? ' (active)' : ''}`)
          .join(', ')}`
      );
    }
  }

  lines.push('', '## Translated cluster pages — passing', '');
  for (const r of results.filter(
    (x) => x.switcherExpected && x.issues.length === 0
  )) {
    const active = r.actual.find((a) => a.current);
    lines.push(
      `- ${r.url} — active: \`${active?.locale ?? '?'}\` → \`${active?.href ?? '?'}\``
    );
  }

  lines.push('', '## Intentionally English-only pages', '');
  for (const r of intentionallyHidden) {
    lines.push(`- ${r.url}${r.note ? ` — ${r.note}` : ''}`);
  }

  if (hiddenButPresent.length > 0) {
    lines.push('', '## English-only pages that unexpectedly rendered a switcher', '');
    for (const r of hiddenButPresent) {
      lines.push(`- ${r.url}`);
    }
  }

  writeFileSync(OUT_MD, lines.join('\n'));
  console.log(JSON.stringify(summary, null, 2));
  if (summary.pagesWithBlockingSwitcherIssues > 0) {
    process.exitCode = 1;
  }
}

void main();
