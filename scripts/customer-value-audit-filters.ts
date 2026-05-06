/**
 * Stage 3 — Customer filter UX audit (Playwright).
 * Does NOT inspect API payloads for premium leaks (Stage 2).
 * Does NOT modify site code, DB, or auth.
 *
 * BASE_URL: PLAYWRIGHT_BASE_URL or http://localhost:3001
 *
 *   npx tsx scripts/customer-value-audit-filters.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { chromium, type Page } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_ROOT = path.join(__dirname, '..', 'reports', 'customer-value-audit');
const SCREENSHOT_DIR = path.join(REPORT_ROOT, 'screenshots');

const DEFAULT_BASE = 'http://localhost:3001';

type ScenarioStatus = 'pass' | 'warn' | 'fail';

type ScenarioResult = {
  scenario: string;
  status: ScenarioStatus;
  startingUrl: string;
  finalUrl: string;
  cardCountBefore: number;
  cardCountAfter: number;
  firstFiveTitles: string[];
  firstFiveChips: string[];
  failReason?: string;
  relevanceNotes: string[];
  screenshotPath: string;
};

type FilterAuditReport = {
  generatedAt: string;
  baseUrl: string;
  overallVerdict: 'pass' | 'warnings' | 'fail';
  scenarios: ScenarioResult[];
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
      `[filter-audit] Cannot reach BASE_URL ${base}: ${msg}\n` +
        'Start the dev server (e.g. npm run dev -- -p 3001) or set PLAYWRIGHT_BASE_URL.'
    );
    process.exit(1);
  } finally {
    clearTimeout(timer);
  }
}

function ensureDirs(): void {
  fs.mkdirSync(REPORT_ROOT, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function shot(page: Page, filename: string): Promise<string> {
  const p = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: p, fullPage: false }).catch(() => {});
  return p.replace(/\\/g, '/');
}

async function countCards(page: Page): Promise<number> {
  return page.locator('article[data-scholarship-card]').count();
}

async function getTitles(page: Page, n = 5): Promise<string[]> {
  const cards = page.locator('article[data-scholarship-card]');
  const count = Math.min(await cards.count(), n);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = await cards
      .nth(i)
      .locator('h2')
      .first()
      .innerText()
      .catch(() => '');
    out.push(t.trim().replace(/\s+/g, ' '));
  }
  return out;
}

async function getVisibleChips(page: Page, n = 5): Promise<string[]> {
  const removeButtons = page.locator('button[aria-label^="Remove "]');
  const m = await removeButtons.count();
  if (m > 0) {
    const out: string[] = [];
    for (let i = 0; i < Math.min(m, n); i++) {
      const label = await removeButtons.nth(i).getAttribute('aria-label');
      if (label?.startsWith('Remove ')) {
        out.push(label.slice('Remove '.length).trim());
      }
    }
    if (out.length) return out;
  }
  const card = page.locator('article[data-scholarship-card]').first();
  const tags = card.locator('[aria-label^="Browse scholarships filtered by"]');
  const tc = await tags.count();
  const out2: string[] = [];
  for (let i = 0; i < Math.min(tc, n); i++) {
    const al = await tags.nth(i).getAttribute('aria-label');
    if (al) {
      out2.push(
        al.replace(/^Browse scholarships filtered by\s*/i, '').trim()
      );
    }
  }
  return out2.slice(0, n);
}

async function waitForCardsOrEmpty(page: Page, timeout = 25_000): Promise<void> {
  await page
    .waitForSelector('article[data-scholarship-card]', { timeout })
    .catch(() => {});
  await page.waitForTimeout(400);
}

/** Hub disables category filter while `totalCount === 0`; wait until controls are usable. */
async function waitHubFilterToolbarReady(page: Page): Promise<void> {
  const catBtn = page.getByRole('button', { name: /Categories/i });
  await catBtn.waitFor({ state: 'visible', timeout: 25_000 });
  for (let i = 0; i < 60; i++) {
    const disabled = await catBtn.isDisabled().catch(() => true);
    if (!disabled) break;
    await page.waitForTimeout(500);
  }
}

async function dismissOpenUi(page: Page): Promise<void> {
  await page.keyboard.press('Escape').catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(250);
}

async function waitForCategoryInUrl(page: Page, timeout = 25_000): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => /\bcategory=[^&]+/.test(window.location.href),
      { timeout }
    );
    return true;
  } catch {
    return false;
  }
}

async function settleListing(page: Page): Promise<void> {
  await page.waitForTimeout(500);
  await page
    .waitForFunction(
      () => !document.body.innerText.includes('Applying filters...'),
      { timeout: 20_000 }
    )
    .catch(() => {});
  await page.waitForTimeout(400);
}

/** Host-country popover uses `aria-label` on the panel (not always exposed as a named dialog). */
function studyDestinationPanel(page: Page): ReturnType<Page['locator']> {
  return page.locator('[aria-label="Filter by study destination"]');
}

function citizenshipPanel(page: Page): ReturnType<Page['locator']> {
  return page.locator('[aria-label="Filter by citizenship or home country"]');
}

async function waitStudyDestinationRowsLoaded(page: Page): Promise<void> {
  const panel = studyDestinationPanel(page);
  await panel
    .getByText(/Loading location filters/i)
    .waitFor({ state: 'hidden', timeout: 45_000 })
    .catch(() => {});
  await page.waitForTimeout(250);
}

async function waitCitizenshipRowsLoaded(page: Page): Promise<void> {
  const panel = citizenshipPanel(page);
  await panel
    .getByText(/Loading country filters/i)
    .waitFor({ state: 'hidden', timeout: 45_000 })
    .catch(() => {});
  await page.waitForTimeout(250);
}

async function clickShowScholarships(
  panel: ReturnType<Page['locator']>
): Promise<void> {
  const btn = panel.getByRole('button', { name: 'Show scholarships' });
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  await btn.click({ timeout: 45_000 });
}

async function applyStudyInUnitedStates(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Study in/i }).click();
  const dest = studyDestinationPanel(page);
  await dest.waitFor({ state: 'visible', timeout: 15_000 });
  await waitStudyDestinationRowsLoaded(page);
  await dest.getByRole('textbox', { name: 'Search countries' }).fill('United');
  await page.waitForTimeout(350);
  const usLabel = dest.locator('label').filter({ hasText: /United States/i }).first();
  await usLabel.waitFor({ state: 'visible', timeout: 20_000 });
  const usCb = usLabel.locator('input[type=checkbox]');
  if (await usCb.isDisabled().catch(() => false)) {
    throw new Error(
      'United States study destination row appears disabled (likely zero matching scholarships in catalog).'
    );
  }
  await usCb.click();
  await clickShowScholarships(dest);
  await dest.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
}

function parseUrlSearch(url: string): URLSearchParams {
  try {
    return new URL(url).searchParams;
  } catch {
    return new URLSearchParams();
  }
}

function usRelevanceFromCardText(text: string): boolean {
  return /\bUnited States\b|USA|U\.S\.|Study in:\s*US\b|Study in:.*United States/i.test(
    text
  );
}

function canadaRelevanceFromCardText(text: string): boolean {
  return /\bCanada\b|Canadian|\bCA\b.*Eligible|Eligible:.*Canada|International|Foreign nationals|Open to all nationalities/i.test(
    text
  );
}

function stemHint(text: string): boolean {
  return /\bSTEM\b|Science|Technology|Engineering|Mathematics|Math\b|Computer|Nursing|Business/i.test(
    text
  );
}

async function gotoScholarships(page: Page, base: string): Promise<void> {
  const url = `${base.replace(/\/+$/, '')}/scholarships`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await waitForCardsOrEmpty(page);
  await waitHubFilterToolbarReady(page);
}

async function categoryCountFromLabel(lab: ReturnType<Page['locator']>): Promise<number> {
  const t = (await lab.locator('span.tabular-nums').last().innerText().catch(() => '0')).trim();
  return parseInt(t.replace(/,/g, ''), 10) || 0;
}

async function applyStemCategoryOrFallback(
  page: Page
): Promise<{ label: string; paramSnippet: string }> {
  await dismissOpenUi(page);
  await waitHubFilterToolbarReady(page);
  await page.getByRole('button', { name: /Categories/i }).click();
  const dialog = page.getByRole('dialog', { name: 'Filter by category' });
  await dialog.waitFor({ state: 'visible', timeout: 15_000 });
  await dialog.locator('span.tabular-nums').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

  const stemLabel = dialog.locator('label').filter({ hasText: /\bSTEM\b/ }).first();
  if (await stemLabel.isVisible().catch(() => false)) {
    const cnt = await categoryCountFromLabel(stemLabel);
    if (cnt > 0) {
      await stemLabel.locator('input[type=checkbox]').click();
      await dialog.getByRole('button', { name: 'Apply' }).click({ timeout: 15_000 });
      await dialog.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
      await settleListing(page);
      await waitForCategoryInUrl(page);
      await page.waitForTimeout(400);
      return { label: 'STEM', paramSnippet: 'category=' };
    }
  }

  const labels = dialog.locator('ul[role="list"] label');
  const n = await labels.count();
  const priority = [
    'Education',
    'Humanities',
    'Arts',
    'Medicine',
    'Law',
    'Community',
    'Biology',
    'Miscellaneous'
  ];
  for (const name of priority) {
    const lab = dialog.locator('label').filter({ hasText: new RegExp(`^${name}`) }).first();
    if (!(await lab.isVisible().catch(() => false))) continue;
    const cnt = await categoryCountFromLabel(lab);
    if (cnt > 0) {
      await lab.locator('input[type=checkbox]').click();
      await dialog.getByRole('button', { name: 'Apply' }).click({ timeout: 15_000 });
      await dialog.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
      await settleListing(page);
      await waitForCategoryInUrl(page);
      await page.waitForTimeout(400);
      return { label: name, paramSnippet: 'category=' };
    }
  }

  for (let i = 0; i < n; i++) {
    const lab = labels.nth(i);
    const cnt = await categoryCountFromLabel(lab);
    if (cnt <= 0) continue;
    await lab.locator('input[type=checkbox]').click();
    const picked = (await lab.locator('span.font-medium').first().innerText().catch(() => 'Category')).trim();
    await dialog.getByRole('button', { name: 'Apply' }).click({ timeout: 15_000 });
    await dialog.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    await settleListing(page);
    await waitForCategoryInUrl(page);
    await page.waitForTimeout(400);
    return { label: picked.split(/\s+/)[0] || 'category', paramSnippet: 'category=' };
  }

  await dialog.getByRole('button', { name: 'Apply' }).click().catch(() => {});
  await dialog.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
  await settleListing(page);
  await waitForCategoryInUrl(page);
  await page.waitForTimeout(400);
  return { label: 'STEM', paramSnippet: 'category=' };
}

function buildScenario(
  partial: Omit<ScenarioResult, 'screenshotPath'> & { screenshotPath?: string },
  screenshotPath: string
): ScenarioResult {
  return { ...partial, screenshotPath };
}

function verdictFromScenarios(rows: ScenarioResult[]): 'pass' | 'warnings' | 'fail' {
  if (rows.some((r) => r.status === 'fail')) return 'fail';
  if (rows.some((r) => r.status === 'warn')) return 'warnings';
  return 'pass';
}

function renderMarkdown(report: FilterAuditReport): string {
  const lines: string[] = [];
  const passed = report.scenarios.filter((s) => s.status === 'pass');
  const warned = report.scenarios.filter((s) => s.status === 'warn');
  const failed = report.scenarios.filter((s) => s.status === 'fail');
  const relIrrel = report.scenarios.flatMap((s) =>
    s.relevanceNotes.length ? [`- **${s.scenario}:** ${s.relevanceNotes.join(' ')}`] : []
  );
  const urlIssues = report.scenarios.flatMap((s) => {
    const out: string[] = [];
    if (/URL|param|reset|cleared/i.test(s.failReason ?? '')) {
      out.push(`- **${s.scenario}:** ${s.failReason}`);
    }
    return out;
  });
  const clickIssues = report.scenarios.flatMap((s) => {
    const out: string[] = [];
    if (
      s.status === 'fail' &&
      /Playwright|disabled|Timeout|not visible/i.test(s.failReason ?? '')
    ) {
      out.push(`- **${s.scenario}:** ${s.failReason}`);
    }
    return out;
  });

  lines.push('# Stage 3 — Filter customer audit');
  lines.push('');
  lines.push(`- **Generated:** ${report.generatedAt}`);
  lines.push(`- **Base URL:** ${report.baseUrl}`);
  lines.push('');
  lines.push('## 1. Overall verdict');
  lines.push('');
  lines.push(`**${report.overallVerdict}**`);
  lines.push('');
  lines.push('## 2. Filters checked');
  lines.push('');
  lines.push(
    '- Keyword search (`q`)\n- Categories (`category`)\n- Study in / host (`host_cc`)\n- Citizenship / I’m from (`app_cc`)\n- Sort (`sort`)\n- More Filters — deadline preset (`deadline`)\n- Combined category + host'
  );
  lines.push('');
  lines.push('## 3. Scenario outcomes');
  lines.push('');
  lines.push(
    `- **Pass (${passed.length}):** ${passed.map((s) => s.scenario).join('; ') || '—'}`
  );
  lines.push(
    `- **Warn (${warned.length}):** ${warned.map((s) => s.scenario).join('; ') || '—'}`
  );
  lines.push(
    `- **Fail (${failed.length}):** ${failed.map((s) => s.scenario).join('; ') || '—'}`
  );
  lines.push('');
  lines.push('## 4. Listing relevance (heuristic / visual)');
  lines.push('');
  lines.push(relIrrel.length ? relIrrel.join('\n') : '_No relevance warnings recorded._');
  const keywordScenario = report.scenarios.find((s) => s.scenario.startsWith('A —'));
  if (
    keywordScenario &&
    /q=STEM/i.test(keywordScenario.finalUrl) &&
    keywordScenario.firstFiveChips.some((c) => /India|Spain|United Kingdom/i.test(c))
  ) {
    lines.push(
      '- **A — Keyword:** Visible geography chips on the first rows may not match “STEM” literally; confirm keyword ranking uses fields beyond the card snippet.'
    );
  }
  lines.push('');
  lines.push('## 5. Controls not found / not clickable');
  lines.push('');
  lines.push(
    clickIssues.length ? clickIssues.join('\n') : '_None recorded beyond per-scenario details._'
  );
  lines.push('');
  lines.push('## 6. URL / state preservation');
  lines.push('');
  lines.push(urlIssues.length ? urlIssues.join('\n') : '_No explicit URL/state failures summarized._');
  lines.push('');
  lines.push('## 7. Recommendations (audit only — no code changes here)');
  lines.push('');
  lines.push(
    '- Re-run this script after any hub filter or URL-sync change (`scripts/customer-value-audit-filters.ts`).'
  );
  lines.push(
    '- For each **fail**, treat `failReason` + screenshot as the repro; possible fixes belong in product code or test data, not in this audit.'
  );
  lines.push(
    '- Guests: locked sort options may block deadline/amount sorts — expected; confirm with a signed-in run if needed later.'
  );
  lines.push('');
  lines.push('## Per-scenario detail');
  lines.push('');
  for (const s of report.scenarios) {
    lines.push(`### ${s.scenario} — ${s.status.toUpperCase()}`);
    lines.push('');
    lines.push(`- Starting URL: \`${s.startingUrl}\``);
    lines.push(`- Final URL: \`${s.finalUrl}\``);
    lines.push(`- Cards before / after: ${s.cardCountBefore} → ${s.cardCountAfter}`);
    lines.push(`- First titles: ${s.firstFiveTitles.join(' | ') || '(none)'}`);
    lines.push(`- Visible chips: ${s.firstFiveChips.join(' | ') || '(none)'}`);
    if (s.failReason) lines.push(`- **Reason:** ${s.failReason}`);
    if (s.relevanceNotes.length) {
      lines.push(`- Relevance notes: ${s.relevanceNotes.join('; ')}`);
    }
    if (s.status !== 'pass') {
      lines.push(
        '- **Possible fix (for developers later):** align URL query sync (`replaceListingParams`), ensure async sidebar counts finish before footer actions enable, keep apply buttons in scroll view / stable selectors; verify catalog has rows for chosen filter.'
      );
    }
    lines.push(`- Screenshot: \`${s.screenshotPath}\``);
    lines.push('');
  }
  return lines.join('\n');
}

async function execScenario(
  page: Page,
  title: string,
  screenshot: string,
  fn: () => Promise<Omit<ScenarioResult, 'scenario' | 'screenshotPath'>>
): Promise<ScenarioResult> {
  try {
    const partial = await fn();
    return buildScenario({ scenario: title, ...partial }, await shot(page, screenshot));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const errFile = screenshot.replace(/\.png$/i, '-error.png');
    return buildScenario(
      {
        scenario: title,
        status: 'fail',
        startingUrl: page.url(),
        finalUrl: page.url(),
        cardCountBefore: await countCards(page).catch(() => 0),
        cardCountAfter: await countCards(page).catch(() => 0),
        firstFiveTitles: await getTitles(page).catch(() => []),
        firstFiveChips: await getVisibleChips(page).catch(() => []),
        failReason: msg,
        relevanceNotes: [
          'Playwright error before scenario finished — see screenshot; often async filter counts, disabled zero-count rows, or footer buttons off-screen.'
        ]
      },
      await shot(page, errFile)
    );
  }
}

async function run(): Promise<void> {
  const base = (process.env.PLAYWRIGHT_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');
  await assertReachableBase(base);
  ensureDirs();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1360, height: 900 },
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);

  const scenarios: ScenarioResult[] = [];

  try {
    // —— A. Keyword search ——
    scenarios.push(
      await execScenario(page, 'A — Keyword search (STEM)', 'filter-a-keyword-stem.png', async () => {
        await gotoScholarships(page, base);
        const aStart = page.url();
        const aCountBefore = await countCards(page);
        const kw = page.getByRole('textbox', { name: 'Search by keyword' });
        await kw.fill('');
        await kw.fill('STEM');
        await page.waitForTimeout(700);
        await settleListing(page);
        const aFinal = page.url();
        const aCountAfter = await countCards(page);
        const sp = parseUrlSearch(aFinal);
        const qOk = (sp.get('q') || '').toLowerCase().includes('stem');
        const aTitles = await getTitles(page);
        const aChips = await getVisibleChips(page);
        const aNotes: string[] = [];
        if (aCountAfter > 0) {
          const cards = page.locator('article[data-scholarship-card]');
          const sample = Math.min(await cards.count(), 8);
          let hints = 0;
          for (let i = 0; i < sample; i++) {
            const blob = (await cards.nth(i).innerText().catch(() => '')).slice(0, 800);
            if (stemHint(blob)) hints++;
          }
          if (hints < Math.max(1, Math.floor(sample * 0.15))) {
            aNotes.push(
              'Few visible cards mention STEM-related terms; keyword match may be abstract or in non-visible fields.'
            );
          }
        }
        let aStatus: ScenarioStatus = 'pass';
        let aFail: string | undefined;
        if (!qOk) {
          aStatus = 'fail';
          aFail = 'Expected URL query `q` to contain STEM after keyword search.';
        } else if (aCountBefore > 0 && aCountAfter === 0) {
          aStatus = 'warn';
          aFail = 'Card count dropped to zero after keyword; may be valid if no matches.';
        } else if (
          aCountAfter > 0 &&
          !aTitles.some((t) => stemHint(t)) &&
          !aChips.some((c) => stemHint(c))
        ) {
          aStatus = 'warn';
          aNotes.push(
            'First visible titles/chips do not obviously reflect “STEM”; ranking may use fields not shown on cards.'
          );
        }
        return {
          status: aStatus,
          startingUrl: aStart,
          finalUrl: aFinal,
          cardCountBefore: aCountBefore,
          cardCountAfter: aCountAfter,
          firstFiveTitles: aTitles,
          firstFiveChips: aChips,
          failReason: aFail,
          relevanceNotes: aNotes
        };
      })
    );

    // —— B. Categories ——
    scenarios.push(
      await execScenario(page, 'B — Categories', 'filter-b-categories.png', async () => {
        await gotoScholarships(page, base);
        const bStart = page.url();
        const bCountBefore = await countCards(page);
        const catPick = await applyStemCategoryOrFallback(page);
        const bFinal = page.url();
        const bCountAfter = await countCards(page);
        const bSp = parseUrlSearch(bFinal);
        const catRaw = bSp.get('category') || '';
        const catOk =
          catRaw.length > 0 &&
          (catPick.label === 'STEM' ? catRaw.includes('stem') : true);
        const bTitles = await getTitles(page);
        const bChips = await getVisibleChips(page);
        const bNotes: string[] = [];
        if (catPick.label !== 'STEM') {
          bNotes.push(`STEM had no listings; used fallback category: ${catPick.label}.`);
        }
        if (bCountAfter > 0) {
          const cards = page.locator('article[data-scholarship-card]');
          const sample = Math.min(await cards.count(), 8);
          let hints = 0;
          for (let i = 0; i < sample; i++) {
            const blob = (await cards.nth(i).innerText().catch(() => '')).slice(0, 1200);
            const catRegex = new RegExp(catPick.label, 'i');
            if (catRegex.test(blob) || stemHint(blob)) hints++;
          }
          if (hints < Math.max(1, Math.floor(sample * 0.2))) {
            bNotes.push(
              'Limited on-card mention of selected category; verify taxonomy vs titles/snippets.'
            );
          }
        }
        let bStatus: ScenarioStatus = 'pass';
        let bFail: string | undefined;
        if (!catOk) {
          bStatus = 'fail';
          bFail = 'Expected `category` URL param to reflect chosen category.';
        } else if (bCountAfter === 0 && bCountBefore > 0) {
          bStatus = 'warn';
          bFail = 'No cards after category filter.';
        }
        return {
          status: bStatus,
          startingUrl: bStart,
          finalUrl: bFinal,
          cardCountBefore: bCountBefore,
          cardCountAfter: bCountAfter,
          firstFiveTitles: bTitles,
          firstFiveChips: bChips,
          failReason: bFail,
          relevanceNotes: bNotes
        };
      })
    );

    // —— C. Study in United States ——
    scenarios.push(
      await execScenario(page, 'C — Study in (United States)', 'filter-c-study-in-us.png', async () => {
        await gotoScholarships(page, base);
        const cStart = page.url();
        const cCountBefore = await countCards(page);
        await applyStudyInUnitedStates(page);
        await settleListing(page);
        const cFinal = page.url();
        const cCountAfter = await countCards(page);
        const cSp = parseUrlSearch(cFinal);
        const hostOk = (cSp.get('host_cc') || '').toUpperCase().includes('US');
        const cTitles = await getTitles(page);
        const cChips = await getVisibleChips(page);
        const cNotes: string[] = [];
        if (cCountAfter > 0) {
          const cards = page.locator('article[data-scholarship-card]');
          const sample = Math.min(await cards.count(), 8);
          let usHits = 0;
          for (let i = 0; i < sample; i++) {
            const blob = (await cards.nth(i).innerText().catch(() => '')).slice(0, 1200);
            if (usRelevanceFromCardText(blob)) usHits++;
          }
          if (usHits < Math.max(1, Math.ceil(sample * 0.25))) {
            cNotes.push(
              'Several visible cards do not obviously show US study location; may be multi-country or unspecified in snippet.'
            );
          }
        }
        let cStatus: ScenarioStatus = 'pass';
        let cFail: string | undefined;
        if (!hostOk) {
          cStatus = 'fail';
          cFail = 'Expected `host_cc` to include US after selecting United States.';
        }
        return {
          status: cStatus,
          startingUrl: cStart,
          finalUrl: cFinal,
          cardCountBefore: cCountBefore,
          cardCountAfter: cCountAfter,
          firstFiveTitles: cTitles,
          firstFiveChips: cChips,
          failReason: cFail,
          relevanceNotes: cNotes
        };
      })
    );

    // —— D. I'm from Canada ——
    scenarios.push(
      await execScenario(page, "D — I'm from (Canada)", 'filter-d-from-canada.png', async () => {
        await gotoScholarships(page, base);
        const dStart = page.url();
        const dCountBefore = await countCards(page);
        await dismissOpenUi(page);
        await waitHubFilterToolbarReady(page);
        const fromBtn = page.getByRole('button', { name: /from \(citizenship\)/i }).first();
        await fromBtn.waitFor({ state: 'visible', timeout: 25_000 });
        await fromBtn.click({ timeout: 20_000 });
        await page
          .getByRole('heading', { name: /I am from \(citizenship\)/i })
          .waitFor({ state: 'visible', timeout: 25_000 });
        const cit = citizenshipPanel(page);
        await cit.waitFor({ state: 'visible', timeout: 10_000 });
        await waitCitizenshipRowsLoaded(page);
        const countrySearch = cit.getByRole('textbox', { name: 'Search by country name' });
        await countrySearch.fill('Canada');
        await page.waitForTimeout(400);
        let caLabel = cit.locator('label').filter({ hasText: /Canada/i }).first();
        if (!(await caLabel.isVisible().catch(() => false))) {
          await countrySearch.fill('');
          await page.waitForTimeout(400);
          caLabel = cit.locator('li label, label').filter({ hasText: /^Canada$/i }).first();
        }
        await caLabel.waitFor({ state: 'visible', timeout: 25_000 });
        const caCb = caLabel.locator('input[type=checkbox]');
        if (await caCb.isDisabled().catch(() => false)) {
          throw new Error(
            'Canada citizenship row appears disabled (likely zero matching scholarships).'
          );
        }
        await caCb.click();
        await clickShowScholarships(cit);
        await cit.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
        await settleListing(page);
        const dFinal = page.url();
        const dCountAfter = await countCards(page);
        const dSp = parseUrlSearch(dFinal);
        const appOk = (dSp.get('app_cc') || '').toUpperCase().includes('CA');
        const dTitles = await getTitles(page);
        const dChips = await getVisibleChips(page);
        const dNotes: string[] = [];
        if (dCountAfter > 0) {
          const cards = page.locator('article[data-scholarship-card]');
          const sample = Math.min(await cards.count(), 8);
          let caHits = 0;
          for (let i = 0; i < sample; i++) {
            const blob = (await cards.nth(i).innerText().catch(() => '')).slice(0, 1200);
            if (canadaRelevanceFromCardText(blob)) caHits++;
          }
          if (caHits < Math.max(1, Math.ceil(sample * 0.25))) {
            dNotes.push(
              'Eligibility text on cards is not clearly Canada-specific for many rows; confirm catalog eligibility fields.'
            );
          }
        }
        let dStatus: ScenarioStatus = 'pass';
        let dFail: string | undefined;
        if (!appOk) {
          dStatus = 'fail';
          dFail = 'Expected `app_cc` to include CA after selecting Canada.';
        }
        return {
          status: dStatus,
          startingUrl: dStart,
          finalUrl: dFinal,
          cardCountBefore: dCountBefore,
          cardCountAfter: dCountAfter,
          firstFiveTitles: dTitles,
          firstFiveChips: dChips,
          failReason: dFail,
          relevanceNotes: dNotes
        };
      })
    );

    // —— E. Sort + retain filters ——
    scenarios.push(
      await execScenario(page, 'E — Sort without clearing category', 'filter-e-sort.png', async () => {
        await gotoScholarships(page, base);
        await applyStemCategoryOrFallback(page);
        const eStart = page.url();
        const eCountBefore = await countCards(page);
        const catBefore = parseUrlSearch(eStart).get('category') || '';
        await page.getByRole('button', { name: /^Sort:/i }).click();
        const sortBox = page.getByRole('listbox', { name: 'Sort options' });
        await sortBox.waitFor({ state: 'visible', timeout: 8000 });
        const newestBtn = sortBox.getByRole('button', { name: 'Newest' });
        const deadlineBtn = sortBox.getByRole('button', { name: 'Deadline soonest' });
        if (await newestBtn.isVisible().catch(() => false)) {
          await newestBtn.click();
        } else {
          await sortBox.getByRole('button', { name: 'Recommended' }).click();
        }
        await settleListing(page);
        let eFinal = page.url();
        let eSp = parseUrlSearch(eFinal);
        if (!eSp.get('sort') || eSp.get('sort') === 'magic') {
          await page.getByRole('button', { name: /^Sort:/i }).click();
          await sortBox.waitFor({ state: 'visible', timeout: 8000 });
          if (await deadlineBtn.isVisible().catch(() => false)) {
            await deadlineBtn.click().catch(() => {});
            await settleListing(page);
            eFinal = page.url();
            eSp = parseUrlSearch(eFinal);
          }
        }
        const eCountAfter = await countCards(page);
        const eTitles = await getTitles(page);
        const eChips = await getVisibleChips(page);
        const catAfter = eSp.get('category') || '';
        const sortAfter = eSp.get('sort') || '';
        const eNotes: string[] = [];
        let eStatus: ScenarioStatus = 'pass';
        let eFail: string | undefined;
        if (catBefore && catAfter !== catBefore) {
          eStatus = 'fail';
          eFail = 'Category param changed after sort; filters may have reset.';
        } else if (!sortAfter) {
          eStatus = 'warn';
          eNotes.push('Sort param absent in URL; sort may be implicit default only.');
        }
        return {
          status: eStatus,
          startingUrl: eStart,
          finalUrl: eFinal,
          cardCountBefore: eCountBefore,
          cardCountAfter: eCountAfter,
          firstFiveTitles: eTitles,
          firstFiveChips: eChips,
          failReason: eFail,
          relevanceNotes: eNotes
        };
      })
    );

    // —— F. More filters (deadline preset) ——
    scenarios.push(
      await execScenario(page, 'F — More filters (deadline > 4 weeks)', 'filter-f-more-filters.png', async () => {
        await gotoScholarships(page, base);
        const fStart = page.url();
        const fCountBefore = await countCards(page);
        await page.getByRole('button', { name: 'Open more filters' }).click();
        const more = page.getByRole('dialog', { name: 'More Filters' });
        await more.waitFor({ state: 'visible', timeout: 12_000 });
        await more.getByText('More than 4 weeks', { exact: true }).click();
        const applyMore = more.getByRole('button', { name: /Show [\d,]+ results/i });
        await applyMore.click({ timeout: 25_000 }).catch(async () => {
          await more.getByRole('button', { name: /Show results/i }).click();
        });
        await page.waitForTimeout(600);
        await page.keyboard.press('Escape').catch(() => {});
        await settleListing(page);
        const fFinal = page.url();
        const fCountAfter = await countCards(page);
        const fSp = parseUrlSearch(fFinal);
        const deadlineOk = fSp.get('deadline') === 'gt4w';
        const fTitles = await getTitles(page);
        const fChips = await getVisibleChips(page);
        let fStatus: ScenarioStatus = 'pass';
        let fFail: string | undefined;
        const fNotes: string[] = [];
        if (!deadlineOk) {
          fStatus = 'warn';
          fNotes.push('Expected `deadline=gt4w` in URL; may use alias or client-only state.');
        }
        if (fCountBefore > 5 && fCountAfter === 0) {
          fStatus = 'warn';
          fFail = 'Listing empty after More Filters apply.';
        }
        return {
          status: fStatus,
          startingUrl: fStart,
          finalUrl: fFinal,
          cardCountBefore: fCountBefore,
          cardCountAfter: fCountAfter,
          firstFiveTitles: fTitles,
          firstFiveChips: fChips,
          failReason: fFail,
          relevanceNotes: fNotes
        };
      })
    );

    // —— G. Combined STEM + US ——
    scenarios.push(
      await execScenario(page, 'G — Combined (category + Study in US)', 'filter-g-combined.png', async () => {
        await gotoScholarships(page, base);
        const gStart = page.url();
        const gCountBefore = await countCards(page);
        await applyStemCategoryOrFallback(page);
        await page.waitForTimeout(600);
        await applyStudyInUnitedStates(page);
        await settleListing(page);
        const gFinal = page.url();
        const gCountAfter = await countCards(page);
        const gSp = parseUrlSearch(gFinal);
        const gCat = gSp.get('category') || '';
        const gHost = (gSp.get('host_cc') || '').toUpperCase();
        const combinedOk = gHost.includes('US') && gCat.length > 0;
        const gTitles = await getTitles(page);
        const gChips = await getVisibleChips(page);
        const gNotes: string[] = [];
        let gStatus: ScenarioStatus = 'pass';
        let gFail: string | undefined;
        if (!combinedOk) {
          gStatus = 'fail';
          gFail =
            'Expected both category and host_cc=US in URL after combined category + United States.';
        }
        if (gCountAfter === 0 && gCountBefore > 0) {
          gStatus = gStatus === 'fail' ? 'fail' : 'warn';
          gNotes.push('No results for combined filters; intersection may be empty.');
        }
        return {
          status: gStatus,
          startingUrl: gStart,
          finalUrl: gFinal,
          cardCountBefore: gCountBefore,
          cardCountAfter: gCountAfter,
          firstFiveTitles: gTitles,
          firstFiveChips: gChips,
          failReason: gFail,
          relevanceNotes: gNotes
        };
      })
    );
  } finally {
    await browser.close();
  }

  const report: FilterAuditReport = {
    generatedAt: new Date().toISOString(),
    baseUrl: base,
    overallVerdict: verdictFromScenarios(scenarios),
    scenarios
  };

  const repoRoot = path.join(__dirname, '..');
  const reportForJson: FilterAuditReport = {
    ...report,
    scenarios: report.scenarios.map((s) => ({
      ...s,
      screenshotPath: path.relative(repoRoot, s.screenshotPath).replace(/\\/g, '/')
    }))
  };

  fs.writeFileSync(
    path.join(REPORT_ROOT, 'filter-audit.json'),
    JSON.stringify(reportForJson, null, 2),
    'utf8'
  );
  fs.writeFileSync(
    path.join(REPORT_ROOT, 'filter-audit.md'),
    renderMarkdown(reportForJson),
    'utf8'
  );

  console.log(`[filter-audit] Wrote reports under ${REPORT_ROOT}`);
  console.log(`[filter-audit] Verdict: ${reportForJson.overallVerdict}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
