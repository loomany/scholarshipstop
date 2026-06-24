#!/usr/bin/env node
/** Stage 7 post-cutover smoke — live domain (no secrets). */
const BASE = 'https://scholarshiptop.com';
const PATHS = [
  '/',
  '/sitemap.xml',
  '/sitemaps/scholarships-0.xml',
  '/scholarships/no-essay',
  '/scholarships/closing-soon',
  '/scholarships/category/no-essay',
  '/scholarships/engineering',
  '/scholarships/california',
];

function parse(html) {
  const robots =
    html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i)?.[1] ??
    null;
  const canonical =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1] ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1] ??
    null;
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? null;
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  );
  return { robots, canonical, title, h1Count: h1s.length, h1: h1s[0] ?? null };
}

async function check(path) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    redirect: path.includes('category') ? 'manual' : 'follow',
    headers: { 'User-Agent': 'Stage7PostCutover/1.0', Accept: 'text/html,application/xml' },
  });
  const text = await res.text();
  const loc = res.headers.get('location');
  const server = res.headers.get('server');
  const cfRay = res.headers.get('cf-ray');
  if (path.endsWith('.xml')) {
    const locCount = (text.match(/<loc>/g) ?? []).length;
    const valid = text.trimStart().startsWith('<?xml') || text.includes('<urlset') || text.includes('<sitemapindex');
    return { path, status: res.status, location: loc, server, cfRay, validXml: valid, locCount, bytes: text.length };
  }
  const meta = parse(text);
  return { path, status: res.status, location: loc, server, cfRay, ...meta, bytes: text.length };
}

async function main() {
  const results = [];
  for (const p of PATHS) {
    results.push(await check(p));
  }
  const issues = [];
  const badStatus = results.filter((r) => r.status >= 500 || [502, 525, 526].includes(r.status));
  if (badStatus.length) issues.push(`bad-status:${badStatus.map((r) => `${r.path}=${r.status}`).join(',')}`);
  const noEssay = results.find((r) => r.path === '/scholarships/no-essay');
  if (!noEssay?.robots?.includes('index')) issues.push('no-essay-not-index');
  const closing = results.find((r) => r.path === '/scholarships/closing-soon');
  if (!closing?.robots?.includes('index')) issues.push('closing-soon-not-index');
  const cal = results.find((r) => r.path === '/scholarships/california');
  if (!cal?.robots?.includes('noindex')) issues.push('california-not-noindex');
  for (const r of results.filter((x) => x.canonical && !x.canonical.startsWith('https://scholarshiptop.com'))) {
    issues.push(`canonical-host:${r.path}`);
  }
  const verdict = issues.length === 0 ? 'PASS' : issues.length <= 2 ? 'PASS_WITH_WARNINGS' : 'FAIL';
  console.log(JSON.stringify({ ok: true, verdict, issues, results }, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
