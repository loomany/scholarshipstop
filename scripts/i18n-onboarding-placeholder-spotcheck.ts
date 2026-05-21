/**
 * Spot-check localized onboarding country placeholder (Playwright).
 * Usage: SCREENSHOT_BASE_URL=http://localhost:3020 npx tsx scripts/i18n-onboarding-placeholder-spotcheck.ts
 */
import { chromium } from 'playwright';

const BASE = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:3020';

const CASES = [
  { path: '/es/onboarding?step=1', expect: 'Selecciona o escribe tu país' },
  { path: '/fr/onboarding?step=1', expect: 'Sélectionnez ou tapez votre pays' }
] as const;

async function main() {
  const browser = await chromium.launch({ headless: true });
  let failed = false;
  for (const { path, expect } of CASES) {
    const page = await browser.newPage();
    const res = await page.goto(`${BASE}${path}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000
    });
    await page
      .locator('#country-first-country')
      .waitFor({ state: 'visible', timeout: 30_000 })
      .catch(() => undefined);
    await page.waitForTimeout(1500);
    const ph = await page.locator('#country-first-country').getAttribute('placeholder');
    const url = page.url();
    const ok = ph === expect && url.includes(path.split('?')[0]!);
    console.log(
      ok ? `OK   ${path} placeholder=${ph} url=${url}` : `FAIL ${path} placeholder=${ph} url=${url} expected=${expect}`
    );
    if (!ok) failed = true;
    await page.close();
  }
  await browser.close();
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
