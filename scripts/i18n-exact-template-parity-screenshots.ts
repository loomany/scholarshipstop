import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:3005';
const OUT = path.join(
  process.cwd(),
  'reports/seo/screenshots/i18n-stage2-exact-template-parity'
);

const paths = [
  '/',
  '/es',
  '/fr',
  '/scholarships',
  '/es/scholarships',
  '/fr/scholarships',
  '/essays',
  '/es/essays',
  '/fr/essays',
  '/providers',
  '/es/providers',
  '/fr/providers',
  '/compare',
  '/es/compare',
  '/fr/compare',
  '/resources',
  '/es/resources',
  '/fr/resources'
] as const;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const route of paths) {
    const slug = route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '-');
    const url = `${BASE}${route}`;
    for (const variant of ['desktop', 'mobile'] as const) {
      const page = await browser.newPage(
        variant === 'desktop'
          ? { viewport: { width: 1440, height: 900 } }
          : { viewport: { width: 390, height: 844 } }
      );
      await page.goto(url, { waitUntil: 'load', timeout: 120_000 });
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: path.join(OUT, `${slug}-${variant}.png`),
        fullPage: true
      });
      await page.close();
      console.log('saved', `${slug}-${variant}`);
    }
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
