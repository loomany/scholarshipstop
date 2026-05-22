/**
 * Post scale-up production smoke (7-hour task).
 */
const BASE = (process.env.SMOKE_BASE_URL ?? 'https://scholarshiptop.com').replace(
  /\/$/,
  ''
);

const SCHOLARSHIP_PILOT = [
  'climate-stripes-scholarship-14487',
  'china-university-of-petroleum-scholarship-1461',
  'creative-arts-scholarship-8932'
];

const PROVIDER_PILOT = ['princeton-university', 'columbia-university'];

const ESSAY_PILOT =
  'how-to-write-about-the-gap-between-expectation-and-reality-of-studying-in-america';

const COMPARE_UNI = 'austin-community-college-vs-midlands-technical-college';
const COMPARE_STATE = 'california-vs-texas';

async function status(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  return res.status;
}

async function main() {
  let failed = 0;
  const check = async (label: string, path: string, expect: number) => {
    const got = await status(path);
    if (got !== expect) {
      failed += 1;
      console.error(`FAIL ${label} ${path} expected ${expect} got ${got}`);
    } else {
      console.log(`OK   ${label} ${got}`);
    }
  };

  await check('/en 404', '/en', 404);
  await check('/es hub', '/es', 200);
  await check('/fr hub', '/fr', 200);

  for (const slug of SCHOLARSHIP_PILOT) {
    await check(`EN scholarship ${slug}`, `/scholarships/${slug}`, 200);
    await check(`ES scholarship ${slug}`, `/es/scholarships/${slug}`, 200);
    await check(`FR scholarship ${slug}`, `/fr/scholarships/${slug}`, 200);
  }
  await check('ES unseeded scholarship 404', '/es/scholarships/how-to-apply-for-a-scholarship-step-by-step', 404);

  for (const slug of PROVIDER_PILOT) {
    await check(`EN provider ${slug}`, `/providers/${slug}`, 200);
    await check(`ES provider ${slug}`, `/es/providers/${slug}`, 200);
    await check(`FR provider ${slug}`, `/fr/providers/${slug}`, 200);
  }
  await check('ES unseeded provider 404', '/es/providers/stanford-university', 404);

  await check('EN essay pilot', `/essays/${ESSAY_PILOT}`, 200);
  await check('ES essay pilot', `/es/essays/${ESSAY_PILOT}`, 200);
  await check('FR essay pilot', `/fr/essays/${ESSAY_PILOT}`, 200);
  await check('ES unseeded essay 404', '/es/essays/how-to-write-a-scholarship-essay', 404);

  await check('EN compare uni', `/compare/universities/${COMPARE_UNI}`, 200);
  await check('ES compare uni', `/es/compare/universities/${COMPARE_UNI}`, 200);
  await check('FR compare uni', `/fr/compare/universities/${COMPARE_UNI}`, 200);
  await check('EN compare state', `/compare/states/${COMPARE_STATE}`, 200);
  await check('ES compare state', `/es/compare/states/${COMPARE_STATE}`, 200);
  await check('FR compare state', `/fr/compare/states/${COMPARE_STATE}`, 200);
  await check('ES unseeded compare 404', '/es/compare/universities/harvard-university-vs-stanford-university', 404);

  await check('sitemap index', '/sitemap.xml', 200);

  if (failed) {
    console.error(`\n${failed} failure(s)`);
    process.exit(1);
  }
  console.log('\nAll production smoke checks passed.');
}

main();
