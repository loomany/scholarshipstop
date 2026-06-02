/**
 * Stage 4C.4 — Production deploy smoke (read-only HTTP).
 */
const BASE = (process.env.I18N_SMOKE_BASE_URL ?? 'https://scholarshiptop.com').replace(
  /\/$/,
  ''
);

type Check = { path: string; expect: number; label: string };

const ROUTES: Check[] = [
  { path: '/scholarships/category/stem', expect: 200, label: 'EN stem' },
  { path: '/es/scholarships/category/stem', expect: 200, label: 'ES stem' },
  { path: '/fr/scholarships/category/stem', expect: 200, label: 'FR stem' },
  { path: '/es/scholarships/category/music', expect: 200, label: 'ES music' },
  { path: '/fr/scholarships/category/music', expect: 200, label: 'FR music' },
  { path: '/es/scholarships/category/safety', expect: 200, label: 'ES safety' },
  { path: '/fr/scholarships/category/safety', expect: 200, label: 'FR safety' },
  { path: '/es/scholarships/category/hobbies', expect: 404, label: 'ES hobbies' },
  { path: '/fr/scholarships/category/hobbies', expect: 404, label: 'FR hobbies' },
  { path: '/es/scholarships/category/miscellaneous', expect: 404, label: 'ES misc' },
  { path: '/fr/scholarships/category/miscellaneous', expect: 404, label: 'FR misc' },
  {
    path: '/es/scholarships/category/not-real-category',
    expect: 404,
    label: 'ES fake'
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

async function fetchStatus(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'follow' });
  return { status: res.status, html: await res.text() };
}

async function main() {
  let failures = 0;
  console.log(`Production deploy smoke — ${BASE}\n`);

  for (const c of ROUTES) {
    const { status } = await fetchStatus(c.path);
    const ok = status === c.expect;
    if (!ok) {
      failures++;
      console.error(`FAIL ${c.label}: ${status} (expected ${c.expect})`);
    } else {
      console.log(`OK   ${c.label}: ${status}`);
    }
  }

  const es = await fetchStatus('/es/scholarships/category/stem');
  const meta = extractMeta(es.html);
  const spanish =
    /Becas STEM|becas STEM/i.test(es.html) || /categoría STEM/i.test(es.html);
  if (!spanish) {
    failures++;
    console.error('FAIL ES stem: no Spanish title pattern detected');
  } else {
    console.log('OK   ES stem: Spanish content detected');
  }
  if (meta.canonical?.includes('/es/scholarships/category/stem')) {
    console.log('OK   ES stem canonical');
  } else {
    failures++;
    console.error('FAIL ES stem canonical', meta.canonical);
  }
  if (meta.hreflang.en && meta.hreflang.es && meta.hreflang.fr) {
    console.log('OK   ES stem hreflang cluster');
  } else {
    failures++;
    console.error('FAIL ES stem hreflang', meta.hreflang);
  }
  if (es.html.includes('/en/')) {
    failures++;
    console.error('FAIL ES stem: /en/ link found');
  } else {
    console.log('OK   no /en links on ES stem');
  }

  const smIdx = await fetch(`${BASE}/sitemap.xml`);
  console.log(`sitemap.xml: ${smIdx.status}`);
  if (smIdx.status !== 200) failures++;

  const esCat = await fetch(`${BASE}/sitemaps/locale-es-categories.xml`);
  const frCat = await fetch(`${BASE}/sitemaps/locale-fr-categories.xml`);
  if (esCat.status === 200 && frCat.status === 200) {
    const esN = (await esCat.text()).match(/<loc>/g)?.length ?? 0;
    const frN = (await frCat.text()).match(/<loc>/g)?.length ?? 0;
    console.log(`OK   locale-es-categories: ${esN} locs`);
    console.log(`OK   locale-fr-categories: ${frN} locs`);
    if (esN < 11 || frN < 11) failures++;
  } else {
    failures++;
    console.error(`FAIL sitemaps: es=${esCat.status} fr=${frCat.status}`);
  }

  // Detail safety: discover one EN detail slug from hub page link
  const hub = await fetchStatus('/scholarships/category/stem');
  const slugMatch = hub.html.match(/href="\/scholarships\/([a-z0-9-]+)"/i);
  const detailSlug = slugMatch?.[1];
  if (detailSlug && !detailSlug.includes('category')) {
    const enD = await fetchStatus(`/scholarships/${detailSlug}`);
    const esD = await fetchStatus(`/es/scholarships/${detailSlug}`);
    const frD = await fetchStatus(`/fr/scholarships/${detailSlug}`);
    console.log(`detail ${detailSlug}: EN=${enD.status} ES=${esD.status} FR=${frD.status}`);
    if (enD.status !== 200) failures++;
    if (esD.status !== 404) failures++;
    if (frD.status !== 404) failures++;
  } else {
    console.log('SKIP detail slug (no listing link on EN stem — empty category?)');
  }

  console.log(`\n${failures === 0 ? 'PASS' : `FAIL (${failures})`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
