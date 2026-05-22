/**
 * Stage 5D-1 — provider detail translation route gate smoke.
 * Local: SMOKE_BASE_URL=http://127.0.0.1:3020
 * Prod:  SMOKE_BASE_URL=https://scholarshiptop.com
 */
const BASE = (
  process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3020'
).replace(/\/$/, '');

const PILOT_PROVIDER_SLUG = 'loyola-university-chicago';
const PILOT_RESOURCE_SLUG = 'how-to-apply-for-scholarships';
const UNTRANSLATED_RESOURCE = 'verify-scholarship-winners-usa-previous-years';

type Check = {
  path: string;
  expectStatus: number;
  label: string;
};

const CHECKS: Check[] = [
  {
    path: `/providers/${PILOT_PROVIDER_SLUG}`,
    expectStatus: 200,
    label: 'EN provider detail'
  },
  {
    path: `/es/providers/${PILOT_PROVIDER_SLUG}`,
    expectStatus: 404,
    label: 'ES provider detail gate (no seed)'
  },
  {
    path: `/fr/providers/${PILOT_PROVIDER_SLUG}`,
    expectStatus: 404,
    label: 'FR provider detail gate (no seed)'
  },
  { path: '/es/providers', expectStatus: 200, label: 'ES providers hub' },
  { path: '/fr/providers', expectStatus: 200, label: 'FR providers hub' },
  { path: '/en', expectStatus: 404, label: '/en 404' },
  { path: '/es/scholarships/category/stem', expectStatus: 200, label: 'ES stem category' },
  { path: '/fr/scholarships/category/stem', expectStatus: 200, label: 'FR stem category' },
  {
    path: '/es/scholarships/category/hobbies',
    expectStatus: 404,
    label: 'ES hobbies category 404'
  },
  {
    path: '/fr/scholarships/category/hobbies',
    expectStatus: 404,
    label: 'FR hobbies category 404'
  },
  {
    path: `/es/resources/${PILOT_RESOURCE_SLUG}`,
    expectStatus: 200,
    label: 'ES resource pilot'
  },
  {
    path: `/fr/resources/${PILOT_RESOURCE_SLUG}`,
    expectStatus: 200,
    label: 'FR resource pilot'
  },
  {
    path: `/es/resources/${UNTRANSLATED_RESOURCE}`,
    expectStatus: 404,
    label: 'ES untranslated resource 404'
  },
  {
    path: '/es/scholarships/how-to-apply-for-a-scholarship-step-by-step',
    expectStatus: 404,
    label: 'ES scholarship detail safety 404'
  }
];

function extractMeta(html: string) {
  const canonical = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
  )?.[1];
  const hreflang: Record<string, string> = {};
  for (const m of html.matchAll(
    /<link[^>]+rel=["']alternate["'][^>]+hreflang=["']([^"']+)["'][^>]+href=["']([^"']+)["']/gi
  )) {
    hreflang[m[1]!.toLowerCase()] = m[2]!;
  }
  return { canonical, hreflang };
}

async function fetchPath(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  const html = await res.text();
  return { status: res.status, html };
}

async function main() {
  let failures = 0;
  console.log(`Stage 5D provider route gate — base: ${BASE}\n`);

  for (const check of CHECKS) {
    const { status } = await fetchPath(check.path);
    const ok = status === check.expectStatus;
    if (!ok) {
      failures += 1;
      console.error(
        `FAIL ${check.label}: ${check.path} → ${status} (expected ${check.expectStatus})`
      );
    } else {
      console.log(`OK   ${check.label}: ${status}`);
    }
  }

  const pilotSlug = process.env.I18N_PROVIDER_PILOT_SLUG?.trim().toLowerCase();
  if (pilotSlug) {
    for (const locale of ['es', 'fr'] as const) {
      const { status, html } = await fetchPath(`/${locale}/providers/${pilotSlug}`);
      if (status !== 200) {
        failures += 1;
        console.error(`FAIL seeded pilot /${locale}/providers/${pilotSlug} → ${status}`);
        continue;
      }
      console.log(`OK   seeded pilot /${locale}/providers/${pilotSlug} → 200`);
      const meta = extractMeta(html);
      if (!meta.canonical?.includes(`/${locale}/providers/${pilotSlug}`)) {
        failures += 1;
        console.error(`FAIL pilot canonical`, meta.canonical);
      }
      if (
        html.includes('Scholarships and profile for') &&
        !html.includes('Becas') &&
        !html.includes('Bourses')
      ) {
        failures += 1;
        console.error('FAIL English body fallback detected on localized provider page');
      }
    }
  }

  const esProviderSitemap = await fetch(`${BASE}/sitemaps/locale-es-providers-db.xml`);
  if (esProviderSitemap.status === 404) {
    console.log('OK   locale-es-providers-db.xml absent (no published rows)');
  } else if (esProviderSitemap.status === 200) {
    const count = ((await esProviderSitemap.text()).match(/<loc>/g) ?? []).length;
    console.log(`OK   locale-es-providers-db.xml loc count: ${count}`);
  } else {
    failures += 1;
    console.error(`FAIL provider ES sitemap HTTP ${esProviderSitemap.status}`);
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll Stage 5D provider route gate smoke checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
