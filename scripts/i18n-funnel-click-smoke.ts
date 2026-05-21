/**
 * Stage H: ES/FR funnel click-flow smoke.
 *
 * Verifies that:
 *  - Home CTA "Find Scholarships" / "Buscar becas" / "Chercher des bourses"
 *    on /es and /fr routes to the **localized** funnel (no English fallback).
 *  - Header "Sign in" link on /es and /fr lands on /es/signin or /fr/signin.
 *  - /es/get-scholarships, /fr/get-scholarships, /es/signin, /fr/signin render.
 *
 * Does NOT submit any form (we never send real auth requests from CI).
 *
 * Usage: SCREENSHOT_BASE_URL=http://localhost:3000 npx tsx scripts/i18n-funnel-click-smoke.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from 'playwright';

const BASE = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:3000';
const OUT_JSON = join(
  process.cwd(),
  'reports/seo/i18n-funnel-click-smoke-2026-05-19.json'
);
const OUT_MD = join(
  process.cwd(),
  'reports/seo/i18n-funnel-click-smoke-2026-05-19.md'
);

type CheckResult = {
  locale: 'es' | 'fr';
  name: string;
  step: string;
  pass: boolean;
  expected?: string;
  actual?: string;
  error?: string;
};

const RESULTS: CheckResult[] = [];

function record(r: CheckResult) {
  RESULTS.push(r);
  console.log(
    `${r.pass ? 'PASS' : 'FAIL'} [${r.locale}] ${r.name} :: ${r.step} ${r.actual ?? ''}`
  );
}

async function expectLocalePath(
  page: Page,
  locale: 'es' | 'fr',
  name: string,
  step: string,
  expectedPath: string
) {
  try {
    await page.waitForURL(
      (url) => url.pathname.replace(/\/$/, '') === expectedPath.replace(/\/$/, ''),
      { timeout: 30_000 }
    );
    const actual = new URL(page.url()).pathname;
    record({
      locale,
      name,
      step,
      pass: actual.replace(/\/$/, '') === expectedPath.replace(/\/$/, ''),
      expected: expectedPath,
      actual
    });
  } catch (e) {
    record({
      locale,
      name,
      step,
      pass: false,
      expected: expectedPath,
      actual: page.url(),
      error: e instanceof Error ? e.message.slice(0, 200) : String(e)
    });
  }
}

async function clickHomeCta(page: Page, locale: 'es' | 'fr') {
  await page.goto(`${BASE}/${locale}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  /** Find first visible link to localized scholarships hub or funnel. */
  const candidates = [
    `/${locale}/get-scholarships`,
    `/${locale}/scholarships`
  ];
  for (const candidate of candidates) {
    const link = page.locator(`a[href^="${candidate}"]`).first();
    try {
      await link.waitFor({ state: 'visible', timeout: 5_000 });
      await link.click();
      return;
    } catch {
      /* try next */
    }
  }
  throw new Error(`No home CTA found on /${locale}`);
}

async function checkLocale(locale: 'es' | 'fr') {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // 1) Home CTA → localized funnel/hub
  try {
    await clickHomeCta(page, locale);
    await expectLocalePath(
      page,
      locale,
      'Home CTA',
      'click main scholarship CTA',
      /* either /es/get-scholarships (guest) OR /es/scholarships (already-authed) — both acceptable */
      `/${locale}/get-scholarships`
    );
    // If we didn't land on get-scholarships, retry against scholarships hub.
    const finalPath = new URL(page.url()).pathname;
    if (!finalPath.startsWith(`/${locale}/`)) {
      record({
        locale,
        name: 'Home CTA',
        step: 'final path keeps locale',
        pass: false,
        expected: `/${locale}/...`,
        actual: finalPath
      });
    }
  } catch (e) {
    record({
      locale,
      name: 'Home CTA',
      step: 'click main scholarship CTA',
      pass: false,
      error: e instanceof Error ? e.message.slice(0, 200) : String(e)
    });
  }

  // 2) Direct visit /[locale]/get-scholarships
  try {
    const res = await page.goto(`${BASE}/${locale}/get-scholarships`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000
    });
    record({
      locale,
      name: 'Direct /get-scholarships',
      step: 'status',
      pass: res?.status() === 200,
      expected: '200',
      actual: String(res?.status() ?? '')
    });
  } catch (e) {
    record({
      locale,
      name: 'Direct /get-scholarships',
      step: 'goto',
      pass: false,
      error: e instanceof Error ? e.message.slice(0, 200) : String(e)
    });
  }

  // 3) /[locale]/signin landing → password_signin
  try {
    await page.goto(`${BASE}/${locale}/signin`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000
    });
    await expectLocalePath(
      page,
      locale,
      'Direct /signin',
      'auto-redirect to default view',
      `/${locale}/signin/password_signin`
    );
  } catch (e) {
    record({
      locale,
      name: 'Direct /signin',
      step: 'goto',
      pass: false,
      error: e instanceof Error ? e.message.slice(0, 200) : String(e)
    });
  }

  // 4) Header sign in link from /[locale]
  try {
    await page.goto(`${BASE}/${locale}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90_000
    });
    const signInLink = page
      .locator(
        `xpath=//main[@id="skip"]/preceding-sibling::nav[1]//a[@href="/${locale}/signin" or @href="/${locale}/signin/password_signin"]`
      )
      .first();
    await signInLink.waitFor({ state: 'visible', timeout: 60_000 });
    await signInLink.click();
    await expectLocalePath(
      page,
      locale,
      'Header SignIn',
      'click locale signin',
      `/${locale}/signin/password_signin`
    );
  } catch (e) {
    record({
      locale,
      name: 'Header SignIn',
      step: 'click',
      pass: false,
      error: e instanceof Error ? e.message.slice(0, 200) : String(e)
    });
  }

  // 5) Forgot password page
  try {
    const res = await page.goto(`${BASE}/${locale}/signin/forgot_password`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000
    });
    record({
      locale,
      name: 'Forgot password',
      step: 'status',
      pass: res?.status() === 200,
      expected: '200',
      actual: String(res?.status() ?? '')
    });
  } catch (e) {
    record({
      locale,
      name: 'Forgot password',
      step: 'goto',
      pass: false,
      error: e instanceof Error ? e.message.slice(0, 200) : String(e)
    });
  }

  await browser.close();
}

async function main() {
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  await checkLocale('es');
  await checkLocale('fr');

  const passed = RESULTS.filter((r) => r.pass).length;
  const failed = RESULTS.length - passed;

  const payload = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    summary: { total: RESULTS.length, passed, failed },
    results: RESULTS
  };
  writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2));

  const md = [
    '# i18n funnel click smoke (2026-05-19)',
    '',
    `Base URL: ${BASE}`,
    `Total: ${RESULTS.length} · Passed: ${passed} · Failed: ${failed}`,
    '',
    '| Locale | Check | Step | Pass | Expected | Actual | Error |',
    '|---|---|---|---|---|---|---|',
    ...RESULTS.map(
      (r) =>
        `| ${r.locale} | ${r.name} | ${r.step} | ${r.pass ? '✅' : '❌'} | ${r.expected ?? ''} | ${r.actual ?? ''} | ${r.error ?? ''} |`
    )
  ].join('\n');
  writeFileSync(OUT_MD, md);
  console.log(`Wrote ${OUT_JSON} and ${OUT_MD}`);
  if (failed > 0) process.exitCode = 1;
}

void main();
