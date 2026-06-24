#!/usr/bin/env node
/**
 * Stage 4.6 verification — read-only HTTP checks after noindex fix.
 */
const STAGE = process.env.STAGE_URL ?? 'http://213.155.22.74';
const CANDIDATE = process.env.CANDIDATE_URL ?? null;

function parse(html) {
  const robots =
    html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i)?.[1] ??
    null;
  const canonical =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1] ??
    null;
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? null;
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  );
  return { robots, canonical, title, h1Count: h1s.length, h1: h1s[0] ?? null };
}

async function check(base, path, opts = {}) {
  const res = await fetch(`${base}${path}`, {
    redirect: opts.redirect ?? 'follow',
    headers: {
      'User-Agent': 'Stage46Verify/1.0',
      Accept: 'text/html,application/xml',
      ...(opts.host ? { Host: opts.host } : {}),
    },
  });
  const text = await res.text();
  const loc = res.headers.get('location');
  if (path.endsWith('.xml')) {
    const locCount = (text.match(/<loc>/g) ?? []).length;
    const valid = text.trimStart().startsWith('<?xml') || text.includes('<urlset');
    return { status: res.status, valid, locCount };
  }
  return { status: res.status, location: loc, ...parse(text) };
}

async function main() {
  const bases = [{ label: 'staging', url: STAGE }];
  if (CANDIDATE) bases.push({ label: 'candidate', url: CANDIDATE });

  const results = {};
  for (const { label, url } of bases) {
    results[label] = {
      noEssay: await check(url, '/scholarships/no-essay'),
      categoryNoEssay: await check(url, '/scholarships/category/no-essay', {
        redirect: 'manual',
      }),
      closingSoon: await check(url, '/scholarships/closing-soon'),
      sitemap: await check(url, '/sitemap.xml'),
      scholarshipsSitemap: await check(url, '/sitemaps/scholarships-0.xml'),
    };
  }

  const stagingOk =
    results.staging?.noEssay?.robots?.includes('index') &&
    results.staging?.closingSoon?.robots?.includes('index') &&
    results.staging?.closingSoon?.h1Count === 1;

  console.log(
    JSON.stringify({ ok: true, stagingOk, results }, null, 2)
  );
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
