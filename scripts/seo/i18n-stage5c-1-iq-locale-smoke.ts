/**
 * Stage 5C-1 smoke — IQ subdomain locale routing (Host header against local server).
 * Run: npx tsx scripts/seo/i18n-stage5c-1-iq-locale-smoke.ts
 * Prereq: npm run start (or dev) on PORT default 3000
 */
const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';
const IQ_HOST = 'iq.scholarshiptop.com';

const PATHS = ['/', '/es', '/fr', '/assessment', '/es/assessment', '/en'] as const;

const MAIN_HUB_MARKERS = [
  'ScholarshipTop en español: busca, compara',
  'ScholarshipTop en français: rechercher, comparer'
];

const IQ_MARKERS = [
  'data-iq-language-switcher',
  'Online IQ Test',
  'IQ-Style Score',
  'Measure your IQ',
  '30-question IQ test',
  'Start IQ Test',
  'ScholarshipTop IQ'
];

type Row = {
  path: string;
  status: number;
  iqProduct: boolean;
  mainHubLeak: boolean;
  hasSwitcher: boolean;
  hasEnLink: boolean;
  localeNotice?: boolean;
};

async function fetchPath(path: string): Promise<Row> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      /**
       * Node fetch forbids overriding `Host`; use forwarded host like production edge.
       */
      'x-forwarded-host': IQ_HOST
    },
    redirect: 'manual'
  });
  const html = await res.text();
  const mainHubLeak = MAIN_HUB_MARKERS.some((m) => html.includes(m));
  const iqProduct =
    IQ_MARKERS.some((m) => html.includes(m)) ||
    html.includes('data-iq-product-shell="true"') ||
    html.includes('iq-product-shell');
  return {
    path,
    status: res.status,
    iqProduct,
    mainHubLeak,
    hasSwitcher:
      html.includes('data-iq-language-switcher') ||
      html.includes('data-iq-product-shell-locale'),
    hasEnLink: /href="\/en"/i.test(html) || /href='\/en'/i.test(html),
    localeNotice: html.includes('data-iq-locale-notice')
  };
}

async function main() {
  const rows: Row[] = [];
  for (const path of PATHS) {
    rows.push(await fetchPath(path));
  }

  let failed = 0;
  for (const row of rows) {
    const ok =
      row.path === '/en'
        ? row.status >= 300 && row.status < 400
        : row.status === 200 && row.iqProduct && !row.mainHubLeak && row.hasSwitcher;
    if (!ok) failed += 1;
    console.log(
      `${ok ? 'PASS' : 'FAIL'} ${row.path} status=${row.status} iq=${row.iqProduct} hubLeak=${row.mainHubLeak} switcher=${row.hasSwitcher} enLink=${row.hasEnLink} notice=${row.localeNotice ?? false}`
    );
  }

  const es = rows.find((r) => r.path === '/es');
  if (es && !es.localeNotice) {
    failed += 1;
    console.log('FAIL /es missing locale shell notice');
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll IQ locale smoke checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
