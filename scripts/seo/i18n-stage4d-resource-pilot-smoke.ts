/**
 * Stage 4D resource pilot HTTP smoke (local/staging + seeded DB + next start).
 * Usage:
 *   $env:SCREENSHOT_BASE_URL='http://localhost:3020'
 *   npx tsx scripts/seo/i18n-stage4d-resource-pilot-smoke.ts
 */
const BASE = (
  process.env.SCREENSHOT_BASE_URL ??
  process.env.I18N_SMOKE_BASE_URL ??
  'http://localhost:3020'
).replace(/\/$/, '');

const PILOT_SLUGS = [
  'avoid-scholarship-scams-targeting-families',
  'types-of-scholarships-usa-explained',
  'how-to-write-a-winning-scholarship-essay',
  'scholarship-faq-low-gpa-students',
  'verify-scholarship-emails-usa'
] as const;

const UNTRANSLATED_SLUG = 'verify-scholarship-winners-usa-previous-years';

type Check = { path: string; expectStatus: number; label: string };

const CHECKS: Check[] = [
  ...PILOT_SLUGS.flatMap((slug) => [
    { path: `/resources/${slug}`, expectStatus: 200, label: `EN ${slug}` },
    { path: `/es/resources/${slug}`, expectStatus: 200, label: `ES ${slug}` },
    { path: `/fr/resources/${slug}`, expectStatus: 200, label: `FR ${slug}` }
  ]),
  {
    path: `/es/resources/${UNTRANSLATED_SLUG}`,
    expectStatus: 404,
    label: 'ES untranslated 404'
  },
  {
    path: `/fr/resources/${UNTRANSLATED_SLUG}`,
    expectStatus: 404,
    label: 'FR untranslated 404'
  },
  {
    path: '/es/resources/not-real-resource-xyz',
    expectStatus: 404,
    label: 'ES fake slug 404'
  },
  { path: '/es/scholarships/category/stem', expectStatus: 200, label: 'ES stem category' },
  { path: '/fr/scholarships/category/stem', expectStatus: 200, label: 'FR stem category' },
  { path: '/es/scholarships/category/hobbies', expectStatus: 404, label: 'ES hobbies 404' },
  {
    path: '/es/scholarships/how-to-apply-for-a-scholarship-step-by-step',
    expectStatus: 404,
    label: 'ES detail 404 safety'
  }
];

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

async function main() {
  let failures = 0;
  console.log(`Resource pilot smoke — base: ${BASE}\n`);

  for (const check of CHECKS) {
    const url = `${BASE}${check.path}`;
    const res = await fetch(url, { redirect: 'follow' });
    const ok = res.status === check.expectStatus;
    if (!ok) {
      failures += 1;
      console.error(
        `FAIL ${check.label}: ${url} → ${res.status} (expected ${check.expectStatus})`
      );
    } else {
      console.log(`OK   ${check.label}: ${res.status}`);
    }
  }

  const sampleSlug = PILOT_SLUGS[0]!;
  const esRes = await fetch(`${BASE}/es/resources/${sampleSlug}`);
  const html = await esRes.text();
  const meta = extractMeta(html);

  if (!meta.canonical?.includes(`/es/resources/${sampleSlug}`)) {
    failures += 1;
    console.error('FAIL ES canonical', meta.canonical);
  } else {
    console.log('OK   ES canonical self');
  }

  if (meta.hreflang.en && meta.hreflang.es && meta.hreflang.fr) {
    console.log('OK   hreflang en/es/fr');
  } else {
    failures += 1;
    console.error('FAIL hreflang cluster', meta.hreflang);
  }

  if (html.includes('/en/') || html.includes('href="/en"')) {
    failures += 1;
    console.error('FAIL /en link on ES resource page');
  } else {
    console.log('OK   no /en links');
  }

  if (
    html.toLowerCase().includes('scholarshiptop does not award') ||
    html.toLowerCase().includes('no concede becas') ||
    html.toLowerCase().includes('n’accorde pas de bourses')
  ) {
    console.log('OK   disclaimer present (heuristic)');
  }

  const esSitemap = await fetch(`${BASE}/sitemaps/locale-es-resources-db.xml`);
  if (esSitemap.status === 200) {
    const xml = await esSitemap.text();
    const count = (xml.match(/<loc>/g) ?? []).length;
    console.log(`OK   locale-es-resources-db.xml loc count: ${count}`);
    if (count < 25) {
      failures += 1;
      console.error(`FAIL expected >= 25 ES resource DB URLs, got ${count}`);
    }
    if (xml.includes(UNTRANSLATED_SLUG)) {
      failures += 1;
      console.error('FAIL untranslated slug in ES sitemap');
    }
  } else {
    failures += 1;
    console.error(`FAIL locale-es-resources-db.xml HTTP ${esSitemap.status}`);
  }

  const frSitemap = await fetch(`${BASE}/sitemaps/locale-fr-resources-db.xml`);
  if (frSitemap.status === 200) {
    const count = ((await frSitemap.text()).match(/<loc>/g) ?? []).length;
    console.log(`OK   locale-fr-resources-db.xml loc count: ${count}`);
    if (count < 25) {
      failures += 1;
      console.error(`FAIL expected >= 25 FR resource DB URLs, got ${count}`);
    }
  } else {
    failures += 1;
    console.error(`FAIL locale-fr-resources-db.xml HTTP ${frSitemap.status}`);
  }

  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nAll resource pilot smoke checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
