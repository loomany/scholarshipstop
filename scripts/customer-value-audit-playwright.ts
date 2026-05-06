/**
 * Stage 1 — Guest browser audit (Playwright).
 * Does NOT inspect API payloads, page.content() secrets, or JSON-LD (Stage 2).
 *
 * BASE_URL: PLAYWRIGHT_BASE_URL or http://localhost:3001
 *
 *   npx tsx scripts/customer-value-audit-playwright.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { chromium, type Page } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_ROOT = path.join(__dirname, '..', 'reports', 'customer-value-audit');
const SCREENSHOT_DIR = path.join(REPORT_ROOT, 'screenshots');

const DEFAULT_BASE = 'http://localhost:3001';

const REQUIRED_PATHS = [
  '/',
  '/scholarships',
  '/scholarships/hub/best-matches',
  '/scholarships/hub/easy-apply',
  '/scholarships/hub/recommended',
  '/scholarships/hub/international-friendly',
  '/subscription',
  '/signin'
];

const OPTIONAL_PATHS = ['/account'];

type PageAudit = {
  path: string;
  fullUrl: string;
  httpStatus: number | null;
  pageTitle: string;
  firstH1: string;
  bodyTextLength: number;
  scholarshipCardCount: number;
  hasSignupCta: boolean;
  hasSubscriptionCta: boolean;
  hasLockIndicators: boolean;
  hasBlurIndicators: boolean;
  hasPaywallOrModalIndicators: boolean;
  visibleErrorHints: string[];
  screenshotPath: string;
};

type CardAudit = {
  pagePath: string;
  cardIndex: number;
  titleText: string;
  providerText: string;
  deadlineText: string;
  awardText: string;
  requirementsText: string;
  visibleChips: string[];
  visibleButtons: string[];
  hasSaveButton: boolean;
  hasNotRelevantButton: boolean;
  hasLockOrBlurVisual: boolean;
  snippetLength: number;
};

async function assertReachableBase(base: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(base, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'text/html' }
    });
    if (!res.ok && res.status >= 500) {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(
      `[customer-value-audit] Cannot reach BASE_URL ${base}: ${msg}\n` +
        'Start the dev server (e.g. npm run dev -- -p 3001) or set PLAYWRIGHT_BASE_URL.'
    );
    process.exit(1);
  } finally {
    clearTimeout(timer);
  }
}

async function detectVisibleErrors(page: Page): Promise<string[]> {
  const hints: string[] = [];
  const body = await page.locator('body').innerText().catch(() => '');
  const patterns = [
    /\b404\b/i,
    /http\s*5\d{2}\b/i,
    /error\s*5\d{2}\b/i,
    /page not found/i,
    /something went wrong/i,
    /internal server error/i,
    /application error/i
  ];
  for (const re of patterns) {
    if (re.test(body)) hints.push(re.source);
  }
  return [...new Set(hints)];
}

async function detectCtas(page: Page): Promise<{
  hasSignupCta: boolean;
  hasSubscriptionCta: boolean;
}> {
  const signupRe =
    /sign\s*up|create\s+account|register|join\s+(free|now)|get\s+started/i;
  const subRe =
    /subscription|premium|unlock|subscribe|upgrade|start\s+(your\s+)?trial/i;

  const links = page.locator('a[href]');
  const n = await links.count();
  let hasSignupCta = false;
  let hasSubscriptionCta = false;
  const maxCheck = Math.min(n, 120);
  for (let i = 0; i < maxCheck; i++) {
    const a = links.nth(i);
    const href = (await a.getAttribute('href')) ?? '';
    const text = (await a.innerText().catch(() => '')).trim();
    const blob = `${href} ${text}`;
    if (/signup|sign-up|register|\/account/i.test(href) || signupRe.test(text)) {
      hasSignupCta = true;
    }
    if (/\/subscription/i.test(href) || subRe.test(text)) {
      hasSubscriptionCta = true;
    }
    if (hasSignupCta && hasSubscriptionCta) break;
  }

  const buttons = page.locator('button');
  const bn = await buttons.count();
  for (let i = 0; i < Math.min(bn, 80); i++) {
    const t = (await buttons.nth(i).innerText().catch(() => '')).trim();
    if (signupRe.test(t)) hasSignupCta = true;
    if (subRe.test(t)) hasSubscriptionCta = true;
  }

  return { hasSignupCta, hasSubscriptionCta };
}

async function detectLockBlurModal(page: Page): Promise<{
  hasLockIndicators: boolean;
  hasBlurIndicators: boolean;
  hasPaywallOrModalIndicators: boolean;
}> {
  const lockLoc = page.locator(
    '[aria-label*="Locked scholarship"], [aria-label*="Sponsor name hidden"], [aria-label*="hidden until you subscribe"], [aria-label^="Unlock "]'
  );
  const hasLockIndicators = (await lockLoc.count()) > 0;

  const blurLoc = page.locator('[class*="backdrop-blur"]');
  const hasBlurIndicators = (await blurLoc.count()) > 0;

  const modalLoc = page.locator(
    '[role="dialog"], [data-state="open"][data-radix-collection-item], [id*="radix"]'
  );
  const hasPaywallOrModalIndicators = (await modalLoc.count()) > 0;

  return { hasLockIndicators, hasBlurIndicators, hasPaywallOrModalIndicators };
}

async function auditPage(page: Page, base: string, pathname: string): Promise<PageAudit> {
  const url = `${base.replace(/\/+$/, '')}${pathname}`;
  const safeName = pathname.replace(/\//g, '_').replace(/^_|_$/g, '') || 'root';
  const shotPath = path.join(SCREENSHOT_DIR, `${safeName}.png`);

  let httpStatus: number | null = null;
  const response = await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 45_000
  });
  httpStatus = response?.status() ?? null;

  await page.waitForTimeout(2500);

  const scholarshipPages =
    pathname.includes('/scholarships') && pathname !== '/scholarships/hub';
  const generalListing = pathname === '/scholarships';
  if (generalListing || pathname.includes('/scholarships/hub')) {
    await page
      .waitForSelector('article[data-scholarship-card]', { timeout: 20_000 })
      .catch(() => {});
  }

  const pageTitle = await page.title().catch(() => '');
  const firstH1 = await page
    .locator('h1')
    .first()
    .innerText()
    .catch(() => '');
  const bodyTextLength = await page
    .evaluate(() => document.body?.innerText?.length ?? 0)
    .catch(() => 0);

  const scholarshipCardCount = await page
    .locator('article[data-scholarship-card]')
    .count();

  const { hasSignupCta, hasSubscriptionCta } = await detectCtas(page);
  const { hasLockIndicators, hasBlurIndicators, hasPaywallOrModalIndicators } =
    await detectLockBlurModal(page);
  const visibleErrorHints = await detectVisibleErrors(page);

  await page.screenshot({ path: shotPath, fullPage: false }).catch(() => {});

  return {
    path: pathname,
    fullUrl: page.url(),
    httpStatus,
    pageTitle,
    firstH1: firstH1.trim(),
    bodyTextLength,
    scholarshipCardCount,
    hasSignupCta,
    hasSubscriptionCta,
    hasLockIndicators,
    hasBlurIndicators,
    hasPaywallOrModalIndicators,
    visibleErrorHints,
    screenshotPath: path.relative(path.join(__dirname, '..'), shotPath)
  };
}

async function extractCardSamples(
  page: Page,
  pagePath: string,
  maxCards: number
): Promise<CardAudit[]> {
  const cards = page.locator('article[data-scholarship-card]');
  const n = await cards.count();
  const out: CardAudit[] = [];
  const limit = Math.min(maxCards, n);

  for (let i = 0; i < limit; i++) {
    const card = cards.nth(i);
    const titleText = (await card.locator('h2').first().innerText().catch(() => '')).trim();

    const providerText = (
      await card.evaluate((el) => {
        const link = el.querySelector('a[href^="/providers/"]');
        if (link?.textContent?.trim()) return link.textContent.trim();
        const sponsor = el.querySelector('[aria-label="Sponsor name hidden until you subscribe."]');
        if (sponsor?.textContent?.trim()) return sponsor.textContent.trim();
        const row = el.querySelector('h2')?.parentElement?.querySelector('.text-gray-400');
        return row?.textContent?.trim() ?? '';
      })
    ).trim();

    const allText = (await card.innerText().catch(() => '')).slice(0, 8000);
    let deadlineText = '';
    const dm = allText.match(
      /(?:Deadline|Due|Closes)[:\s]*([^\n]+)|(\d{1,2}\/\d{1,2}\/\d{2,4})/i
    );
    if (dm) deadlineText = (dm[1] ?? dm[2] ?? '').trim().slice(0, 120);

    let awardText = '';
    const am = allText.match(/(?:Award|Amount)[:\s]*([^\n]{3,120})/i);
    if (am) awardText = am[1]!.trim();

    let requirementsText = '';
    const rm = allText.match(/(\d+)\s*requirements?/i);
    if (rm) requirementsText = rm[0]!;

    const chipTexts = await card
      .locator(
        'span.inline-flex.items-center.justify-center.rounded-full, span.rounded-full.border'
      )
      .allInnerTexts()
      .catch(() => [] as string[]);
    const visibleChips = chipTexts
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 12);

    const btnLoc = card.locator('button');
    const btnCount = await btnLoc.count();
    const visibleButtons: string[] = [];
    for (let b = 0; b < btnCount; b++) {
      const tx = (await btnLoc.nth(b).innerText().catch(() => '')).trim();
      if (tx) visibleButtons.push(tx.replace(/\s+/g, ' ').slice(0, 80));
    }

    const hasSaveButton =
      (await card.getByRole('button', { name: /save scholarship/i }).count()) > 0 ||
      visibleButtons.some((x) => /^save$/i.test(x));
    const hasNotRelevantButton =
      (await card.getByRole('button', { name: /not relevant/i }).count()) > 0 ||
      visibleButtons.some((x) => /not relevant/i.test(x));

    const hasLockOrBlurVisual =
      (await card.locator('[class*="backdrop-blur"]').count()) > 0 ||
      (await card.locator('[aria-label*="Locked scholarship"]').count()) > 0;

    const snippetLength = await card.evaluate((el) => {
      const h2 = el.querySelector('h2');
      if (!h2?.parentElement) return 0;
      const parent = h2.parentElement;
      const children = [...parent.children];
      const idx = children.indexOf(h2);
      for (let j = idx + 1; j < children.length; j++) {
        const c = children[j];
        if (c.tagName === 'P') return (c.textContent ?? '').trim().length;
        const p = c.querySelector('p');
        if (p) return (p.textContent ?? '').trim().length;
      }
      return 0;
    });

    out.push({
      pagePath,
      cardIndex: i,
      titleText: titleText.slice(0, 500),
      providerText: providerText.slice(0, 300),
      deadlineText,
      awardText: awardText.slice(0, 200),
      requirementsText,
      visibleChips,
      visibleButtons: visibleButtons.slice(0, 15),
      hasSaveButton,
      hasNotRelevantButton,
      hasLockOrBlurVisual,
      snippetLength
    });
  }

  return out;
}

function csvEscape(s: string): string {
  const t = String(s ?? '');
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

async function main() {
  const base = (process.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_BASE).trim().replace(/\/+$/, '');
  await assertReachableBase(base);

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'en-US'
  });
  const page = await context.newPage();

  const pages: PageAudit[] = [];
  const allCards: CardAudit[] = [];

  const pathsToVisit = [...REQUIRED_PATHS, ...OPTIONAL_PATHS];

  for (const pathname of pathsToVisit) {
    try {
      const audit = await auditPage(page, base, pathname);
      pages.push(audit);

      if (
        pathname === '/scholarships' ||
        pathname.startsWith('/scholarships/hub/')
      ) {
        const samples = await extractCardSamples(page, pathname, 10);
        allCards.push(...samples);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      pages.push({
        path: pathname,
        fullUrl: `${base}${pathname}`,
        httpStatus: null,
        pageTitle: '',
        firstH1: '',
        bodyTextLength: 0,
        scholarshipCardCount: 0,
        hasSignupCta: false,
        hasSubscriptionCta: false,
        hasLockIndicators: false,
        hasBlurIndicators: false,
        hasPaywallOrModalIndicators: false,
        visibleErrorHints: [`navigation_error:${msg.slice(0, 200)}`],
        screenshotPath: ''
      });
    }
  }

  await browser.close();

  const meta = {
    generatedAt: new Date().toISOString(),
    baseUrl: base,
    paths: pathsToVisit,
    pages
  };

  fs.writeFileSync(
    path.join(REPORT_ROOT, 'guest-flow-audit.json'),
    JSON.stringify(meta, null, 2),
    'utf8'
  );

  fs.writeFileSync(
    path.join(REPORT_ROOT, 'guest-scholarship-cards.json'),
    JSON.stringify({ generatedAt: meta.generatedAt, cards: allCards }, null, 2),
    'utf8'
  );

  const csvHeader = [
    'pagePath',
    'cardIndex',
    'titleText',
    'providerText',
    'deadlineText',
    'awardText',
    'requirementsText',
    'visibleChips',
    'visibleButtons',
    'hasSaveButton',
    'hasNotRelevantButton',
    'hasLockOrBlurVisual',
    'snippetLength'
  ];
  const csvLines = [
    csvHeader.join(','),
    ...allCards.map((c) =>
      [
        csvEscape(c.pagePath),
        String(c.cardIndex),
        csvEscape(c.titleText),
        csvEscape(c.providerText),
        csvEscape(c.deadlineText),
        csvEscape(c.awardText),
        csvEscape(c.requirementsText),
        csvEscape(c.visibleChips.join(' | ')),
        csvEscape(c.visibleButtons.join(' | ')),
        String(c.hasSaveButton),
        String(c.hasNotRelevantButton),
        String(c.hasLockOrBlurVisual),
        String(c.snippetLength)
      ].join(',')
    )
  ];
  fs.writeFileSync(
    path.join(REPORT_ROOT, 'guest-scholarship-cards.csv'),
    csvLines.join('\n'),
    'utf8'
  );

  const ok200 = pages.filter((p) => p.httpStatus === 200).length;
  const withCards = pages.filter((p) => p.scholarshipCardCount > 0);
  const lockPages = pages.filter((p) => p.hasLockIndicators || p.hasBlurIndicators);
  const ctaPages = pages.filter((p) => p.hasSignupCta || p.hasSubscriptionCta);
  const errPages = pages.filter(
    (p) =>
      (p.httpStatus != null && p.httpStatus >= 400) || p.visibleErrorHints.length > 0
  );

  const md = `# Guest browser audit (Stage 1)

- **Generated:** ${meta.generatedAt}
- **BASE_URL:** ${base}
- **Pages visited:** ${pages.length}
- **HTTP 200:** ${ok200}
- **Pages with scholarship cards:** ${withCards.map((p) => p.path).join(', ') || '(none)'}
- **Pages with lock/blur signals:** ${lockPages.map((p) => p.path).join(', ') || '(none detected)'}
- **Pages with signup/subscription CTAs:** ${ctaPages.map((p) => p.path).join(', ') || '(none)'}
- **Pages with errors (status ≥400 or error hints):** ${errPages.map((p) => `${p.path} (${p.httpStatus ?? '?'})`).join('; ') || '(none)'}

## Per-page

| Path | Status | Title (truncated) | Cards | Signup CTA | Sub CTA | Lock | Blur | Screenshot |
|------|--------|---------------------|-------|------------|---------|------|------|------------|
${pages
  .map(
    (p) =>
      `| ${p.path} | ${p.httpStatus ?? '—'} | ${(p.pageTitle || '—').replace(/\|/g, '/').slice(0, 58)} | ${p.scholarshipCardCount} | ${p.hasSignupCta} | ${p.hasSubscriptionCta} | ${p.hasLockIndicators} | ${p.hasBlurIndicators} | \`${p.screenshotPath}\` |`
  )
  .join('\n')}

## Card samples

Total card rows captured: **${allCards.length}** (see JSON/CSV).

## Overall (heuristic)

Guest flow appears **${errPages.length === 0 && ok200 >= pathsToVisit.length - 1 ? 'reachable and mostly healthy' : 'problematic on some routes'}** based on status codes and visible error hints. Validate screenshots under \`reports/customer-value-audit/screenshots/\`.
`;

  fs.writeFileSync(path.join(REPORT_ROOT, 'guest-audit-summary.md'), md, 'utf8');

  console.log('[customer-value-audit] Done. Reports under', REPORT_ROOT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
