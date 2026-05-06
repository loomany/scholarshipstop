/**
 * Stage 2 — Blur / paywall security audit (guest).
 * Inspects page HTML, embedded JSON, network responses, and blur-related DOM/CSS.
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:3001 npx tsx scripts/customer-value-audit-blur-paywall.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { chromium, type Page, type Response } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = path.join(__dirname, '..', 'reports', 'customer-value-audit');

const DEFAULT_BASE = 'http://localhost:3001';

const PATHS = [
  '/',
  '/scholarships',
  '/scholarships/hub/matches',
  '/scholarships/hub/best-matches',
  '/scholarships/hub/easy-apply',
  '/scholarships/hub/international-friendly',
  '/scholarships/hub/recommended'
];

/** Keys that should not appear with usable secrets for guests (non-empty URL / contact). */
const SENSITIVE_JSON_KEYS = new Set([
  'applyLink',
  'listingUrl',
  'providerUrl',
  'apply_url',
  'provider_url',
  'support_email',
  'support_phone',
  'supportEmail',
  'supportPhone',
  'socialLinks',
  'provider_social_facebook',
  'provider_social_instagram',
  'provider_social_linkedin'
]);

type NetworkCapture = {
  requestUrl: string;
  responseUrl: string;
  status: number;
  contentType: string;
  bodySnippet: string;
  parsedSummary: {
    premiumFieldsRedacted?: boolean;
    leakPaths: string[];
    scholarshipCount?: number;
    topLevelKeys: string[];
  };
};

type PageDomAudit = {
  path: string;
  fullUrl: string;
  htmlLength: number;
  innerTextLength: string;
  nextDataPresent: boolean;
  nextDataSnippetHits: string[];
  jsonLdScripts: number;
  jsonLdHits: string[];
  htmlRegexHits: string[];
  blurElements: {
    selectorHint: string;
    className: string;
    innerTextLength: number;
    computedFilter?: string;
  }[];
  articleCardsSampleInnerTextLen: number[];
  verdict: 'safe' | 'risky' | 'critical';
  verdictReasons: string[];
};

function jsonScanLeaks(obj: unknown): {
  premiumFieldsRedacted?: boolean;
  leakPaths: string[];
  scholarshipCount?: number;
  topLevelKeys: string[];
} {
  const leakPaths: string[] = [];
  let premiumFieldsRedacted: boolean | undefined;
  let scholarshipCount: number | undefined;
  const topLevelKeys =
    obj && typeof obj === 'object' && !Array.isArray(obj)
      ? Object.keys(obj as object).slice(0, 40)
      : [];

  function walk(o: unknown, prefix: string): void {
    if (o === null || o === undefined) return;
    if (typeof o !== 'object') return;

    if (Array.isArray(o)) {
      if (prefix === 'scholarships' || prefix.endsWith('.scholarships')) {
        scholarshipCount = o.length;
      }
      o.forEach((item, i) => walk(item, `${prefix}[${i}]`));
      return;
    }

    const rec = o as Record<string, unknown>;
    if (typeof rec.premiumFieldsRedacted === 'boolean') {
      premiumFieldsRedacted = rec.premiumFieldsRedacted;
    }

    for (const [k, v] of Object.entries(rec)) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (SENSITIVE_JSON_KEYS.has(k)) {
        if (v === null || v === undefined || v === '') continue;
        if (typeof v === 'object') {
          leakPaths.push(`${p}=<object>`);
          continue;
        }
        const s = String(v).trim();
        if (!s) continue;
        if (k === 'socialLinks' || k.includes('social')) {
          leakPaths.push(`${p}=<present>`);
          continue;
        }
        leakPaths.push(`${p}=${s.slice(0, 160)}`);
      }
      walk(v, p);
    }
  }

  walk(obj, '');
  return { premiumFieldsRedacted, leakPaths, scholarshipCount, topLevelKeys };
}

async function captureJsonResponse(response: Response): Promise<NetworkCapture | null> {
  const responseUrl = response.url();
  if (!responseUrl.includes('/api/scholarships')) return null;
  const ct = (response.headers()['content-type'] ?? '').toLowerCase();
  if (!ct.includes('json')) return null;
  const req = response.request();
  const body = await response.text().catch(() => '');
  if (!body.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return {
      requestUrl: req.url(),
      responseUrl,
      status: response.status(),
      contentType: ct,
      bodySnippet: body.slice(0, 400),
      parsedSummary: {
        leakPaths: ['<non-json body>'],
        topLevelKeys: []
      }
    };
  }
  const parsedSummary = jsonScanLeaks(parsed);
  return {
    requestUrl: req.url(),
    responseUrl,
    status: response.status(),
    contentType: ct,
    bodySnippet: body.slice(0, 600),
    parsedSummary
  };
}

function scanHtmlString(html: string): string[] {
  const hits: string[] = [];
  const patterns: { name: string; re: RegExp }[] = [
    { name: 'applyLink_https', re: /"applyLink"\s*:\s*"https?:\/\/[^"]{8,}"/gi },
    { name: 'listingUrl_https', re: /"listingUrl"\s*:\s*"https?:\/\/[^"]{8,}"/gi },
    { name: 'providerUrl_https', re: /"providerUrl"\s*:\s*"https?:\/\/[^"]{8,}"/gi },
    { name: 'apply_url_snake', re: /"apply_url"\s*:\s*"https?:\/\/[^"]{8,}"/gi },
    { name: 'provider_url_snake', re: /"provider_url"\s*:\s*"https?:\/\/[^"]{8,}"/gi },
    {
      name: 'supportEmail',
      re: /"supportEmail"\s*:\s*"[^"]+@[^"]+"/gi
    },
    { name: 'support_email_snake', re: /"support_email"\s*:\s*"[^"]+@[^"]+"/gi }
  ];
  for (const { name, re } of patterns) {
    const m = html.match(re);
    if (m?.length) hits.push(`${name}:count=${m.length}:${m[0]!.slice(0, 120)}`);
  }
  return hits;
}

async function assertReachableBase(base: string): Promise<void> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);
  try {
    const res = await fetch(base, {
      signal: ac.signal,
      redirect: 'follow',
      headers: { Accept: 'text/html' }
    });
    if (!res.ok && res.status >= 500) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error('[blur-paywall-audit] BASE_URL unreachable:', base, e);
    process.exit(1);
  } finally {
    clearTimeout(t);
  }
}

function isLikelyGrantDetailPath(href: string): boolean {
  const pathOnly = href.split('?')[0] ?? '';
  if (!pathOnly.startsWith('/scholarships/')) return false;
  if (pathOnly.includes('/hub')) return false;
  const rest = pathOnly.slice('/scholarships/'.length);
  if (!rest || rest.includes('/')) return false;
  const lower = rest.toLowerCase();
  if (
    lower.startsWith('study-in-') ||
    lower.startsWith('category-') ||
    lower === 'matches' ||
    lower.startsWith('email-digest')
  ) {
    return false;
  }
  return true;
}

async function extractDetailHrefs(page: Page, limit: number): Promise<string[]> {
  const hrefs = await page
    .evaluate(() => {
      const out = new Set<string>();
      document.querySelectorAll('article[data-scholarship-card] a[href]').forEach((a) => {
        const href = (a as HTMLAnchorElement).getAttribute('href') ?? '';
        if (href.startsWith('/scholarships/')) out.add(href.split('?')[0]!);
      });
      return [...out];
    })
    .catch(() => [] as string[]);
  return hrefs.filter(isLikelyGrantDetailPath).slice(0, limit);
}

async function auditDomForPage(page: Page, pathLabel: string): Promise<PageDomAudit> {
  const html = await page.content();
  const htmlLength = html.length;
  const innerTextLength = String(await page.evaluate(() => document.body.innerText.length));

  const nextDataPresent =
    html.includes('__NEXT_DATA__') ||
    html.includes('__next_f') ||
    html.includes('self.__next_f');

  const nextDataSnippetHits: string[] = [];
  if (nextDataPresent) {
    nextDataSnippetHits.push(...scanHtmlString(html.slice(0, Math.min(html.length, 2_500_000))));
  }

  const jsonLdScripts = await page.locator('script[type="application/ld+json"]').count();
  let jsonLdHits: string[] = [];
  const n = Math.min(await page.locator('script[type="application/ld+json"]').count(), 8);
  for (let i = 0; i < n; i++) {
    const txt = await page.locator('script[type="application/ld+json"]').nth(i).innerText().catch(() => '');
    jsonLdHits.push(...scanHtmlString(txt));
  }

  const htmlRegexHits = scanHtmlString(html);

  const blurElements = await page.evaluate(() => {
    const sel =
      '[class*="backdrop-blur"], [style*="blur("], [style*="filter:"], .pointer-events-none.absolute.inset-0';
    const nodes = [...document.querySelectorAll(sel)].slice(0, 25);
    return nodes.map((el) => {
      const h = el as HTMLElement;
      const st = window.getComputedStyle(h);
      return {
        selectorHint: el.tagName,
        className: (h.className?.toString?.() ?? '').slice(0, 160),
        innerTextLength: (h.innerText ?? '').length,
        computedFilter: st.filter?.slice(0, 80) ?? ''
      };
    });
  });

  const articleCardsSampleInnerTextLen = await page.evaluate(() =>
    [...document.querySelectorAll('article[data-scholarship-card]')]
      .slice(0, 6)
      .map((el) => (el as HTMLElement).innerText.length)
  );

  const verdictReasons: string[] = [];
  let verdict: PageDomAudit['verdict'] = 'safe';

  const htmlCritical =
    htmlRegexHits.some(
      (h) =>
        h.includes('applyLink_https') ||
        h.includes('listingUrl_https') ||
        h.includes('providerUrl_https') ||
        h.includes('apply_url_snake') ||
        h.includes('provider_url_snake')
    ) ||
    jsonLdHits.some(Boolean);

  const contactLeak =
    htmlRegexHits.some((h) => h.includes('supportEmail') || h.includes('support_email'));

  if (htmlCritical) {
    verdict = 'critical';
    verdictReasons.push('Sensitive URL keys found in raw HTML or JSON-LD');
  } else if (contactLeak) {
    verdict = 'risky';
    verdictReasons.push('Possible support email in embedded JSON/HTML');
  }

  if (blurElements.some((b) => b.innerTextLength > 80)) {
    verdictReasons.push(
      'Blur/overlay elements carry substantial innerText (may be readable via DOM/DevTools)'
    );
    if (verdict === 'safe') verdict = 'risky';
  }

  return {
    path: pathLabel,
    fullUrl: page.url(),
    htmlLength,
    innerTextLength,
    nextDataPresent,
    nextDataSnippetHits,
    jsonLdScripts,
    jsonLdHits,
    htmlRegexHits,
    blurElements,
    articleCardsSampleInnerTextLen,
    verdict,
    verdictReasons
  };
}

function classifyNetwork(captures: NetworkCapture[]): 'safe' | 'risky' | 'critical' {
  let worst: 'safe' | 'risky' | 'critical' = 'safe';
  for (const c of captures) {
    const leaks = c.parsedSummary.leakPaths.filter(
      (x) =>
        !x.includes('<non-json') &&
        !x.endsWith('=<object>') &&
        !x.includes('socialLinks=<present>')
    );
    const urlLeaks = leaks.filter(
      (x) =>
        x.includes('applyLink') ||
        x.includes('listingUrl') ||
        x.includes('providerUrl') ||
        x.includes('apply_url') ||
        x.includes('provider_url')
    );
    if (urlLeaks.length) return 'critical';
    const emailLeaks = leaks.filter((x) => x.includes('support'));
    if (emailLeaks.length) worst = 'risky';
  }
  return worst;
}

async function main() {
  const base = (process.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_BASE).trim().replace(/\/+$/, '');
  await assertReachableBase(base);

  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'en-US'
  });
  const page = await context.newPage();

  const allNetwork: NetworkCapture[] = [];
  const pageAudits: PageDomAudit[] = [];
  const detailAudits: PageDomAudit[] = [];
  const detailNetwork: NetworkCapture[] = [];

  const listener = async (response: Response) => {
    const cap = await captureJsonResponse(response);
    if (cap) allNetwork.push(cap);
  };
  page.on('response', listener);

  const collectedDetailPaths = new Set<string>();

  for (const p of PATHS) {
    const url = `${base}${p}`;
    const before = allNetwork.length;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 }).catch(() => {});
    await page.waitForTimeout(2200);
    if (p.includes('hub') && p !== '/scholarships/hub/recommended') {
      await page.waitForSelector('article[data-scholarship-card]', { timeout: 15_000 }).catch(() => {});
    }
    const slice = allNetwork.slice(before);
    void slice;

    const dom = await auditDomForPage(page, p);
    pageAudits.push(dom);

    const hrefs = await extractDetailHrefs(page, 8);
    hrefs.forEach((h) => collectedDetailPaths.add(h));
  }

  page.off('response', listener);

  const detailPaths = [...collectedDetailPaths].slice(0, 5);
  const listenerDetail = async (response: Response) => {
    const cap = await captureJsonResponse(response);
    if (cap) detailNetwork.push(cap);
  };
  page.on('response', listenerDetail);

  const detailApiProbes: NetworkCapture[] = [];

  for (const dp of detailPaths) {
    const detailUrl = `${base}${dp}`;
    try {
      await Promise.all([
        page.waitForResponse(
          (res) => {
            const u = res.url();
            return (
              res.request().method() === 'GET' &&
              /\/api\/scholarships\/.+/i.test(u) &&
              !u.endsWith('/api/scholarships') &&
              !u.includes('/api/scholarships?')
            );
          },
          { timeout: 20_000 }
        ),
        page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 })
      ]);
    } catch {
      await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 }).catch(() => {});
    }
    await page.waitForTimeout(2000);

    const slugSeg = dp.split('/').pop() ?? '';
    const probe = await page
      .evaluate(async (seg) => {
        const enc = encodeURIComponent(seg);
        const r = await fetch(`/api/scholarships/${enc}`, {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' }
        });
        const txt = await r.text();
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(txt);
        } catch {
          parsed = null;
        }
        return {
          status: r.status,
          bodySnippet: txt.slice(0, 4000),
          parsed
        };
      }, slugSeg)
      .catch(() => null);

    if (probe?.parsed != null) {
      const parsedSummary = jsonScanLeaks(probe.parsed);
      detailApiProbes.push({
        requestUrl: `${base}/api/scholarships/${encodeURIComponent(slugSeg)}`,
        responseUrl: `${base}/api/scholarships/${encodeURIComponent(slugSeg)}`,
        status: probe.status,
        contentType: 'application/json',
        bodySnippet: probe.bodySnippet.slice(0, 800),
        parsedSummary
      });
    }

    const dom = await auditDomForPage(page, dp);
    detailAudits.push(dom);
  }
  page.off('response', listenerDetail);

  await browser.close();

  const netVerdict = classifyNetwork(
    allNetwork.concat(detailNetwork).concat(detailApiProbes)
  );
  const domWorst = [...pageAudits, ...detailAudits].reduce<'safe' | 'risky' | 'critical'>(
    (acc, d) => {
      const rank = { safe: 0, risky: 1, critical: 2 };
      return rank[d.verdict] > rank[acc] ? d.verdict : acc;
    },
    'safe'
  );

  const rank = { safe: 0, risky: 1, critical: 2 };
  let overallVerdict: 'safe' | 'risky' | 'critical' = 'safe';
  for (const v of [netVerdict, domWorst]) {
    if (rank[v] > rank[overallVerdict]) overallVerdict = v;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    baseUrl: base,
    overallVerdict,
    networkVerdict: netVerdict,
    domVerdictWorst: domWorst,
    pathsVisited: PATHS,
    detailPathsVisited: detailPaths,
    networkCaptures: allNetwork.concat(detailNetwork).concat(detailApiProbes),
    detailApiProbesOnly: detailApiProbes,
    pageDomAudits: pageAudits,
    detailDomAudits: detailAudits,
    recommendations: buildRecommendations(overallVerdict, allNetwork.concat(detailNetwork), pageAudits)
  };

  fs.writeFileSync(
    path.join(REPORT_DIR, 'blur-paywall-audit.json'),
    JSON.stringify(payload, null, 2),
    'utf8'
  );

  const md = buildMarkdown(payload);
  fs.writeFileSync(path.join(REPORT_DIR, 'blur-paywall-audit.md'), md, 'utf8');

  console.log('[blur-paywall-audit] overall:', overallVerdict);
  console.log('[blur-paywall-audit] wrote', path.join(REPORT_DIR, 'blur-paywall-audit.{json,md}'));
}

function buildRecommendations(
  verdict: string,
  nets: NetworkCapture[],
  pages: PageDomAudit[]
): string[] {
  const r: string[] = [];
  if (verdict === 'critical') {
    r.push(
      'Critical: ensure listing/detail APIs never serialize apply/listing/provider URLs for guests; verify RSC/HTML payloads.'
    );
  }
  if (verdict === 'risky') {
    r.push(
      'Risky: reduce sensitive text inside blurred overlays or strip from client props; confirm JSON-LD omits apply URLs.'
    );
  }
  const anyRedacted = nets.some((n) => n.parsedSummary.premiumFieldsRedacted === true);
  if (anyRedacted) {
    r.push('Detail responses include premiumFieldsRedacted — ensure all sensitive keys are nulled consistently.');
  }
  if (pages.some((p) => p.blurElements.some((b) => b.innerTextLength > 50))) {
    r.push(
      'Overlay/blur layers contain innerText; treat as client-side obscuring only — gate high-value fields server-side.'
    );
  }
  if (!r.length) r.push('No automatic code changes; keep monitoring API SELECT columns and detail redaction.');
  return r;
}

function buildMarkdown(payload: {
  generatedAt: string;
  baseUrl: string;
  overallVerdict: string;
  networkVerdict: string;
  domVerdictWorst: string;
  pathsVisited: string[];
  detailPathsVisited: string[];
  networkCaptures: NetworkCapture[];
  pageDomAudits: PageDomAudit[];
  detailDomAudits: PageDomAudit[];
  recommendations: string[];
}): string {
  const nets = payload.networkCaptures;
  const uniqueEndpoints = [...new Set(nets.map((n) => n.responseUrl.split('?')[0]))];

  const leakSummary = nets.flatMap((n) =>
    n.parsedSummary.leakPaths.map((l) => `- ${n.responseUrl}: ${l}`)
  );

  const redactedFlags = nets.filter((n) => n.parsedSummary.premiumFieldsRedacted === true);

  let md = `# Blur / paywall security audit (Stage 2 — guest)

## 1. Overall verdict

**${payload.overallVerdict.toUpperCase()}** (network: ${payload.networkVerdict}, worst DOM page: ${payload.domVerdictWorst})

Generated: ${payload.generatedAt}  
BASE_URL: ${payload.baseUrl}

---

## 2. Pages checked

${payload.pathsVisited.map((p) => `- ${p}`).join('\n')}

### Detail pages (guest)

${payload.detailPathsVisited.length ? payload.detailPathsVisited.map((p) => `- ${p}`).join('\n') : '- _(none resolved from cards)_'}

---

## 3. API responses inspected

Unique JSON endpoints captured: **${uniqueEndpoints.length}**  
(Includes explicit guest \`fetch('/api/scholarships/:slug')\` probes on detail pages — the React client often skips this request when SSR redacted payload is sufficient.)

${uniqueEndpoints.slice(0, 40).map((u) => `- ${u}`).join('\n')}

---

## 4. Closed data in DOM / HTML

Heuristic: regex search on full \`page.content()\` for serialized sensitive keys with HTTPS URLs or emails.

| Path | DOM verdict | HTML sensitive hits (count) | Notes |
|------|-------------|------------------------------|-------|
${payload.pageDomAudits
  .map(
    (p) =>
      `| ${p.path} | ${p.verdict} | ${p.htmlRegexHits.length} | ${p.verdictReasons.join('; ') || '—'} |`
  )
  .join('\n')}

### Detail pages

| Path | DOM verdict | HTML hits |
|------|-------------|-----------|
${payload.detailDomAudits
  .map((p) => `| ${p.path} | ${p.verdict} | ${p.htmlRegexHits.length} |`)
  .join('\n')}

---

## 5. Closed data in page.content()

Same as §4 (full HTML string). Any non-empty **htmlRegexHits** below indicates embedded JSON-like secrets:

**Listing/home aggregate hits (sample):**

${[...new Set(payload.pageDomAudits.flatMap((p) => p.htmlRegexHits))].slice(0, 30).map((x) => `- ${x}`).join('\n') || '- _(none)_'}

---

## 6. Network / API leakage

**premiumFieldsRedacted** seen on **${redactedFlags.length}** response(s).

**Leak paths detected (parsed JSON walk):**

${leakSummary.length ? leakSummary.slice(0, 80).join('\n') : '- _(none)_'}

---

## 7. Bypass blur with DevTools?

- Blur/overlays often use \`backdrop-blur\` and still leave **innerText** on underlying nodes or on overlay wrappers.
- **innerText** on \`article[data-scholarship-card]\` typically includes visible card copy; DevTools can always read DOM text — this is **client-side obscuring**, not encryption.
- If apply URLs appear only in network JSON/HTML, users can read them in Network tab → classify as **critical** if guest receives them.

Sample blur-related nodes (first page with overlays):

${payload.pageDomAudits
  .find((p) => p.blurElements.length)
  ?.blurElements.slice(0, 8)
  .map((b) => `- ${b.selectorHint} filter=${b.computedFilter || '—'} innerTextLen=${b.innerTextLength} class=${b.className.slice(0, 80)}`)
  .join('\n') || '- _(none)_'}

---

## 8. Fields that may leak (from this audit)

${leakSummary.length ? leakSummary.slice(0, 40).join('\n') : '- No structured leak paths detected in captured JSON.'}

HTML regex category hits aggregate:

${[...new Set(payload.pageDomAudits.flatMap((p) => p.htmlRegexHits))].join('\n') || '- none'}

---

## 9. Fields that appear redacted / defensive

- JSON key **premiumFieldsRedacted: true** on detail responses (when present).
- Listing API uses restricted column sets server-side (see Stage 0 — \`PUBLIC_LIST_CARD_SELECT\`); confirm empirically in \`blur-paywall-audit.json\` captures.

---

## 10. Recommendations (no code changes in this task)

${payload.recommendations.map((x) => `- ${x}`).join('\n')}

---

## Classification reminder

- **safe**: guest JSON/HTML/network lacks usable secret URLs/contacts for premium fields.
- **risky**: secrets appear only in obscured DOM or minor embeddings; or contacts partially exposed.
- **critical**: guest API or HTML contains apply/listing/provider URLs or clear premium payloads.

`;

  return md;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
