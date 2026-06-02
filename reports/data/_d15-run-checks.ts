/**
 * D15 production technical checks — audit helper (not product code)
 * Run: npx tsx reports/data/_d15-run-checks.ts
 */
import fs from 'fs';
import path from 'path';

const BASE = 'https://scholarshiptop.com';

const URLS: {
  path: string;
  page_type: string;
  contextPatterns: RegExp[];
}[] = [
  { path: '/resources/medical-scholarships-guide', page_type: 'resource', contextPatterns: [/medical school|Medical scholarship|premed/i] },
  { path: '/essays/career-goals', page_type: 'essay', contextPatterns: [/career goals/i] },
  { path: '/essays/financial-need', page_type: 'essay', contextPatterns: [/financial need/i] },
  { path: '/resources/how-to-find-scholarships', page_type: 'resource', contextPatterns: [/how to find|scholarship/i] },
  { path: '/resources/best-scholarship-websites', page_type: 'resource', contextPatterns: [/scholarship websites|best scholarship/i] },
  { path: '/resources/best-scholarships-texas-international-students', page_type: 'resource', contextPatterns: [/texas|international/i] },
  { path: '/scholarships/texas', page_type: 'scholarship_state', contextPatterns: [/texas|affordability|planning/i] },
  { path: '/scholarships/california', page_type: 'scholarship_state', contextPatterns: [/california|affordability/i] },
  { path: '/scholarships/new-york', page_type: 'scholarship_state', contextPatterns: [/new york|affordability/i] },
  { path: '/scholarships/florida', page_type: 'scholarship_state', contextPatterns: [/florida|affordability/i] },
  { path: '/scholarships/illinois', page_type: 'scholarship_state', contextPatterns: [/illinois|affordability/i] },
  { path: '/scholarships/texas/tarleton-state-university', page_type: 'scholarship_university', contextPatterns: [/tarleton|university/i] },
  { path: '/scholarships/california/california-state-university-northridge', page_type: 'scholarship_university', contextPatterns: [/northridge|california state/i] },
  { path: '/compare/states', page_type: 'compare_hub', contextPatterns: [/compare states|state comparison/i] },
  { path: '/compare/universities', page_type: 'compare_hub', contextPatterns: [/compare universities|university comparison/i] },
  { path: '/compare/states/california-vs-texas', page_type: 'compare_detail', contextPatterns: [/california|texas|affordability/i] },
  { path: '/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida', page_type: 'compare_detail', contextPatterns: [/massachusetts|florida|compare/i] },
  { path: '/providers/loyola-university-chicago', page_type: 'provider', contextPatterns: [/loyola|chicago/i] },
  { path: '/providers/alamo-colleges-foundation', page_type: 'provider', contextPatterns: [/alamo|foundation/i] }
];

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

function extractTitle(html: string): string {
  return (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ').trim();
}

function csvEscape(v: string | number): string {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function fetchPage(url: string) {
  const start = Date.now();
  try {
    const resp = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(90000) });
    const html = await resp.text();
    return { status: resp.status, html, ms: Date.now() - start, error: '' };
  } catch (e) {
    return { status: 0, html: '', ms: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  const rows: string[] = [];
  const header = [
    'url', 'page_type', 'http_status', 'response_ms', 'html_size_kb', 'canonical', 'robots_meta',
    'title', 'meta_description_present', 'jsonld_count', 'context_visible', 'bad_tokens', 'error'
  ].join(',');
  rows.push(header);

  for (const item of URLS) {
    const url = `${BASE}${item.path}`;
    const { status, html, ms, error } = await fetchPage(url);
    const canonical = extractCanonical(html);
    const robots = extractMeta(html, 'robots');
    const title = extractTitle(html);
    const desc = extractMeta(html, 'description');
    const jsonld = (html.match(/application\/ld\+json/gi) ?? []).length;
    const badTokens = ['undefined', 'null', 'NaN', '[object Object]'].filter((t) => html.includes(t));
    const contextVisible = item.contextPatterns.some((re) => re.test(html));
    const sizeKb = html ? (html.length / 1024).toFixed(1) : '0';

    console.log(`${item.path} -> ${status} ${sizeKb}KB jsonld=${jsonld} robots=${robots || '(none)'}`);

    rows.push(
      [
        url,
        item.page_type,
        status,
        ms,
        sizeKb,
        canonical,
        robots || '(none)',
        title,
        desc.length > 10 ? 'yes' : 'no',
        jsonld,
        contextVisible ? 'yes' : 'no',
        badTokens.join(';') || 'none',
        error
      ].map(csvEscape).join(',')
    );
  }

  const outDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  const outPath = path.join(outDir, 'd15-production-technical-checks.csv');
  fs.writeFileSync(outPath, rows.join('\n') + '\n', 'utf8');
  console.log('Wrote', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
