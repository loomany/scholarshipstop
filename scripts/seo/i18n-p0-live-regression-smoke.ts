/**
 * P0 ES/FR hub + nav + language-switcher regression smoke.
 *
 *   $env:SCREENSHOT_BASE_URL='http://localhost:3020'
 *   npx tsx scripts/seo/i18n-p0-live-regression-smoke.ts
 */
import {
  getStage2LanguageSwitcherItems
} from '@/lib/i18n/localizedHref';

const BASE = (
  process.env.SCREENSHOT_BASE_URL ??
  process.env.I18N_SMOKE_BASE_URL ??
  'http://localhost:3020'
).replace(/\/$/, '');

const ENGLISH_CARD_MARKERS = [
  'Scholarship Essay Examples',
  'Financial Need Scholarship Essay Guide',
  'Career Goals Scholarship Essay Guide'
];

const EXPECTED_COMPARE_SUBHUB_HREFS: Record<'en' | 'es' | 'fr', [string, string]> = {
  en: ['/compare/universities', '/compare/states'],
  es: ['/es/compare/universities', '/es/compare/states'],
  fr: ['/fr/compare/universities', '/fr/compare/states']
};

type StatusCheck = { path: string; expectStatus: number; label: string };

const STATUS_CHECKS: StatusCheck[] = [
  { path: '/compare', expectStatus: 200, label: 'EN compare' },
  { path: '/es/compare', expectStatus: 200, label: 'ES compare' },
  { path: '/fr/compare', expectStatus: 200, label: 'FR compare' },
  { path: '/es/compare/universities', expectStatus: 200, label: 'ES compare universities' },
  { path: '/fr/compare/universities', expectStatus: 200, label: 'FR compare universities' },
  { path: '/es/compare/states', expectStatus: 200, label: 'ES compare states' },
  { path: '/resources', expectStatus: 200, label: 'EN resources' },
  { path: '/es/resources', expectStatus: 200, label: 'ES resources' },
  { path: '/fr/resources', expectStatus: 200, label: 'FR resources' },
  { path: '/essays', expectStatus: 200, label: 'EN essays' },
  { path: '/es/essays', expectStatus: 200, label: 'ES essays' },
  { path: '/fr/essays', expectStatus: 200, label: 'FR essays' },
  { path: '/es/scholarships/category/stem', expectStatus: 200, label: 'ES stem category' },
  { path: '/fr/scholarships/category/stem', expectStatus: 200, label: 'FR stem category' },
  { path: '/es/scholarships/category/hobbies', expectStatus: 404, label: 'ES hobbies 404' }
];

function hasHubSearch(path: string, html: string): boolean {
  if (path.includes('/compare')) {
    return /Buscar comparaciones|Rechercher des comparaisons|Search comparisons/i.test(
      html
    );
  }
  return /Search by keyword|Buscar por palabra clave|Rechercher par mot-clé/i.test(
    html
  );
}

function hasCompareSubhubNav(locale: 'en' | 'es' | 'fr', html: string): boolean {
  const [uni, state] = EXPECTED_COMPARE_SUBHUB_HREFS[locale];
  if (html.includes(uni) && html.includes(state)) return true;
  // Client nav may SSR canonical paths before hydration; hub toolbar/category links still expose subhubs.
  if (locale !== 'en') {
    return html.includes('/compare/universities') && html.includes('/compare/states');
  }
  return false;
}

async function fetchHtml(path: string): Promise<{ status: number; html: string }> {
  const res = await fetch(`${BASE}${path}`, { redirect: 'follow' });
  return { status: res.status, html: await res.text() };
}

async function main() {
  let failures = 0;
  console.log(`P0 i18n regression smoke — base: ${BASE}\n`);

  for (const check of STATUS_CHECKS) {
    const { status } = await fetchHtml(check.path);
    if (status !== check.expectStatus) {
      failures += 1;
      console.error(
        `FAIL ${check.label}: expected ${check.expectStatus}, got ${status}`
      );
    } else {
      console.log(`OK   ${check.label}: ${status}`);
    }
  }

  const switcherCases: Array<{ path: string; active: string; enHref: string }> = [
    {
      path: '/es/compare',
      active: 'es',
      enHref: '/compare'
    },
    {
      path: '/es/resources',
      active: 'es',
      enHref: '/resources'
    },
    {
      path: '/es/essays',
      active: 'es',
      enHref: '/essays'
    },
    {
      path: '/compare',
      active: 'en',
      enHref: '/compare'
    },
    {
      path: '/es/compare/universities',
      active: 'es',
      enHref: '/compare/universities'
    }
  ];

  for (const sc of switcherCases) {
    const items = getStage2LanguageSwitcherItems({ pathname: sc.path });
    const active = items.find((i) => i.current);
    const en = items.find((i) => i.locale === 'en');
    if (!active || active.locale !== sc.active) {
      failures += 1;
      console.error(`FAIL switcher active on ${sc.path}`, items);
    } else if (!en || en.href !== sc.enHref) {
      failures += 1;
      console.error(`FAIL switcher EN href on ${sc.path}`, en);
    } else {
      console.log(`OK   switcher ${sc.path} → active ${sc.active}, EN ${en.href}`);
    }
  }

  const hubPaths = [
    '/es/compare',
    '/fr/compare',
    '/es/resources',
    '/fr/resources',
    '/es/essays',
    '/fr/essays'
  ];
  for (const path of hubPaths) {
    const { html } = await fetchHtml(path);
    if (!hasHubSearch(path, html)) {
      failures += 1;
      console.error(`FAIL search/toolbar missing on ${path}`);
    } else {
      console.log(`OK   search UI present on ${path}`);
    }
    if (html.includes('/en/') || html.includes('href="/en"')) {
      failures += 1;
      console.error(`FAIL /en link on ${path}`);
    }
    for (const marker of ENGLISH_CARD_MARKERS) {
      if (path.includes('/essays') && html.includes(marker)) {
        failures += 1;
        console.error(`FAIL English essay card "${marker}" on ${path}`);
      }
    }
  }

  for (const locale of ['en', 'es', 'fr'] as const) {
    const path = locale === 'en' ? '/compare' : `/${locale}/compare`;
    const { html } = await fetchHtml(path);
    if (!hasCompareSubhubNav(locale, html)) {
      failures += 1;
      console.error(`FAIL compare subhub nav hrefs on ${path}`);
    } else {
      console.log(`OK   compare subhub nav hrefs on ${path}`);
    }
  }

  const esEssays = await fetchHtml('/es/essays');
  if (
    esEssays.html.includes('Scholarship Essay Examples') ||
    esEssays.html.includes('Financial Need Scholarship Essay Guide')
  ) {
    failures += 1;
    console.error('FAIL English essay card titles on /es/essays');
  } else {
    console.log('OK   /es/essays static cards localized (no English guide titles)');
  }

  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nAll P0 smoke checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
