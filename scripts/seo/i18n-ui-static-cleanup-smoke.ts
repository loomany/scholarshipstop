/**
 * P0 UI chrome smoke after ES/FR static translation cleanup.
 * Usage: SCREENSHOT_BASE_URL=http://localhost:3020 npx tsx scripts/seo/i18n-ui-static-cleanup-smoke.ts
 */
const BASE = (
  process.env.SCREENSHOT_BASE_URL ??
  process.env.I18N_SMOKE_BASE_URL ??
  'http://localhost:3020'
).replace(/\/$/, '');

const CHROME_MARKERS = [
  'Award Amount',
  'View Profile',
  'Countries',
  'Read more →',
  'Continue your scholarship search',
  'Explore →',
  'Filters',
  'Categories',
  'Showing 1–',
  'Search providers',
  'Search University vs University',
  'Profile enriched',
  'Active Scholarships',
  'Best for:',
  'Effort:',
  'Host: Not specified'
];

const ALLOWED_ENTITY = ['ScholarshipTop', 'MIT', 'Harvard', 'USD', 'GPA'];

type Check = { path: string; expectStatus: number };

const CHECKS: Check[] = [
  { path: '/es/scholarships', expectStatus: 200 },
  { path: '/fr/scholarships', expectStatus: 200 },
  { path: '/es/providers', expectStatus: 200 },
  { path: '/fr/providers', expectStatus: 200 },
  { path: '/es/compare/universities', expectStatus: 200 },
  { path: '/fr/compare/states', expectStatus: 200 },
  { path: '/es/resources', expectStatus: 200 },
  { path: '/fr/resources', expectStatus: 200 },
  { path: '/es/essays', expectStatus: 200 },
  { path: '/fr/essays', expectStatus: 200 },
  { path: '/es/subscription', expectStatus: 200 },
  { path: '/fr/subscription', expectStatus: 200 },
  { path: '/es/scholarships/category/stem', expectStatus: 200 },
  { path: '/es/scholarships/category/hobbies', expectStatus: 404 },
  {
    path: '/es/resources/how-to-apply-for-scholarships',
    expectStatus: 200
  },
  { path: '/en', expectStatus: 404 }
];

async function fetchHtml(path: string): Promise<{ status: number; html: string }> {
  const res = await fetch(`${BASE}${path}`, { redirect: 'follow' });
  return { status: res.status, html: await res.text() };
}

function chromeHits(html: string): string[] {
  const stripped = html
    .replace(/showCategories/g, '')
    .replace(/moreFilters/g, '')
    .replace(/openMoreFilters/g, '')
    .replace(/filtersOpen/g, '')
    .replace(/filtersAria/g, '');
  const hits: string[] = [];
  for (const m of CHROME_MARKERS) {
    if (m === 'Categories' || m === 'Filters') {
      const re = new RegExp(`\\b${m}\\b`);
      if (re.test(stripped)) hits.push(m);
      continue;
    }
    if (stripped.includes(m)) hits.push(m);
  }
  return hits;
}

async function main() {
  let failures = 0;
  console.log(`P0 UI static cleanup smoke — ${BASE}\n`);

  for (const { path, expectStatus } of CHECKS) {
    const { status, html } = await fetchHtml(path);
    if (status !== expectStatus) {
      failures += 1;
      console.error(`FAIL ${path}: expected ${expectStatus}, got ${status}`);
      continue;
    }
    if (expectStatus === 200 && (path.startsWith('/es') || path.startsWith('/fr'))) {
      const hits = chromeHits(html);
      if (hits.length > 0) {
        failures += 1;
        console.error(`FAIL ${path}: English chrome: ${hits.join(', ')}`);
      } else {
        console.log(`OK   ${path}: ${status}, no chrome markers`);
      }
    } else {
      console.log(`OK   ${path}: ${status}`);
    }
  }

  const esSub = await fetchHtml('/es/scholarships');
  if (!/Precios|subscription/i.test(esSub.html)) {
    console.log('NOTE /es/scholarships HTML may not include nav (client-only); check manually');
  }

  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nAll smoke checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
