/**
 * Production/detail language switcher audit.
 * Usage: SMOKE_BASE_URL=https://scholarshiptop.com npx tsx scripts/seo/i18n-detail-language-switcher-audit.ts
 */
const BASE = (
  process.env.SMOKE_BASE_URL ?? 'https://scholarshiptop.com'
).replace(/\/$/, '');

type Row = {
  path: string;
  status: number;
  switcherAnchors: number;
  locales: string[];
  hasEnHref: boolean;
  sampleHref: string[];
};

async function auditPath(path: string): Promise<Row> {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  const html = await res.text();
  const locales: string[] = [];
  const hrefs: string[] = [];
  for (const m of html.matchAll(
    /data-language-switcher-locale=["']([^"']+)["'][^>]*href=["']([^"']+)["']/gi
  )) {
    locales.push(m[1]!.toLowerCase());
    hrefs.push(m[2]!);
  }
  for (const m of html.matchAll(
    /href=["']([^"']+)["'][^>]*data-language-switcher-locale=["']([^"']+)["']/gi
  )) {
    hrefs.push(m[1]!);
    locales.push(m[2]!.toLowerCase());
  }
  const switcherAnchors = locales.length;
  return {
    path,
    status: res.status,
    switcherAnchors,
    locales: [...new Set(locales)],
    hasEnHref: hrefs.some((h) => h.includes('/en/') || h === '/en'),
    sampleHref: hrefs.slice(0, 6)
  };
}

const PATHS = [
  '/scholarships/climate-stripes-scholarship-14487',
  '/scholarships/how-to-apply-for-a-scholarship-step-by-step',
  '/providers/loyola-university-chicago',
  '/es/providers/loyola-university-chicago',
  '/fr/providers/harvard-university',
  '/providers/harvard-university',
  '/resources/how-to-apply-for-scholarships',
  '/es/resources/how-to-apply-for-scholarships',
  '/fr/resources/how-to-apply-for-scholarships',
  '/es/resources/verify-scholarship-winners-usa-previous-years',
  '/essays/how-to-write-about-the-gap-between-expectation-and-reality-of-studying-in-america',
  '/es/essays/how-to-write-about-the-gap-between-expectation-and-reality-of-studying-in-america',
  '/compare/universities/harvard-university-vs-massachusetts-institute-of-technology',
  '/es/compare/universities/harvard-university-vs-massachusetts-institute-of-technology',
  '/en'
];

async function main() {
  console.log(`Detail language switcher audit — ${BASE}\n`);
  const rows: Row[] = [];
  for (const path of PATHS) {
    rows.push(await auditPath(path));
  }
  for (const row of rows) {
    console.log(
      JSON.stringify({
        path: row.path,
        status: row.status,
        switcherLocales: row.locales,
        switcherCount: row.switcherAnchors,
        hasEnHref: row.hasEnHref
      })
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
