/**
 * Stage 5A read-only production audit runner (local only, do not commit).
 */
const MAIN = 'https://scholarshiptop.com';
const IQ = 'https://iq.scholarshiptop.com';

type Row = {
  url: string;
  status: number;
  canonical: string;
  robots: string;
  hasSwitcher: boolean;
  englishHits: string[];
};

async function probe(base: string, path: string): Promise<Row> {
  const url = `${base}${path}`;
  const res = await fetch(url, { redirect: 'follow' });
  const html = await res.text();
  const canon =
    html.match(/rel="canonical"[^>]*href="([^"]+)"/i)?.[1] ?? '';
  const robots =
    html.match(/name="robots"[^>]*content="([^"]+)"/i)?.[1] ?? '';
  const hasSwitcher = /Español|Français|language-switcher/i.test(html);
  const markers = [
    'View Profile',
    'On this page',
    'Create account',
    'Sign in',
    'About this provider',
    'Official source available',
    'Profile enriched',
    'Continue your scholarship search',
    'Award Amount',
    'Filters',
    'Start IQ test',
    'Step 1 of',
    'Carefully calibrated questions'
  ];
  const englishHits = markers.filter((m) => html.includes(m));
  return {
    url: path,
    status: res.status,
    canonical: canon,
    robots,
    hasSwitcher,
    englishHits
  };
}

async function main() {
  const mainPaths = [
    '/providers/loyola-university-chicago',
    '/es/providers/loyola-university-chicago',
    '/fr/providers/loyola-university-chicago',
    '/essays/how-to-write-about-the-gap-between-expectation-and-reality-of-studying-in-america',
    '/es/essays/how-to-write-about-the-gap-between-expectation-and-reality-of-studying-in-america',
    '/fr/essays/how-to-write-about-the-gap-between-expectation-and-reality-of-studying-in-america',
    '/account',
    '/es/account',
    '/fr/account',
    '/signin',
    '/es/signin',
    '/fr/signin',
    '/onboarding',
    '/es/onboarding',
    '/fr/onboarding',
    '/subscription',
    '/es/subscription',
    '/subscription/success',
    '/es/subscription/success',
    '/scholarships/climate-stripes-scholarship-14487',
    '/es/scholarships/climate-stripes-scholarship-14487',
    '/fr/scholarships/climate-stripes-scholarship-14487',
    '/compare/universities',
    '/es/compare/universities',
    '/resources/how-to-apply-for-scholarships',
    '/es/resources/how-to-apply-for-scholarships',
    '/en',
    '/compare/universities/harvard-university-vs-massachusetts-institute-of-technology',
    '/es/compare/universities/harvard-university-vs-massachusetts-institute-of-technology',
    '/essays/examples',
    '/es/essays/examples'
  ];
  const iqPaths = ['/', '/assessment', '/scholarship-match'];

  console.log('MAIN\n');
  for (const p of mainPaths) {
    const r = await probe(MAIN, p);
    console.log(
      `${r.status}\t${p}\tswitcher=${r.hasSwitcher}\thits=${r.englishHits.join(',') || '-'}\tcanon=${r.canonical}`
    );
  }
  console.log('\nIQ\n');
  for (const p of iqPaths) {
    const r = await probe(IQ, p);
    console.log(
      `${r.status}\t${p}\tswitcher=${r.hasSwitcher}\thits=${r.englishHits.join(',') || '-'}\tcanon=${r.canonical}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
