/**
 * One-off read-only production gap audit (2026-05-21).
 * Usage: SCREENSHOT_BASE_URL=https://scholarshiptop.com npx tsx scripts/seo/i18n-full-translation-gap-audit-run.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const BASE = (process.env.SCREENSHOT_BASE_URL ?? 'https://scholarshiptop.com').replace(
  /\/$/,
  ''
);

const ROUTES: { path: string; locale: 'es' | 'fr' | 'en'; section: string }[] = [
  { path: '/es/scholarships', locale: 'es', section: 'scholarships' },
  { path: '/fr/scholarships', locale: 'fr', section: 'scholarships' },
  { path: '/es/providers', locale: 'es', section: 'providers' },
  { path: '/fr/providers', locale: 'fr', section: 'providers' },
  { path: '/es/compare', locale: 'es', section: 'compare' },
  { path: '/fr/compare', locale: 'fr', section: 'compare' },
  { path: '/es/compare/universities', locale: 'es', section: 'compare-universities' },
  { path: '/fr/compare/universities', locale: 'fr', section: 'compare-universities' },
  { path: '/es/compare/states', locale: 'es', section: 'compare-states' },
  { path: '/fr/compare/states', locale: 'fr', section: 'compare-states' },
  {
    path: '/es/compare/scholarship-vs-grant',
    locale: 'es',
    section: 'compare-static'
  },
  {
    path: '/fr/compare/scholarship-vs-grant',
    locale: 'fr',
    section: 'compare-static'
  },
  {
    path: '/es/compare/no-essay-vs-essay-scholarships',
    locale: 'es',
    section: 'compare-static'
  },
  {
    path: '/fr/compare/no-essay-vs-essay-scholarships',
    locale: 'fr',
    section: 'compare-static'
  },
  { path: '/es/resources', locale: 'es', section: 'resources' },
  { path: '/fr/resources', locale: 'fr', section: 'resources' },
  { path: '/es/essays', locale: 'es', section: 'essays' },
  { path: '/fr/essays', locale: 'fr', section: 'essays' },
  { path: '/es/subscription', locale: 'es', section: 'subscription' },
  { path: '/fr/subscription', locale: 'fr', section: 'subscription' },
  { path: '/es/scholarships/category/stem', locale: 'es', section: 'category-pilot' },
  { path: '/fr/scholarships/category/stem', locale: 'fr', section: 'category-pilot' },
  { path: '/es/scholarships/category/hobbies', locale: 'es', section: 'category-pilot' },
  { path: '/fr/scholarships/category/hobbies', locale: 'fr', section: 'category-pilot' },
  { path: '/es/resources/how-to-find-scholarships', locale: 'es', section: 'resources-static' },
  { path: '/es/essays/examples', locale: 'es', section: 'essays-static' }
];

/** UI chrome markers — should NOT appear on ES/FR pages */
const UI_MARKERS: { pattern: RegExp; label: string; bucket: string }[] = [
  { pattern: /\bNEW\b/, label: 'NEW', bucket: 'A' },
  { pattern: /\bAward Amount\b/i, label: 'Award Amount', bucket: 'A' },
  { pattern: /\bRequirements\b/i, label: 'Requirements', bucket: 'A' },
  { pattern: /\bView Profile\b/i, label: 'View Profile', bucket: 'A' },
  { pattern: /\bRead more\b/i, label: 'Read more', bucket: 'A' },
  { pattern: /\bShowing \d/i, label: 'Showing N', bucket: 'A' },
  { pattern: /\bCountries\b/i, label: 'Countries', bucket: 'A' },
  { pattern: /\bCategories\b/i, label: 'Categories', bucket: 'A' },
  { pattern: /\bBest for:/i, label: 'Best for:', bucket: 'A' },
  { pattern: /\bEffort:/i, label: 'Effort:', bucket: 'A' },
  { pattern: /\bSource:/i, label: 'Source:', bucket: 'A' },
  { pattern: /\bNot relevant\b/i, label: 'Not relevant', bucket: 'A' },
  { pattern: /\bSave\b(?!\s*✓)/, label: 'Save', bucket: 'A' },
  { pattern: /\bHost\b/i, label: 'Host', bucket: 'A' },
  { pattern: /\bProfile enriched\b/i, label: 'Profile enriched', bucket: 'A' },
  { pattern: /\bActive Scholarships?\b/i, label: 'Active Scholarship(s)', bucket: 'A' },
  { pattern: /\bContinue your scholarship search\b/i, label: 'Continue your scholarship search', bucket: 'A' },
  { pattern: /\bExplore →/i, label: 'Explore →', bucket: 'A' },
  { pattern: /\bFinding Scholarships\b/i, label: 'Finding Scholarships', bucket: 'A' },
  { pattern: /\bUniversity vs University\b/i, label: 'University vs University', bucket: 'B' },
  { pattern: /\bState vs State\b/i, label: 'State vs State', bucket: 'B' },
  { pattern: /\bSearch University\b/i, label: 'Search University', bucket: 'A' },
  { pattern: /\bAll topics\b/i, label: 'All topics', bucket: 'A' },
  { pattern: /\bPricing\b/i, label: 'Pricing (nav)', bucket: 'A' },
  { pattern: /\bCitizenship not specified\b/i, label: 'Citizenship not specified', bucket: 'B' },
  { pattern: /\bEducation\b/i, label: 'Education (taxonomy)', bucket: 'B' },
  { pattern: /\bFew Requirements\b/i, label: 'Few Requirements', bucket: 'B' },
  { pattern: /\bGraduate\b/i, label: 'Graduate', bucket: 'B' }
];

type Row = {
  url: string;
  locale: string;
  section: string;
  status: number;
  marker: string;
  bucket: string;
  snippet: string;
};

async function extractPageText(page: import('playwright').Page): Promise<string> {
  return page.evaluate(() => {
    const nav = document.querySelector('header nav, nav') as HTMLElement | null;
    const main = document.querySelector('main#skip, main') as HTMLElement | null;
    const footer = document.querySelector('footer') as HTMLElement | null;
    return [nav?.innerText, main?.innerText, footer?.innerText].filter(Boolean).join('\n');
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const rows: Row[] = [];
  const statusByUrl = new Map<string, number>();

  for (const route of ROUTES) {
    const url = `${BASE}${route.path}`;
    const context = await browser.newContext();
    const page = await context.newPage();
    let status = 0;
    let text = '';
    try {
      const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 90_000 });
      status = res?.status() ?? 0;
      await page.waitForTimeout(3500);
      if (route.section === 'scholarships' && status === 200) {
        for (const label of ['Categorías', 'Catégories', 'Categories']) {
          const btn = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
          if (await btn.isVisible().catch(() => false)) {
            await btn.click().catch(() => undefined);
            await page.waitForTimeout(800);
            break;
          }
        }
      }
      text = await extractPageText(page);
    } catch (e) {
      text = String(e);
    }
    statusByUrl.set(url, status);

    for (const m of UI_MARKERS) {
      if (m.pattern.test(text)) {
        const idx = text.search(m.pattern);
        const snippet = text.slice(Math.max(0, idx - 40), idx + 80).replace(/\s+/g, ' ');
        rows.push({
          url,
          locale: route.locale,
          section: route.section,
          status,
          marker: m.label,
          bucket: m.bucket,
          snippet
        });
      }
    }
    await context.close();
    console.log(`${route.path} → ${status} (${rows.filter((r) => r.url === url).length} hits)`);
  }

  await browser.close();

  const outDir = join(process.cwd(), 'reports/seo');
  mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, 'i18n-full-translation-gap-audit-run-2026-05-21.json');
  writeFileSync(
    jsonPath,
    JSON.stringify({ base: BASE, generatedAt: new Date().toISOString(), statusByUrl: Object.fromEntries(statusByUrl), rows }, null, 2)
  );
  console.log(`Wrote ${jsonPath} (${rows.length} marker hits)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
