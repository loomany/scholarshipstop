import { writeFile } from 'node:fs/promises';
import { chromium, type Browser, type ConsoleMessage, type Page } from 'playwright';

type PageCheck = {
  url: string;
  finalUrl: string | null;
  status: number | null;
  ok: boolean;
  durationMs: number;
  title: string | null;
  textLength: number;
  consoleErrors: string[];
  pageErrors: string[];
  hydrationErrors: string[];
  failedRequests: Array<{ url: string; status?: number; failure?: string }>;
  error?: string;
};

type FinalAuditReport = {
  generatedAt: string;
  baseUrl: string;
  config: {
    sampleSize: number;
    concurrency: number;
    timeoutMs: number;
    p3ThresholdMs: number;
  };
  summary: {
    essaysOk: boolean;
    essaysStatus: number | null;
    hydrationErrorCount: number;
    p3Ok: boolean;
    p3DurationMs: number | null;
    resourceAverageDurationMs: number | null;
    sampledUrlCount: number;
    sampledErrorCount: number;
    sampled5xxCount: number;
    sampled4xxCount: number;
  };
  priorityChecks: {
    essays: PageCheck;
    p3Resource: PageCheck;
    hydrationPages: PageCheck[];
  };
  sampledPages: PageCheck[];
};

type Config = {
  baseUrl: string;
  outFile: string;
  sampleSize: number;
  concurrency: number;
  timeoutMs: number;
  p3ThresholdMs: number;
};

const DEFAULT_BASE_URL = 'https://scholarshiptop.com';
const P3_PATH = '/resources/keep-scholarship-usa-working-on-campus';
const HYDRATION_PATTERNS = [
  /hydration failed/i,
  /text content (?:does not match|did not match)/i,
  /minified react error #(?:418|425)/i,
  /react error #(?:418|425)/i
];
const STATIC_OR_NON_PAGE_EXTENSIONS =
  /\.(?:png|jpe?g|gif|webp|svg|ico|css|js|mjs|map|json|txt|pdf|zip|mp4|webm|woff2?|ttf|eot)$/i;

function argValue(name: string): string | undefined {
  const exact = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (exact) return exact.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1];
  return undefined;
}

function intArg(name: string, fallback: number): number {
  const raw = argValue(name) ?? process.env[`FINAL_CHECK_${name.toUpperCase()}`];
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function parseConfig(): Config {
  const baseUrl = (argValue('base') ?? process.env.FINAL_CHECK_BASE_URL ?? DEFAULT_BASE_URL)
    .trim()
    .replace(/\/+$/, '');
  return {
    baseUrl,
    outFile: argValue('out') ?? process.env.FINAL_CHECK_OUT ?? 'final-audit-report.json',
    sampleSize: intArg('sample-size', 75),
    concurrency: Math.min(intArg('concurrency', 4), 8),
    timeoutMs: intArg('timeout-ms', 15000),
    p3ThresholdMs: intArg('p3-threshold-ms', 5000)
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

function seededShuffle<T>(items: T[], seed = 1337): T[] {
  const out = [...items];
  let s = seed;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'ScholarshipTopFinalCheck/1.0 (+https://scholarshiptop.com)'
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
  const queue = [`${baseUrl}/sitemap.xml`];
  const seen = new Set<string>();
  const urls: string[] = [];

  while (queue.length > 0 && seen.size < 50) {
    const sitemapUrl = queue.shift();
    if (!sitemapUrl || seen.has(sitemapUrl)) continue;
    seen.add(sitemapUrl);
    const xml = await fetchText(sitemapUrl);
    if (!xml) continue;

    for (const loc of parseLocs(xml, baseUrl)) {
      if (loc.endsWith('.xml') || loc.includes('/sitemap')) queue.push(loc);
      else urls.push(loc);
    }
  }

  return unique(urls)
    .map((url) => normalizeUrl(url, baseUrl))
    .filter((url): url is string => Boolean(url));
}

function isHydrationError(message: string): boolean {
  return HYDRATION_PATTERNS.some((pattern) => pattern.test(message));
}

function consoleMessageText(message: ConsoleMessage): string {
  const text = message.text();
  const location = message.location();
  return location.url ? `${text} (${location.url}:${location.lineNumber})` : text;
}

function isExpectedNextPrefetchAbort(url: string, failure?: string): boolean {
  if (!failure || !/ERR_ABORTED/i.test(failure)) return false;
  try {
    return new URL(url).searchParams.has('_rsc');
  } catch {
    return false;
  }
}

async function checkPage(browser: Browser, url: string, config: Config): Promise<PageCheck> {
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (compatible; ScholarshipTopFinalCheck/1.0; +https://scholarshiptop.com)'
  });
  page.setDefaultNavigationTimeout(config.timeoutMs);
  page.setDefaultTimeout(config.timeoutMs);

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: PageCheck['failedRequests'] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(consoleMessageText(message));
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText;
    const requestUrl = request.url();
    if (isExpectedNextPrefetchAbort(requestUrl, failure)) return;
    failedRequests.push({ url: requestUrl, failure });
  });
  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      const responseUrl = response.url();
      if (responseUrl.startsWith(config.baseUrl)) {
        failedRequests.push({ url: responseUrl, status });
      }
    }
  });

  const start = Date.now();
  try {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: config.timeoutMs
    });
    await page.waitForTimeout(1200);

    const durationMs = Date.now() - start;
    const [title, textLength] = await Promise.all([
      page.title().catch(() => null),
      page.locator('body').innerText({ timeout: 3000 }).then((text) => text.trim().length)
    ]);
    const allErrors = [...consoleErrors, ...pageErrors];
    const hydrationErrors = allErrors.filter(isHydrationError);

    return {
      url,
      finalUrl: page.url(),
      status: response?.status() ?? null,
      ok: Boolean(response?.ok()),
      durationMs,
      title,
      textLength,
      consoleErrors,
      pageErrors,
      hydrationErrors,
      failedRequests
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const allErrors = [...consoleErrors, ...pageErrors, message];
    return {
      url,
      finalUrl: page.url() || null,
      status: null,
      ok: false,
      durationMs: Date.now() - start,
      title: null,
      textLength: 0,
      consoleErrors,
      pageErrors,
      hydrationErrors: allErrors.filter(isHydrationError),
      failedRequests,
      error: message
    };
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function checkPages(
  browser: Browser,
  urls: string[],
  config: Config
): Promise<PageCheck[]> {
  const out: PageCheck[] = [];
  let next = 0;

  async function worker() {
    for (;;) {
      const index = next;
      next += 1;
      const url = urls[index];
      if (!url) break;
      const result = await checkPage(browser, url, config);
      out[index] = result;
      const status = result.status ?? 'ERR';
      console.log(`[${index + 1}/${urls.length}] ${status} ${result.durationMs}ms ${url}`);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(config.concurrency, urls.length) }, () => worker())
  );
  return out.filter(Boolean);
}

function buildHydrationUrls(baseUrl: string, sitemapUrls: string[]): string[] {
  const resourceUrls = sitemapUrls.filter((url) => {
    const path = new URL(url).pathname;
    return path.startsWith('/resources/') && path !== P3_PATH;
  });
  return unique([
    normalizeUrl('/', baseUrl),
    normalizeUrl('/resources', baseUrl),
    normalizeUrl(P3_PATH, baseUrl),
    ...resourceUrls.slice(0, 2)
  ]).filter((url): url is string => Boolean(url));
}

function buildSampleUrls(baseUrl: string, sitemapUrls: string[], sampleSize: number): string[] {
  const priority = [
    '/',
    '/essays',
    '/resources',
    P3_PATH,
    '/scholarships',
    '/scholarships/hub/easy-apply',
    '/scholarships/hub/international-friendly'
  ]
    .map((path) => normalizeUrl(path, baseUrl))
    .filter((url): url is string => Boolean(url));

  const shuffled = seededShuffle(
    sitemapUrls.filter((url) => !priority.includes(url)),
    20260625
  );
  return unique([...priority, ...shuffled]).slice(0, sampleSize);
}

function averageDuration(pages: PageCheck[], pathPrefix: string): number | null {
  const rows = pages.filter((page) => {
    try {
      return new URL(page.finalUrl || page.url).pathname.startsWith(pathPrefix);
    } catch {
      return false;
    }
  });
  if (rows.length === 0) return null;
  return Math.round(rows.reduce((sum, page) => sum + page.durationMs, 0) / rows.length);
}

async function main() {
  const config = parseConfig();
  const sitemapUrls = await loadSitemapUrls(config.baseUrl);
  const browser = await chromium.launch({ headless: true });

  try {
    const essaysUrl = normalizeUrl('/essays', config.baseUrl)!;
    const p3Url = normalizeUrl(P3_PATH, config.baseUrl)!;
    const hydrationUrls = buildHydrationUrls(config.baseUrl, sitemapUrls);
    const sampleUrls = buildSampleUrls(config.baseUrl, sitemapUrls, config.sampleSize);

    console.log(`Loaded ${sitemapUrls.length} URLs from sitemap`);
    console.log('Running priority checks...');

    const [essays, p3Resource, hydrationPages, sampledPages] = await Promise.all([
      checkPage(browser, essaysUrl, config),
      checkPage(browser, p3Url, config),
      checkPages(browser, hydrationUrls, config),
      checkPages(browser, sampleUrls, config)
    ]);

    const allHydrationErrors = hydrationPages.flatMap((page) => page.hydrationErrors);
    const sampled5xxCount = sampledPages.filter((page) => (page.status ?? 0) >= 500).length;
    const sampled4xxCount = sampledPages.filter((page) => {
      const status = page.status ?? 0;
      return status >= 400 && status < 500;
    }).length;
    const sampledErrorCount = sampledPages.filter((page) => !page.ok || page.error).length;
    const resourceAverageDurationMs = averageDuration(
      unique([...hydrationPages, ...sampledPages]),
      '/resources'
    );

    const report: FinalAuditReport = {
      generatedAt: new Date().toISOString(),
      baseUrl: config.baseUrl,
      config: {
        sampleSize: config.sampleSize,
        concurrency: config.concurrency,
        timeoutMs: config.timeoutMs,
        p3ThresholdMs: config.p3ThresholdMs
      },
      summary: {
        essaysOk: essays.status === 200 && essays.textLength > 500,
        essaysStatus: essays.status,
        hydrationErrorCount: allHydrationErrors.length,
        p3Ok: p3Resource.status === 200 && p3Resource.durationMs <= config.p3ThresholdMs,
        p3DurationMs: p3Resource.durationMs,
        resourceAverageDurationMs,
        sampledUrlCount: sampledPages.length,
        sampledErrorCount,
        sampled5xxCount,
        sampled4xxCount
      },
      priorityChecks: {
        essays,
        p3Resource,
        hydrationPages
      },
      sampledPages
    };

    await writeFile(config.outFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`Final audit written to ${config.outFile}`);
    console.log(JSON.stringify(report.summary, null, 2));

    if (!report.summary.essaysOk || report.summary.hydrationErrorCount > 0 || !report.summary.p3Ok) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
