/**
 * Production smoke for Stage 5C-1 IQ locale routing.
 * Run: npx tsx scripts/seo/i18n-stage5c-1-production-deploy-smoke.ts
 */
const IQ_ORIGIN = 'https://iq.scholarshiptop.com';

const MAIN_HUB_MARKERS = [
  'ScholarshipTop en español: busca, compara',
  'ScholarshipTop en français: rechercher, comparer'
];

const IQ_MARKERS = [
  'IQ-Style Score',
  'Online IQ Test',
  'data-iq-product-shell',
  'data-iq-locale-notice'
];

type Row = {
  url: string;
  status: number;
  finalUrl: string;
  title: string;
  iqProduct: boolean;
  mainHubLeak: boolean;
  hasSwitcher: boolean;
  hasEnHref: boolean;
  switcherHrefs: string[];
  localeNotice: boolean;
  langAttr: string | null;
};

async function probe(path: string, redirect: RequestRedirect = 'follow'): Promise<Row> {
  const url = `${IQ_ORIGIN}${path}`;
  const res = await fetch(url, { redirect });
  const html = await res.text();
  const title = (html.match(/<title[^>]*>([^<]+)/i) ?? [])[1]?.trim() ?? '';
  const langAttr = (html.match(/<html[^>]*\slang="([^"]+)"/i) ?? [])[1] ?? null;
  const switcherBlock = html.match(
    /data-iq-language-switcher="true"[\s\S]{0,2500}?<\/nav>/i
  )?.[0];
  const switcherHrefs = [
    ...((switcherBlock ?? html).matchAll(/href="([^"]+)"/gi) ?? [])
  ].map((m) => m[1]);

  return {
    url,
    status: res.status,
    finalUrl: res.url,
    title,
    iqProduct: IQ_MARKERS.some((m) => html.includes(m)),
    mainHubLeak: MAIN_HUB_MARKERS.some((m) => html.includes(m)),
    hasSwitcher:
      html.includes('data-iq-language-switcher') ||
      html.includes('data-iq-product-shell-locale'),
    hasEnHref: /href="\/en"/i.test(html) || /href='\/en'/i.test(html),
    switcherHrefs: switcherHrefs.filter((h) =>
      ['/', '/es', '/fr', '/assessment', '/es/assessment', '/fr/assessment'].includes(h)
    ),
    localeNotice: html.includes('data-iq-locale-notice'),
    langAttr
  };
}

async function main() {
  const paths = ['/', '/es', '/fr', '/en', '/assessment', '/es/assessment'] as const;
  const rows: Row[] = [];

  for (const path of paths) {
    rows.push(
      await probe(path, path === '/en' ? 'manual' : 'follow')
    );
    if (path === '/en') {
      const redirectRow = rows[rows.length - 1]!;
      if (redirectRow.status >= 300 && redirectRow.status < 400) {
        const follow = await probe('/', 'follow');
        rows.push({ ...follow, url: `${IQ_ORIGIN}/en (after redirect)` });
      }
    }
  }

  console.log(JSON.stringify(rows, null, 2));

  let failed = 0;
  const en = rows.find((r) => r.url.endsWith('/en'));
  const root = rows.find((r) => r.url.endsWith('.com/'));
  const es = rows.find((r) => r.url.endsWith('/es'));
  const fr = rows.find((r) => r.url.endsWith('/fr'));

  if (!en || en.status < 300 || en.status >= 400) failed++;
  if (!root || root.status !== 200 || !root.iqProduct || root.mainHubLeak) failed++;
  if (!es || es.status !== 200 || !es.iqProduct || es.mainHubLeak) failed++;
  if (!fr || fr.status !== 200 || !fr.iqProduct || fr.mainHubLeak) failed++;
  if (rows.some((r) => r.hasEnHref)) failed++;

  for (const row of rows) {
    if (row.url.includes('/en') && row.status >= 300) continue;
    if (row.status === 200 && (!row.iqProduct || row.mainHubLeak)) failed++;
  }

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
