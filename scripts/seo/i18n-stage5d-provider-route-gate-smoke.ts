/**
 * Stage 5D — provider detail route gate smoke.
 * Local: SMOKE_BASE_URL=http://127.0.0.1:3020
 * Prod:  SMOKE_BASE_URL=https://scholarshiptop.com
 *
 * After 5D-2 seed: I18N_PROVIDER_PILOT_SEEDED=1
 */
import { PROVIDER_PILOT_SLUGS } from '@/lib/i18n/providerPilot/providerPilotSlugs';

const BASE = (
  process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3020'
).replace(/\/$/, '');

const SEEDED = process.env.I18N_PROVIDER_PILOT_SEEDED === '1';
const PILOT_RESOURCE_SLUG = 'how-to-apply-for-scholarships';
const UNTRANSLATED_RESOURCE = 'verify-scholarship-winners-usa-previous-years';
const UNTRANSLATED_PROVIDER = 'stanford-university';

type Check = { path: string; expectStatus: number; label: string };

function buildChecks(): Check[] {
  const checks: Check[] = [];

  for (const slug of PROVIDER_PILOT_SLUGS) {
    checks.push({
      path: `/providers/${slug}`,
      expectStatus: 200,
      label: `EN ${slug}`
    });
    checks.push({
      path: `/es/providers/${slug}`,
      expectStatus: SEEDED ? 200 : 404,
      label: `ES ${slug}`
    });
    checks.push({
      path: `/fr/providers/${slug}`,
      expectStatus: SEEDED ? 200 : 404,
      label: `FR ${slug}`
    });
  }

  checks.push(
    { path: '/es/providers', expectStatus: 200, label: 'ES providers hub' },
    { path: '/fr/providers', expectStatus: 200, label: 'FR providers hub' },
    { path: '/en', expectStatus: 404, label: '/en 404' },
    {
      path: `/es/providers/${UNTRANSLATED_PROVIDER}`,
      expectStatus: 404,
      label: 'ES untranslated provider 404'
    },
    {
      path: `/fr/providers/${UNTRANSLATED_PROVIDER}`,
      expectStatus: 404,
      label: 'FR untranslated provider 404'
    },
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
  );

  return checks;
}

function extractMeta(html: string) {
  const canonical = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
  )?.[1];
  const robots = html.match(
    /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i
  )?.[1];
  const hreflang: Record<string, string> = {};
  for (const m of html.matchAll(
    /<link[^>]+rel=["']alternate["'][^>]+hreflang=["']([^"']+)["'][^>]+href=["']([^"']+)["']/gi
  )) {
    hreflang[m[1]!.toLowerCase()] = m[2]!;
  }
  return { canonical, robots, hreflang };
}

async function fetchPath(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  const html = await res.text();
  return { status: res.status, html };
}

async function main() {
  let failures = 0;
  console.log(
    `Stage 5D provider smoke — base: ${BASE} seeded=${SEEDED ? 'yes' : 'no'}\n`
  );

  for (const check of buildChecks()) {
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

  if (SEEDED) {
    const sampleSlug = PROVIDER_PILOT_SLUGS[0]!;
    const { html, status } = await fetchPath(`/es/providers/${sampleSlug}`);
    if (status !== 200) {
      failures += 1;
      console.error(`FAIL ES sample page ${status}`);
    } else {
      const meta = extractMeta(html);
      if (!meta.canonical?.includes(`/es/providers/${sampleSlug}`)) {
        failures += 1;
        console.error('FAIL ES canonical', meta.canonical);
      } else {
        console.log('OK   ES canonical self');
      }
      if (meta.hreflang.en && meta.hreflang.es && meta.hreflang.fr && meta.hreflang['x-default']) {
        console.log('OK   hreflang en/es/fr/x-default');
      } else {
        failures += 1;
        console.error('FAIL hreflang cluster', meta.hreflang);
      }
      if (!meta.robots?.toLowerCase().includes('index')) {
        failures += 1;
        console.error('FAIL robots index', meta.robots);
      } else {
        console.log('OK   robots index/follow');
      }
      const hasLegalName = html.includes('Loyola University Chicago');
      const hasLocalizedBody =
        html.includes('Departamento de Bellas Artes') ||
        html.includes('ScholarshipTop no es Loyola') ||
        html.includes('no concede becas');
      if (hasLegalName && hasLocalizedBody) {
        console.log('OK   legal name preserved + localized body');
      } else {
        failures += 1;
        console.error('FAIL localized content / legal name check', {
          hasLegalName,
          hasLocalizedBody
        });
      }
      if (html.includes('/en/') || html.includes('href="/en"')) {
        failures += 1;
        console.error('FAIL /en link on ES provider page');
      } else {
        console.log('OK   no /en links');
      }
    }

    for (const locale of ['es', 'fr'] as const) {
      const sm = await fetch(`${BASE}/sitemaps/locale-${locale}-providers-db.xml`);
      if (sm.status !== 200) {
        failures += 1;
        console.error(`FAIL locale-${locale}-providers-db.xml HTTP ${sm.status}`);
        continue;
      }
      const xml = await sm.text();
      const count = (xml.match(/<loc>/g) ?? []).length;
      console.log(`OK   locale-${locale}-providers-db.xml loc count: ${count}`);
      if (count !== 3) {
        failures += 1;
        console.error(`FAIL expected 3 ${locale} provider URLs, got ${count}`);
      }
    }

    const esResSm = await fetch(`${BASE}/sitemaps/locale-es-resources-db.xml`);
    if (esResSm.status === 200) {
      const resCount = ((await esResSm.text()).match(/<loc>/g) ?? []).length;
      console.log(`OK   locale-es-resources-db.xml still present (${resCount} locs)`);
      if (resCount < 25) {
        failures += 1;
        console.error('FAIL resource sitemap count regression');
      }
    } else {
      failures += 1;
      console.error(`FAIL resource ES sitemap HTTP ${esResSm.status}`);
    }
  } else {
    const esProviderSitemap = await fetch(`${BASE}/sitemaps/locale-es-providers-db.xml`);
    if (esProviderSitemap.status === 404) {
      console.log('OK   locale-es-providers-db.xml absent (no published rows)');
    } else if (esProviderSitemap.status === 200) {
      const count = ((await esProviderSitemap.text()).match(/<loc>/g) ?? []).length;
      console.log(`OK   locale-es-providers-db.xml loc count: ${count}`);
      if (count > 0 && !SEEDED) {
        failures += 1;
        console.error('FAIL unexpected provider sitemap before seed');
      }
    } else {
      failures += 1;
      console.error(`FAIL provider ES sitemap HTTP ${esProviderSitemap.status}`);
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll Stage 5D provider smoke checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
