import { writeFile } from 'node:fs/promises';
import { chromium, type Browser, type Page } from 'playwright';

type AuditIssueSeverity = 'critical' | 'high' | 'medium' | 'low';

type AuditIssue = {
  severity: AuditIssueSeverity;
  type: string;
  url: string;
  message: string;
  detail?: unknown;
};

type PageAudit = {
  url: string;
  finalUrl: string;
  status: number | null;
  ok: boolean;
  title: string | null;
  titleCount: number;
  canonical: string | null;
  canonicalCount: number;
  noindex: boolean;
  visibleErrorSnippets: string[];
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: Array<{ url: string; status?: number; failure?: string }>;
  internalLinks: string[];
  durationMs: number;
};

type BrokenLink = {
  sourceUrl: string;
  targetUrl: string;
  status: number | null;
  error?: string;
};

type AuditReport = {
  generatedAt: string;
  baseUrl: string;
  limit: number;
  visitedCount: number;
  checkedLinkCount: number;
  pages: PageAudit[];
  brokenLinks: BrokenLink[];
  issues: AuditIssue[];
  skippedUrls: string[];
};

type Config = {
  baseUrl: string;
  limit: number;
  outFile: string;
  concurrency: number;
  linkCheckLimit: number;
  navigationTimeoutMs: number;
};

const DEFAULT_BASE_URL = 'https://scholarshiptop.com';

const VISIBLE_ERROR_PATTERNS = [
  /failed to load/gi,
  /application error/gi,
  /scholarship list query failed/gi,
  /column .* does not exist/gi,
  /internal server error/gi,
  /(?:http|status|error)\s*500/gi,
  /\b42703\b/gi,
  /supabase .* error/gi
];

const STATIC_OR_NON_PAGE_EXTENSIONS =
  /\.(?:png|jpe?g|gif|webp|svg|ico|css|js|mjs|map|json|txt|xml|pdf|zip|mp4|webm|woff2?|ttf|eot)$/i;

function argValue(name: string): string | undefined {
  const exact = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (exact) return exact.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1];
  return undefined;
}

function intArg(name: string, fallback: number): number {
  const raw = argValue(name) ?? process.env[`AUDIT_${name.toUpperCase()}`];
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function parseConfig(): Config {
  const baseUrl = (argValue('base') ?? process.env.AUDIT_BASE_URL ?? DEFAULT_BASE_URL)
    .trim()
    .replace(/\/+$/, '');
  return {
    baseUrl,
    limit: intArg('limit', 300),
    outFile: argValue('out') ?? process.env.AUDIT_OUT ?? 'audit-production-site.json',
    concurrency: Math.min(intArg('concurrency', 3), 6),
    linkCheckLimit: intArg('link-check-limit', 1000),
    navigationTimeoutMs: intArg('timeout-ms', 30000)
  };
}

function normalizeUrl(raw: string, baseUrl: string): string | null {
  try {
    const url = new URL(raw, baseUrl);
    const base = new URL(baseUrl);
    if (url.hostname !== base.hostname) return null;
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (STATIC_OR_NON_PAGE_EXTENSIONS.test(url.pathname)) return null;
    url.hash = '';
    url.searchParams.sort();
    return url.toString().replace(/\/$/, url.pathname === '/' ? '/' : '');
  } catch {
    return null;
  }
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'ScholarshipTopProductionAudit/1.0 (+https://scholarshiptop.com)'
      }
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function parseLocs(xml: string, baseUrl: string): string[] {
  return unique(
    [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
      .map((match) => match[1]?.trim())
      .filter((value): value is string => Boolean(value))
      .map((value) => {
        try {
          const url = new URL(value, baseUrl);
          const base = new URL(baseUrl);
          if (url.hostname !== base.hostname) return null;
          if (!['http:', 'https:'].includes(url.protocol)) return null;
          url.hash = '';
          url.searchParams.sort();
          return url.toString().replace(/\/$/, url.pathname === '/' ? '/' : '');
        } catch {
          return null;
        }
      })
      .filter((value): value is string => Boolean(value))
  );
}

async function loadSitemapUrls(baseUrl: string): Promise<string[]> {
  const rootSitemap = `${baseUrl}/sitemap.xml`;
  const queue = [rootSitemap];
  const seen = new Set<string>();
  const urls: string[] = [];

  while (queue.length > 0 && seen.size < 50) {
    const sitemapUrl = queue.shift();
    if (!sitemapUrl || seen.has(sitemapUrl)) continue;
    seen.add(sitemapUrl);
    const xml = await fetchText(sitemapUrl);
    if (!xml) continue;

    for (const loc of parseLocs(xml, baseUrl)) {
      if (loc.endsWith('.xml') || loc.includes('/sitemap')) {
        queue.push(loc);
      } else {
        urls.push(loc);
      }
    }
  }

  return unique(urls);
}

function buildSeedUrls(baseUrl: string, sitemapUrls: string[], limit: number): string[] {
  const mandatoryPaths = [
    '/',
    '/scholarships',
    '/scholarships/hub/best-recommendation',
    '/scholarships/hub/easy-apply',
    '/scholarships/hub/hot-deadlines',
    '/scholarships/hub/international-friendly',
    '/scholarships/hub/matches',
    '/providers',
    '/compare',
    '/resources',
    '/essays',
    '/subscription'
  ];

  const mandatory = mandatoryPaths
    .map((path) => normalizeUrl(path, baseUrl))
    .filter((value): value is string => Boolean(value));

  const countryOrCategory = sitemapUrls.filter((url) =>
    /\/scholarships\/(?:country|countries|category|categories|hub)\//i.test(
      new URL(url).pathname
    )
  );
  const scholarshipDetails = sitemapUrls.filter((url) => {
    const path = new URL(url).pathname;
    return path.startsWith('/scholarships/') && !path.includes('/hub/');
  });
  const resources = sitemapUrls.filter((url) =>
    /^\/(?:resources|essays|providers|compare)\//i.test(new URL(url).pathname)
  );

  return unique([
    ...mandatory,
    ...countryOrCategory.slice(0, 80),
    ...scholarshipDetails.slice(0, 80),
    ...resources.slice(0, 40),
    ...sitemapUrls
  ]).slice(0, limit);
}

function visibleErrorSnippets(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const out: string[] = [];
  for (const pattern of VISIBLE_ERROR_PATTERNS) {
    for (const match of normalized.matchAll(pattern)) {
      const index = match.index ?? 0;
      out.push(normalized.slice(Math.max(0, index - 120), index + 240));
    }
  }
  return unique(out).slice(0, 8);
}

async function auditPage(
  browser: Browser,
  url: string,
  config: Config
): Promise<PageAudit> {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 900 },
    userAgent:
      'Mozilla/5.0 (compatible; ScholarshipTopProductionAudit/1.0; +https://scholarshiptop.com)'
  });
  const started = Date.now();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: PageAudit['failedRequests'] = [];

  page.setDefaultTimeout(config.navigationTimeoutMs);
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    const responseUrl = response.url();
    const status = response.status();
    if (status >= 400 && normalizeUrl(responseUrl, config.baseUrl)) {
      failedRequests.push({ url: responseUrl, status });
    }
  });
  page.on('requestfailed', (request) => {
    const requestUrl = request.url();
    const failure = request.failure()?.errorText;
    const parsed = new URL(requestUrl);
    const isExpectedNextPrefetchAbort =
      failure === 'net::ERR_ABORTED' && parsed.searchParams.has('_rsc');
    if (normalizeUrl(requestUrl, config.baseUrl) && !isExpectedNextPrefetchAbort) {
      failedRequests.push({
        url: requestUrl,
        failure
      });
    }
  });

  let status: number | null = null;
  try {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: config.navigationTimeoutMs
    });
    status = response?.status() ?? null;
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
  } catch (error) {
    pageErrors.push(error instanceof Error ? error.message : String(error));
  }

  const meta = await page
    .evaluate(() => {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
        .map((a) => a.href)
        .filter(Boolean);
      const titleNodes = Array.from(document.querySelectorAll('title'));
      const canonicalNodes = Array.from(
        document.querySelectorAll<HTMLLinkElement>('link[rel~="canonical"]')
      );
      const robots = Array.from(
        document.querySelectorAll<HTMLMetaElement>('meta[name="robots"]')
      )
        .map((node) => node.content.toLowerCase())
        .join(',');
      return {
        bodyText: document.body?.innerText ?? '',
        title: document.title || null,
        titleCount: titleNodes.length,
        canonical: canonicalNodes[0]?.href ?? null,
        canonicalCount: canonicalNodes.length,
        noindex: robots.includes('noindex'),
        links
      };
    })
    .catch(() => ({
      bodyText: '',
      title: null,
      titleCount: 0,
      canonical: null,
      canonicalCount: 0,
      noindex: false,
      links: [] as string[]
    }));

  const finalUrl = page.url();
  await page.close().catch(() => undefined);

  return {
    url,
    finalUrl,
    status,
    ok: status != null && status >= 200 && status < 400,
    title: meta.title,
    titleCount: meta.titleCount,
    canonical: meta.canonical,
    canonicalCount: meta.canonicalCount,
    noindex: meta.noindex,
    visibleErrorSnippets: visibleErrorSnippets(meta.bodyText),
    consoleErrors: unique(consoleErrors).slice(0, 20),
    pageErrors: unique(pageErrors).slice(0, 20),
    failedRequests: unique(failedRequests.map((x) => JSON.stringify(x)))
      .map((x) => JSON.parse(x) as PageAudit['failedRequests'][number])
      .slice(0, 50),
    internalLinks: unique(
      meta.links
        .map((link) => normalizeUrl(link, config.baseUrl))
        .filter((link): link is string => Boolean(link))
    ),
    durationMs: Date.now() - started
  };
}

async function runPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let next = 0;

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (;;) {
        const index = next;
        next += 1;
        if (index >= items.length) return;
        results[index] = await worker(items[index], index);
      }
    })
  );

  return results;
}

async function checkLink(targetUrl: string, sourceUrl: string): Promise<BrokenLink | null> {
  try {
    let response = await fetch(targetUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'user-agent': 'ScholarshipTopProductionAudit/1.0 (+https://scholarshiptop.com)'
      }
    });
    if (response.status === 405 || response.status === 403) {
      response = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'user-agent': 'ScholarshipTopProductionAudit/1.0 (+https://scholarshiptop.com)'
        }
      });
    }
    if (response.status >= 400) {
      return { sourceUrl, targetUrl, status: response.status };
    }
    return null;
  } catch (error) {
    return {
      sourceUrl,
      targetUrl,
      status: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function issuesFromPage(page: PageAudit): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (page.status == null || page.status >= 500) {
    issues.push({
      severity: 'critical',
      type: 'http_error',
      url: page.url,
      message: `Page returned ${page.status ?? 'no response'}`
    });
  } else if (page.status >= 400) {
    issues.push({
      severity: 'high',
      type: 'http_error',
      url: page.url,
      message: `Page returned ${page.status}`
    });
  }
  if (page.visibleErrorSnippets.length > 0) {
    issues.push({
      severity: 'high',
      type: 'visible_ui_error',
      url: page.url,
      message: 'Visible error text found on page',
      detail: page.visibleErrorSnippets
    });
  }
  if (page.consoleErrors.length > 0 || page.pageErrors.length > 0) {
    issues.push({
      severity: 'medium',
      type: 'browser_error',
      url: page.url,
      message: 'Console or runtime errors found',
      detail: { consoleErrors: page.consoleErrors, pageErrors: page.pageErrors }
    });
  }
  if (page.failedRequests.length > 0) {
    issues.push({
      severity: 'medium',
      type: 'failed_request',
      url: page.url,
      message: 'Internal page requests failed',
      detail: page.failedRequests
    });
  }
  if (!page.title || page.title.trim().length === 0 || page.titleCount !== 1) {
    issues.push({
      severity: 'medium',
      type: 'seo_title',
      url: page.url,
      message: `Expected exactly one non-empty title, found ${page.titleCount}`
    });
  }
  if (!page.canonical || page.canonicalCount !== 1) {
    issues.push({
      severity: 'medium',
      type: 'seo_canonical',
      url: page.url,
      message: `Expected exactly one canonical, found ${page.canonicalCount}`
    });
  }
  if (page.noindex) {
    issues.push({
      severity: 'low',
      type: 'seo_noindex',
      url: page.url,
      message: 'Page has noindex robots meta'
    });
  }
  return issues;
}

async function main() {
  const config = parseConfig();
  const sitemapUrls = await loadSitemapUrls(config.baseUrl);
  const urls = buildSeedUrls(config.baseUrl, sitemapUrls, config.limit);

  console.log(
    `Auditing ${urls.length} URLs from ${config.baseUrl} with concurrency ${config.concurrency}`
  );

  const browser = await chromium.launch({ headless: true });
  const pages = await runPool(urls, config.concurrency, async (url, index) => {
    console.log(`[${index + 1}/${urls.length}] ${url}`);
    return auditPage(browser, url, config);
  });
  await browser.close();

  const linkSource = new Map<string, string>();
  for (const page of pages) {
    for (const link of page.internalLinks) {
      if (!linkSource.has(link)) linkSource.set(link, page.url);
    }
  }
  const linksToCheck = [...linkSource.keys()].slice(0, config.linkCheckLimit);
  const brokenLinks = (
    await runPool(linksToCheck, 8, (link) => checkLink(link, linkSource.get(link) ?? ''))
  ).filter((item): item is BrokenLink => Boolean(item));

  const issues = [
    ...pages.flatMap(issuesFromPage),
    ...brokenLinks.map((link): AuditIssue => ({
      severity: link.status != null && link.status >= 500 ? 'high' : 'medium',
      type: 'broken_internal_link',
      url: link.sourceUrl,
      message: `Broken internal link to ${link.targetUrl}`,
      detail: { status: link.status, error: link.error }
    }))
  ];

  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    baseUrl: config.baseUrl,
    limit: config.limit,
    visitedCount: pages.length,
    checkedLinkCount: linksToCheck.length,
    pages,
    brokenLinks,
    issues,
    skippedUrls: sitemapUrls.slice(config.limit)
  };

  await writeFile(config.outFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(
    `Done. ${issues.length} issues, ${brokenLinks.length} broken links. Report: ${config.outFile}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
