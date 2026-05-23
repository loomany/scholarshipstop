/**
 * Stage 5E-3 production regression smoke (hubs, pilots, IQ, sitemap).
 */
const MAIN = (process.env.SMOKE_BASE_URL ?? 'https://scholarshiptop.com').replace(/\/$/, '');
const IQ = (process.env.IQ_SMOKE_BASE_URL ?? 'https://iq.scholarshiptop.com').replace(/\/$/, '');

type Check = {
  path: string;
  expect: number;
  host?: 'main' | 'iq';
  altOk?: number[];
};

const CHECKS: Check[] = [
  { path: '/en', expect: 404, host: 'main' },
  { path: '/es', expect: 200 },
  { path: '/fr', expect: 200 },
  { path: '/es/scholarships/category/stem', expect: 200 },
  { path: '/fr/scholarships/category/stem', expect: 200 },
  { path: '/es/scholarships/hobbies', expect: 404 },
  { path: '/fr/scholarships/hobbies', expect: 404 },
  { path: '/es/resources/how-to-apply-for-scholarships', expect: 200 },
  { path: '/fr/resources/how-to-apply-for-scholarships', expect: 200 },
  { path: '/es/resources/fake-unseeded-resource-slug-xyz', expect: 404 },
  { path: '/fr/resources/fake-unseeded-resource-slug-xyz', expect: 404 },
  { path: '/es/providers/loyola-university-chicago', expect: 200 },
  { path: '/fr/providers/loyola-university-chicago', expect: 200 },
  { path: '/es/scholarships/climate-stripes-scholarship-14487', expect: 200 },
  { path: '/fr/scholarships/climate-stripes-scholarship-14487', expect: 200 },
  { path: '/es/scholarships/how-to-apply-for-a-scholarship-step-by-step', expect: 404 },
  { path: '/fr/scholarships/how-to-apply-for-a-scholarship-step-by-step', expect: 404 },
  { path: '/sitemap.xml', expect: 200 },
  { path: '/sitemaps/locale-es-scholarships-detail-db.xml', expect: 200 },
  { path: '/sitemaps/locale-fr-scholarships-detail-db.xml', expect: 200 },
  { path: '/es', expect: 200, host: 'iq' },
  { path: '/fr', expect: 200, host: 'iq' },
  { path: '/en', expect: 404, host: 'iq', altOk: [308] }
];

async function main() {
  const expectedDetail = Number(process.env.EXPECTED_DETAIL_SITEMAP ?? '56');
  let failed = 0;

  for (const c of CHECKS) {
    const base = c.host === 'iq' ? IQ : MAIN;
    const res = await fetch(`${base}${c.path}`, { redirect: 'manual' });
    const ok = res.status === c.expect || (c.altOk?.includes(res.status) ?? false);
    console.log(`${ok ? 'OK' : 'FAIL'} ${c.host ?? 'main'} ${c.path} → ${res.status} (expect ${c.expect})`);
    if (!ok) failed++;
  }

  const esXml = await (await fetch(`${MAIN}/sitemaps/locale-es-scholarships-detail-db.xml`)).text();
  const frXml = await (await fetch(`${MAIN}/sitemaps/locale-fr-scholarships-detail-db.xml`)).text();
  const esN = (esXml.match(/<loc>/g) ?? []).length;
  const frN = (frXml.match(/<loc>/g) ?? []).length;
  if (esN !== expectedDetail || frN !== expectedDetail) {
    failed++;
    console.error(`FAIL detail sitemap counts ES=${esN} FR=${frN} expected=${expectedDetail}`);
  } else {
    console.log(`OK   detail sitemaps ${esN}+${frN}`);
  }

  const iqEs = await fetch(`${IQ}/es`, { redirect: 'follow' });
  const iqHtml = await iqEs.text();
  if (!iqHtml.includes('data-iq-product-shell') && !iqHtml.includes('IQ-Style Score')) {
    failed++;
    console.error('FAIL IQ /es not IQ product shell');
  } else {
    console.log('OK   IQ /es product markers');
  }

  if (failed) {
    console.error(`\n${failed} failure(s)`);
    process.exit(1);
  }
  console.log('\nProduction regression smoke passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
