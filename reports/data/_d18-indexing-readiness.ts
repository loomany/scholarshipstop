/**
 * D18 indexing readiness check — audit helper (reports/data only)
 * Run: npx tsx reports/data/_d18-indexing-readiness.ts
 */
import fs from 'fs';
import path from 'path';

const BASE = 'https://scholarshiptop.com';

const URLS: {
  path: string;
  indexable: boolean;
  contextPatterns: RegExp[];
}[] = [
  {
    path: '/resources/medical-scholarships-guide',
    indexable: true,
    contextPatterns: [/medical school|Medical scholarship|premed|planning context/i]
  },
  {
    path: '/essays/career-goals',
    indexable: true,
    contextPatterns: [/career goals|healthcare scholarship planning/i]
  },
  {
    path: '/resources/best-scholarships-texas-international-students',
    indexable: true,
    contextPatterns: [/Texas|international|planning context/i]
  },
  {
    path: '/providers/loyola-university-chicago',
    indexable: true,
    contextPatterns: [/Loyola|Chicago|Reference only/i]
  },
  {
    path: '/resources/how-to-find-scholarships',
    indexable: true,
    contextPatterns: [/how to find|scholarship/i]
  },
  {
    path: '/resources/best-scholarship-websites',
    indexable: true,
    contextPatterns: [/scholarship websites|best scholarship/i]
  }
];

const TARGET_BUCKETS = ['resources', 'essays-0', 'providers'] as const;

function extractMeta(html: string, name: string): string {
  const re1 = new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']`, 'i');
  const re2 = new RegExp(`<meta\\s+content=["']([^"']*)["']\\s+name=["']${name}["']`, 'i');
  return (html.match(re1)?.[1] ?? html.match(re2)?.[1] ?? '').trim();
}

function extractCanonical(html: string): string {
  const re1 = /<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i;
  const re2 = /<link\s+href=["']([^"']*)["']\s+rel=["']canonical["']/i;
  return (html.match(re1)?.[1] ?? html.match(re2)?.[1] ?? '').trim();
}

function visibleBadTokens(html: string): string {
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  return ['undefined', 'null', 'NaN', '[object Object]']
    .filter((t) => new RegExp(`\\b${t}\\b`).test(body))
    .join(';') || 'none';
}

async function fetchText(url: string) {
  const resp = await fetch(url, { signal: AbortSignal.timeout(90000) });
  return { status: resp.status, text: await resp.text() };
}

async function loadSitemapHits(): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  await Promise.all(
    TARGET_BUCKETS.map(async (bucket) => {
      const { text } = await fetchText(`${BASE}/sitemaps/${bucket}.xml`);
      for (const item of URLS) {
        const full = `${BASE}${item.path}`;
        if (text.includes(full) && !found.has(full)) found.set(full, bucket);
      }
    })
  );
  return found;
}

async function main() {
  const sitemapHits = await loadSitemapHits();
  const rows: string[] = [
    'url,http_status,canonical,robots,indexable,found_in_sitemap,sitemap_bucket,jsonld_present,content_visible,bad_tokens,result,notes'
  ];

  for (const item of URLS) {
    const url = `${BASE}${item.path}`;
    const { status, text } = await fetchText(url);
    const canonical = extractCanonical(text);
    const robots = extractMeta(text, 'robots') || '(none)';
    const jsonld = (text.match(/application\/ld\+json/gi) ?? []).length > 0 ? 'yes' : 'no';
    const contentVisible = item.contextPatterns.some((re) => re.test(text)) ? 'yes' : 'no';
    const badTokens = visibleBadTokens(text);
    const bucket = sitemapHits.get(url) ?? '';
    const inSitemap = bucket ? 'yes' : 'no';
    const selfCanonical = canonical === url ? 'yes' : 'no';
    const noindex = /noindex/i.test(robots);

    let result = 'ok';
    const notes: string[] = [];
    if (status !== 200) result = 'fail';
    if (item.indexable && noindex) result = 'fail';
    if (item.indexable && selfCanonical === 'no') result = 'fail';
    if (item.indexable && inSitemap === 'no') result = 'fail';
    if (contentVisible === 'no') {
      result = result === 'ok' ? 'warn' : result;
      notes.push('context pattern not matched');
    }
    if (badTokens !== 'none') notes.push('visible bad tokens');

    rows.push(
      [
        url,
        status,
        canonical,
        robots,
        item.indexable ? 'yes' : 'no',
        inSitemap,
        bucket,
        jsonld,
        contentVisible,
        badTokens,
        result,
        notes.join('; ') || 'ready for URL Inspection'
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    console.log(`${item.path} -> ${status} sitemap=${inSitemap} result=${result}`);
  }

  const outDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  fs.writeFileSync(path.join(outDir, 'd18-indexing-readiness.csv'), rows.join('\n') + '\n', 'utf8');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
