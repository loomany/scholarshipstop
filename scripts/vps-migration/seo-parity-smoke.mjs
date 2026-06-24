#!/usr/bin/env node
/**
 * Read-only SEO parity smoke: VPS staging vs Railway production.
 * Never prints env values.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROD = 'https://scholarshiptop.com';
const STAGE = 'http://213.155.22.74';
const DATE = '2026-06-24';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REPORT = path.join(
  ROOT,
  `reports/vps-migration/045-vps-seo-parity-smoke-${DATE}.md`
);

const KEY_URLS = [
  '/',
  '/sitemap.xml',
  '/sitemaps/scholarships-0.xml',
  '/scholarships/no-essay',
  '/scholarships/closing-soon',
  '/scholarships/category/no-essay',
  '/scholarships/engineering',
  '/scholarships/california',
];

const issues = [];
const warnings = [];

function esc(s) {
  return String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

async function fetchHtml(base, pathname, opts = {}) {
  const url = `${base}${pathname}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 90000);
  try {
    const res = await fetch(url, {
      redirect: opts.followRedirects === false ? 'manual' : 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'ScholarshipTopSeoParitySmoke/1.0',
        Accept: 'text/html,application/xml,text/xml,*/*',
      },
    });
    const text = await res.text();
    return { url, status: res.status, headers: res.headers, text, finalUrl: res.url, error: null };
  } catch (e) {
    return {
      url,
      status: 0,
      headers: new Headers(),
      text: '',
      finalUrl: url,
      error: e.message,
    };
  } finally {
    clearTimeout(t);
  }
}

function parseMeta(html, name) {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`,
    'i'
  );
  const m = html.match(re);
  return (m?.[1] ?? m?.[2] ?? '').trim();
}

function parseCanonical(html) {
  const m = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']|<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i
  );
  return (m?.[1] ?? m?.[2] ?? '').trim();
}

function parseTitle(html) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return (m?.[1] ?? '').trim();
}

function parseH1s(html) {
  const re = /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    out.push(m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  }
  return out;
}

function isValidXml(text) {
  try {
    if (!text.trim().startsWith('<?xml') && !text.trim().startsWith('<')) return false;
    const locs = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1]);
    return locs.length > 0 || text.includes('<urlset') || text.includes('<sitemapindex');
  } catch {
    return false;
  }
}

function sitemapLocs(text) {
  return [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1].trim());
}

function normPath(u) {
  try {
    const p = new URL(u).pathname;
    return p.endsWith('/') && p !== '/' ? p.slice(0, -1) : p;
  } catch {
    return u;
  }
}

function samePath(a, b) {
  return normPath(a) === normPath(b);
}

async function analyzePage(base, label, pathname, opts = {}) {
  const r = await fetchHtml(base, pathname, opts);
  const html = r.text;
  return {
    label,
    base,
    pathname,
    status: r.status,
    robots: parseMeta(html, 'robots'),
    canonical: parseCanonical(html),
    title: parseTitle(html),
    h1s: parseH1s(html),
    html,
    finalUrl: r.finalUrl,
  };
}

function compareField(name, prod, stage, opts = {}) {
  const p = prod ?? '';
  const s = stage ?? '';
  let match = p === s;
  if (opts.pathOnly && prod && stage) {
    match = samePath(prod, stage);
  }
  if (opts.ignoreHostCanonical && prod && stage) {
    const pp = normPath(prod);
    const sp = normPath(stage);
    match = pp === sp;
  }
  if (!match && opts.warnOnly) warnings.push(`${name}: prod≠stage (${pathnameHint(prod, stage)})`);
  else if (!match) issues.push(`${name}: prod≠stage (${pathnameHint(prod, stage)})`);
  return { match, prod: p, stage: s };
}

function pathnameHint(a, b) {
  return `prod=${esc(a).slice(0, 80)} | stage=${esc(b).slice(0, 80)}`;
}

async function checkJobsOff() {
  try {
    const { execSync } = await import('node:child_process');
    const key = path.join(process.env.USERPROFILE || process.env.HOME || '', '.ssh/scholarshiptop_vps');
    const out = execSync(
      `ssh -i "${key}" -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=15 ubuntu@213.155.22.74 "sudo docker ps --format '{{.Names}}'"`,
      { encoding: 'utf8', timeout: 20000 }
    );
    const names = out.trim().split(/\r?\n/).filter(Boolean);
    const bad = names.filter((n) =>
      /scripts|seo|mailing|content|translation|cron/i.test(n) && !/scholarshiptop-(site|nginx)/.test(n)
    );
    const allowed = names.every((n) => /scholarshiptop-(site|nginx)/.test(n));
    if (bad.length) issues.push(`VPS job containers running: ${bad.join(', ')}`);
    return { names, ok: allowed && bad.length === 0 };
  } catch (e) {
    warnings.push(`VPS job container check via SSH failed: ${e.message}`);
    return { names: [], ok: null };
  }
}

async function main() {
  const statusRows = [];
  const metaRows = [];
  const sampleRows = [];

  for (const p of KEY_URLS) {
    const [prod, stage] = await Promise.all([
      fetchHtml(PROD, p),
      fetchHtml(STAGE, p),
    ]);
    if (prod.error) issues.push(`Fetch error prod ${p}: ${prod.error}`);
    if (stage.error) issues.push(`Fetch error stage ${p}: ${stage.error}`);
    statusRows.push({
      path: p,
      prod: prod.status,
      stage: stage.status,
      match: prod.status === stage.status,
    });
    if (prod.status >= 500 || stage.status >= 500) {
      issues.push(`HTTP 5xx on ${p}: prod=${prod.status} stage=${stage.status}`);
    }
    if (![200, 301, 302, 307, 308].includes(prod.status) && p !== '/scholarships/category/no-essay') {
      warnings.push(`Unexpected prod status ${prod.status} for ${p}`);
    }
    if (![200, 301, 302, 307, 308].includes(stage.status) && p !== '/scholarships/category/no-essay') {
      issues.push(`Unexpected stage status ${stage.status} for ${p}`);
    }

    if (p.endsWith('.xml')) continue;

    const prodPage = {
      robots: parseMeta(prod.text, 'robots'),
      canonical: parseCanonical(prod.text),
      title: parseTitle(prod.text),
      h1s: parseH1s(prod.text),
    };
    const stagePage = {
      robots: parseMeta(stage.text, 'robots'),
      canonical: parseCanonical(stage.text),
      title: parseTitle(stage.text),
      h1s: parseH1s(stage.text),
    };

    const robotsCmp = compareField(`robots ${p}`, prodPage.robots, stagePage.robots);
    const titleCmp = compareField(`title ${p}`, prodPage.title, stagePage.title);
    const h1Cmp = compareField(
      `h1-count ${p}`,
      String(prodPage.h1s.length),
      String(stagePage.h1s.length)
    );
    const h1TextCmp = compareField(`h1-text ${p}`, prodPage.h1s[0] ?? '', stagePage.h1s[0] ?? '');
    const canonCmp = compareField(`canonical ${p}`, prodPage.canonical, stagePage.canonical, {
      ignoreHostCanonical: true,
      warnOnly: true,
    });

    metaRows.push({
      path: p,
      prod,
      stage,
      prodPage,
      stagePage,
      robotsCmp,
      titleCmp,
      h1Cmp,
      h1TextCmp,
      canonCmp,
    });
  }

  const prodSitemap = await fetchHtml(PROD, '/sitemap.xml');
  const stageSitemap = await fetchHtml(STAGE, '/sitemap.xml');
  const prodValid = isValidXml(prodSitemap.text);
  const stageValid = isValidXml(stageSitemap.text);
  if (!prodValid) issues.push('Production sitemap.xml invalid');
  if (!stageValid) issues.push('Staging sitemap.xml invalid');

  const prodSch = await fetchHtml(PROD, '/sitemaps/scholarships-0.xml');
  const stageSch = await fetchHtml(STAGE, '/sitemaps/scholarships-0.xml');
  const prodLocs = sitemapLocs(prodSch.text);
  const stageLocs = sitemapLocs(stageSch.text);
  if (prodLocs.length !== stageLocs.length) {
    warnings.push(
      `scholarships-0 loc count differs: prod=${prodLocs.length} stage=${stageLocs.length}`
    );
  }
  if (stageLocs.length === 0) issues.push('Staging scholarships sitemap empty');

  const samplePool = stageLocs.filter((u) => u.includes('/scholarships/'));
  const sample = [];
  const step = Math.max(1, Math.floor(samplePool.length / 20));
  for (let i = 0; i < samplePool.length && sample.length < 20; i += step) {
    sample.push(samplePool[i]);
  }

  for (const loc of sample) {
    const pathname = new URL(loc).pathname;
    const pr = await fetchHtml(PROD, pathname);
    const st = await fetchHtml(STAGE, pathname);
    const prodRobots = parseMeta(pr.text, 'robots');
    const stageRobots = parseMeta(st.text, 'robots');
    const prodNoindex = /noindex/i.test(prodRobots);
    const stageNoindex = /noindex/i.test(stageRobots);
    const row = {
      path: pathname,
      prodStatus: pr.status,
      stageStatus: st.status,
      prodRobots,
      stageRobots,
      noindexMismatch: prodNoindex !== stageNoindex,
    };
    sampleRows.push(row);
    if (pr.status === 404 || st.status === 404) issues.push(`Sample 404: ${pathname}`);
    if (pr.status >= 500 || st.status >= 500) issues.push(`Sample 5xx: ${pathname}`);
    if (prodNoindex !== stageNoindex) {
      warnings.push(`Sample noindex mismatch: ${pathname} prod=${prodRobots || '(none)'} stage=${stageRobots || '(none)'}`);
    }
  }

  const noEssayProd = await analyzePage(PROD, 'prod', '/scholarships/no-essay');
  const noEssayStage = await analyzePage(STAGE, 'stage', '/scholarships/no-essay');
  const catProd = await fetchHtml(PROD, '/scholarships/category/no-essay', { followRedirects: false });
  const catStage = await fetchHtml(STAGE, '/scholarships/category/no-essay', { followRedirects: false });

  const closingProd = await analyzePage(PROD, 'prod', '/scholarships/closing-soon');
  const closingStage = await analyzePage(STAGE, 'stage', '/scholarships/closing-soon');
  const calProd = await analyzePage(PROD, 'prod', '/scholarships/california');
  const calStage = await analyzePage(STAGE, 'stage', '/scholarships/california');

  const closingRobotsProd = closingProd.robots || '(none)';
  const closingRobotsStage = closingStage.robots || '(none)';
  if (!/index/i.test(closingRobotsProd) && closingRobotsProd !== '(none)') {
    warnings.push(`Production closing-soon robots unexpected: ${closingRobotsProd}`);
  }
  if (!/index/i.test(closingRobotsStage) && closingRobotsStage !== '(none)') {
    issues.push(`Staging closing-soon missing index: ${closingRobotsStage}`);
  }
  if (closingProd.h1s.length !== 1) warnings.push(`Production closing-soon H1 count=${closingProd.h1s.length}`);
  if (closingStage.h1s.length !== 1) issues.push(`Staging closing-soon H1 count=${closingStage.h1s.length}`);

  const calNoindexProd = /noindex/i.test(calProd.robots);
  const calNoindexStage = /noindex/i.test(calStage.robots);
  if (calNoindexProd !== calNoindexStage) {
    warnings.push(
      `California robots parity: prod=${calProd.robots || '(none)'} stage=${calStage.robots || '(none)'}`
    );
  }

  const jobs = await checkJobsOff();

  let verdict = 'PASS';
  if (issues.length) verdict = issues.some((i) => /5xx|invalid|empty|job containers/i.test(i)) ? 'FAIL' : 'PASS_WITH_WARNINGS';
  if (issues.length && verdict !== 'FAIL') verdict = 'PASS_WITH_WARNINGS';
  if (warnings.length && verdict === 'PASS') verdict = 'PASS_WITH_WARNINGS';

  const lines = [
    '# Stage 4.5 — SEO parity smoke (VPS vs Railway)',
    '',
    `**Дата:** ${DATE}`,
    `**Production:** ${PROD}`,
    `**VPS staging:** ${STAGE}`,
    '**Режим:** read-only HTTP, без изменений DNS/Railway/Supabase/jobs',
    '',
    `## Verdict: **${verdict}**`,
    '',
    '---',
    '',
    '## 1) HTTP status (ключевые URL)',
    '',
    '| Path | Railway | VPS | Match |',
    '|------|---------|-----|-------|',
    ...statusRows.map(
      (r) => `| ${esc(r.path)} | ${r.prod} | ${r.stage} | ${r.match ? 'yes' : 'no'} |`
    ),
    '',
    '## 2–5) Meta / canonical / title / H1',
    '',
    '| Path | robots match | canonical path match | title match | H1 count match | H1 text match |',
    '|------|--------------|----------------------|-------------|----------------|---------------|',
    ...metaRows.map((r) => {
      const pp = r.prodPage;
      const sp = r.stagePage;
      return `| ${esc(r.path)} | ${r.robotsCmp.match ? 'yes' : 'no'} | ${r.canonCmp.match ? 'yes' : 'warn'} | ${r.titleCmp.match ? 'yes' : 'no'} | ${r.h1Cmp.match ? 'yes' : 'no'} | ${r.h1TextCmp.match ? 'yes' : 'no'} |`;
    }),
    '',
    '### Detail snippets (no secrets)',
    '',
    ...metaRows.flatMap((r) => [
      `**${r.path}**`,
      `- Railway title: ${esc(r.prodPage.title).slice(0, 120)}`,
      `- VPS title: ${esc(r.stagePage.title).slice(0, 120)}`,
      `- Railway H1 (${r.prodPage.h1s.length}): ${esc(r.prodPage.h1s[0] ?? '—').slice(0, 100)}`,
      `- VPS H1 (${r.stagePage.h1s.length}): ${esc(r.stagePage.h1s[0] ?? '—').slice(0, 100)}`,
      `- Railway canonical path: ${esc(normPath(r.prodPage.canonical || '—'))}`,
      `- VPS canonical path: ${esc(normPath(r.stagePage.canonical || '—'))}`,
      `- Railway robots: ${esc(r.prodPage.robots || '(none)')}`,
      `- VPS robots: ${esc(r.stagePage.robots || '(none)')}`,
      '',
    ]),
    '',
    '## 6) sitemap.xml valid',
    '',
    `| Check | Railway | VPS |`,
    `|-------|---------|-----|`,
    `| Valid XML / has URLs | ${prodValid ? 'yes' : 'no'} | ${stageValid ? 'yes' : 'no'} |`,
    '',
    '## 7) scholarships-0.xml loc count',
    '',
    `| Source | loc count |`,
    `|--------|-----------|`,
    `| Railway | ${prodLocs.length} |`,
    `| VPS | ${stageLocs.length} |`,
    '',
    '## 8) Sample 20 URLs from VPS scholarships sitemap',
    '',
    '| Path | Railway | VPS | Railway robots | VPS robots | noindex mismatch |',
    '|------|---------|-----|----------------|------------|------------------|',
    ...sampleRows.map(
      (r) =>
        `| ${esc(r.path)} | ${r.prodStatus} | ${r.stageStatus} | ${esc(r.prodRobots || '(none)')} | ${esc(r.stageRobots || '(none)')} | ${r.noindexMismatch ? 'yes' : 'no'} |`
    ),
    '',
    '## 9) no-essay canonical winner',
    '',
    `| Page | Railway canonical path | VPS canonical path |`,
    `|------|------------------------|--------------------|`,
    `| /scholarships/no-essay | ${esc(normPath(noEssayProd.canonical || '—'))} | ${esc(normPath(noEssayStage.canonical || '—'))} |`,
    `| /scholarships/category/no-essay | HTTP ${catProd.status} (Location: ${esc(catProd.headers.get('location') || '—')}) | HTTP ${catStage.status} (Location: ${esc(catStage.headers.get('location') || '—')}) |`,
    '',
    'Expected winner path: `/scholarships/no-essay` on both origins (path parity).',
    '',
    '## 10) closing-soon',
    '',
    `| Check | Railway | VPS |`,
    `|-------|---------|-----|`,
    `| robots | ${esc(closingRobotsProd)} | ${esc(closingRobotsStage)} |`,
    `| H1 count | ${closingProd.h1s.length} | ${closingStage.h1s.length} |`,
    `| H1 text | ${esc(closingProd.h1s[0] ?? '—').slice(0, 80)} | ${esc(closingStage.h1s[0] ?? '—').slice(0, 80)} |`,
    '',
    '## 11) California weak route',
    '',
    `| | Railway | VPS |`,
    `|---|---------|-----|`,
    `| robots | ${esc(calProd.robots || '(none)')} | ${esc(calStage.robots || '(none)')} |`,
    `| noindex | ${calNoindexProd ? 'yes' : 'no'} | ${calNoindexStage ? 'yes' : 'no'} |`,
    `| parity | ${calNoindexProd === calNoindexStage ? 'yes' : 'no'} | |`,
    '',
    '## 12) VPS jobs still OFF',
    '',
    jobs.ok === true
      ? `Active containers: ${jobs.names.join(', ')} — **site/nginx only**`
      : jobs.ok === false
        ? '**FAIL** — unexpected containers detected'
        : '**Unknown** — SSH check failed (see warnings)',
    '',
    '---',
    '',
    '## Issues',
    '',
    ...(issues.length ? issues.map((i) => `- ${i}`) : ['- none']),
    '',
    '## Warnings',
    '',
    ...(warnings.length ? warnings.map((w) => `- ${w}`) : ['- none']),
    '',
    '## Constraints confirmed',
    '',
    '- DNS: not changed',
    '- Railway production: read-only fetches only',
    '- Supabase: not modified',
    '- VPS jobs: not started',
    '- Env values: not printed',
    '',
  ];

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, lines.join('\n'));
  console.log(JSON.stringify({ ok: true, verdict, issues: issues.length, warnings: warnings.length, report: REPORT }));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
