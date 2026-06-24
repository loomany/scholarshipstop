#!/usr/bin/env node
/** Read-only HTML compare for no-essay noindex investigation */
const PROD = 'https://scholarshiptop.com';
const STAGE = 'http://213.155.22.74';

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
  return { robots, canonical, title, h1Count: h1s.length, h1: h1s[0] ?? null, h1s };
}

async function fetchPath(base, path, opts = {}) {
  const res = await fetch(`${base}${path}`, {
    redirect: opts.redirect ?? 'follow',
    headers: { 'User-Agent': 'NoEssayInvestigate/1.0', Accept: 'text/html' },
  });
  const text = await res.text();
  return { status: res.status, url: res.url, ...parse(text), htmlLen: text.length };
}

async function main() {
  const paths = [
    '/scholarships/no-essay',
    '/scholarships/category/no-essay',
    '/scholarships/closing-soon',
  ];
  for (const p of paths) {
    const [prod, stage] = await Promise.all([
      fetchPath(PROD, p, { redirect: p.includes('category') ? 'manual' : 'follow' }),
      fetchPath(STAGE, p, { redirect: p.includes('category') ? 'manual' : 'follow' }),
    ]);
    console.log(JSON.stringify({ path: p, prod, stage }, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
