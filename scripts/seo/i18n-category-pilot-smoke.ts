/**
 * Stage 4C category pilot HTTP smoke (requires seeded local/staging DB + next start).
 * Usage:
 *   $env:SCREENSHOT_BASE_URL='http://localhost:3020'
 *   npx tsx scripts/seo/i18n-category-pilot-smoke.ts
 */
const BASE = (
  process.env.SCREENSHOT_BASE_URL ??
  process.env.I18N_SMOKE_BASE_URL ??
  'http://localhost:3020'
).replace(/\/$/, '');

type Check = { path: string; expectStatus: number; label: string };

const CHECKS: Check[] = [
  { path: '/scholarships/category/stem', expectStatus: 200, label: 'EN stem' },
  { path: '/es/scholarships/category/stem', expectStatus: 200, label: 'ES stem' },
  { path: '/fr/scholarships/category/stem', expectStatus: 200, label: 'FR stem' },
  { path: '/scholarships/category/music', expectStatus: 200, label: 'EN music' },
  { path: '/es/scholarships/category/music', expectStatus: 200, label: 'ES music' },
  { path: '/fr/scholarships/category/music', expectStatus: 200, label: 'FR music' },
  { path: '/scholarships/category/safety', expectStatus: 200, label: 'EN safety' },
  { path: '/es/scholarships/category/safety', expectStatus: 200, label: 'ES safety' },
  { path: '/fr/scholarships/category/safety', expectStatus: 200, label: 'FR safety' },
  { path: '/es/scholarships/category/hobbies', expectStatus: 404, label: 'ES hobbies 404' },
  { path: '/fr/scholarships/category/hobbies', expectStatus: 404, label: 'FR hobbies 404' },
  {
    path: '/es/scholarships/category/not-real-category',
    expectStatus: 404,
    label: 'ES fake category 404'
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
  console.log(`Category pilot smoke — base: ${BASE}\n`);

  for (const check of CHECKS) {
    const url = `${BASE}${check.path}`;
    const res = await fetch(url, { redirect: 'follow' });
    const ok = res.status === check.expectStatus;
    if (!ok) {
      failures += 1;
      console.error(`FAIL ${check.label}: ${url} → ${res.status} (expected ${check.expectStatus})`);
    } else {
      console.log(`OK   ${check.label}: ${res.status}`);
    }
  }

  const esStem = await fetch(`${BASE}/es/scholarships/category/stem`);
  const html = await esStem.text();
  const meta = extractMeta(html);
  if (!meta.canonical?.includes('/es/scholarships/category/stem')) {
    failures += 1;
    console.error('FAIL ES stem canonical');
  } else {
    console.log('OK   ES stem canonical');
  }
  if (meta.hreflang.en && meta.hreflang.es && meta.hreflang.fr) {
    console.log('OK   ES stem hreflang cluster present');
  } else {
    failures += 1;
    console.error('FAIL ES stem hreflang', meta.hreflang);
  }
  if (html.includes('/en/') || html.includes('href="/en"')) {
    failures += 1;
    console.error('FAIL /en link found on ES stem page');
  } else {
    console.log('OK   no /en links on ES stem');
  }

  const sitemap = await fetch(`${BASE}/sitemaps/locale-es-categories.xml`);
  if (sitemap.status === 200) {
    const xml = await sitemap.text();
    const count = (xml.match(/<loc>/g) ?? []).length;
    console.log(`OK   locale-es-categories.xml loc count: ${count}`);
    if (count < 11) {
      failures += 1;
      console.error(`FAIL expected >= 11 ES category URLs, got ${count}`);
    }
  } else {
    failures += 1;
    console.error(`FAIL locale-es-categories.xml HTTP ${sitemap.status}`);
  }

  console.log(`\n${failures === 0 ? 'PASS' : `FAIL (${failures})`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
