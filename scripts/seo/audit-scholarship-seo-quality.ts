import fs from 'node:fs';
import path from 'node:path';

import { getScholarshipSeoRouteQualityPolicy } from '@/lib/seo/scholarshipSeoQualityPolicy';
import { getSeoManifestRoute } from '@/lib/scholarships/seoScholarshipResolve';

type SampleResult = {
  url: string;
  routeFamily: string;
  status: number;
  finalUrl: string;
  robots: string | null;
  canonical: string | null;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  visibleWordCount: number;
  internalLinkCount: number;
  jsonLdCount: number;
  schemaTypes: string[];
  inSitemap: boolean;
  policyRouteFamily: string | null;
  policyShouldIndex: boolean | null;
  policyShouldIncludeInSitemap: boolean | null;
  policyReasons: string[];
  qualityScore: number;
  classification:
    | 'KEEP_INDEXABLE'
    | 'KEEP_BUT_IMPROVE'
    | 'NOINDEX_AND_REMOVE_FROM_SITEMAP'
    | 'REMOVE_FROM_SITEMAP_ONLY'
    | 'NEEDS_MANUAL_REVIEW';
};

const KNOWN_SAMPLE_PATHS = [
  '/scholarships/california',
  '/scholarships/no-essay',
  '/scholarships/connecticut/high-school/nursing',
  '/scholarships/texas/high-school/arts',
  '/scholarships/engineering',
  '/scholarships/category/stem',
  '/scholarships/category/education',
  '/scholarships/for-students-from/canada/study-in/united-states'
];

function argValue(name: string): string | null {
  const prefix = `${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstMatch(html: string, pattern: RegExp): string | null {
  return html.match(pattern)?.[1]?.trim() ?? null;
}

function extractMetaContent(html: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (
    firstMatch(
      html,
      new RegExp(
        `<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
        'i'
      )
    ) ??
    firstMatch(
      html,
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["']`,
        'i'
      )
    )
  );
}

function extractCanonical(html: string): string | null {
  return firstMatch(
    html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
  );
}

function extractTitle(html: string): string | null {
  return firstMatch(html, /<title>([\s\S]*?)<\/title>/i);
}

function extractH1(html: string): string | null {
  const raw = firstMatch(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return raw ? stripTags(raw) : null;
}

function extractInternalLinkCount(html: string): number {
  const links = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]+href=["']([^"']+)["']/gi)) {
    const href = match[1]?.trim();
    if (href?.startsWith('/')) links.add(href.split('#')[0] ?? href);
  }
  return links.size;
}

function extractSchemaTypes(html: string): string[] {
  const types = new Set<string>();
  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const type = (row as Record<string, unknown>)['@type'];
        if (typeof type === 'string') types.add(type);
        if (Array.isArray(type)) {
          for (const item of type) if (typeof item === 'string') types.add(item);
        }
      }
    } catch {
      // Ignore malformed JSON-LD in this read-only audit script.
    }
  }
  return Array.from(types).sort();
}

function routeFamilyFromPath(pathname: string): string {
  const parts = pathname
    .replace(/^\/scholarships\/?/, '')
    .split('/')
    .filter(Boolean);
  if (pathname.startsWith('/scholarships/category/')) return 'category';
  if (pathname.startsWith('/scholarships/for-students-from/')) {
    return 'cross_country';
  }
  if (parts.length === 1) return 'single_segment_listing';
  if (parts.length === 2) return 'state_or_combo_listing';
  if (parts.length === 3) return 'state_degree_topic_listing';
  return 'scholarship_listing';
}

function scholarshipPolicyForPath(pathname: string): {
  routeFamily: string;
  shouldIndex: boolean;
  shouldIncludeInSitemap: boolean;
  reasons: string[];
} | null {
  if (!pathname.startsWith('/scholarships/')) return null;
  if (pathname.startsWith('/scholarships/category/')) return null;
  const canonicalPath = pathname.replace(/^\/scholarships\/?/, '').replace(/\/+$/, '');
  if (!canonicalPath) return null;
  const routeFamily = pathname.startsWith('/scholarships/for-students-from/')
    ? 'cross_country_seo'
    : undefined;
  const decision = getScholarshipSeoRouteQualityPolicy({
    canonicalPath,
    entry: getSeoManifestRoute(canonicalPath),
    routeFamily,
    stablePublicRoute: true,
    routeResolves: true,
    hasQueryParams: false
  });
  return {
    routeFamily: decision.routeFamily,
    shouldIndex: decision.shouldIndex,
    shouldIncludeInSitemap: decision.shouldIncludeInSitemap,
    reasons: decision.reasonCodes
  };
}

function classify(result: Omit<SampleResult, 'classification'>): SampleResult['classification'] {
  if (result.policyShouldIndex === false) {
    return 'NOINDEX_AND_REMOVE_FROM_SITEMAP';
  }
  if (result.policyShouldIndex === true) {
    return result.visibleWordCount >= 800 && result.internalLinkCount >= 4
      ? 'KEEP_INDEXABLE'
      : 'KEEP_BUT_IMPROVE';
  }

  const robots = result.robots?.toLowerCase() ?? '';
  if (result.status !== 200 || robots.includes('noindex')) {
    return 'NOINDEX_AND_REMOVE_FROM_SITEMAP';
  }
  if (!result.canonical || !result.title || !result.h1) {
    return 'NEEDS_MANUAL_REVIEW';
  }
  if (result.visibleWordCount < 800 || result.internalLinkCount < 4) {
    return result.inSitemap
      ? 'NOINDEX_AND_REMOVE_FROM_SITEMAP'
      : 'REMOVE_FROM_SITEMAP_ONLY';
  }
  if (result.visibleWordCount < 1500 || result.internalLinkCount < 10) {
    return 'KEEP_BUT_IMPROVE';
  }
  return 'KEEP_INDEXABLE';
}

async function fetchSitemapPaths(baseUrl: string): Promise<Set<string>> {
  const sitemapTexts = await Promise.all(
    ['/sitemaps/seo.xml', '/sitemaps/categories.xml'].map((sitemapPath) =>
      fetch(`${baseUrl}${sitemapPath}`).then((res) => (res.ok ? res.text() : ''))
    )
  );
  const paths = new Set<string>();
  for (const sitemap of sitemapTexts) {
    for (const match of sitemap.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
      try {
        paths.add(new URL(match[1]!).pathname);
      } catch {
        // Ignore malformed sitemap entries in this sampler.
      }
    }
  }
  return paths;
}

async function auditPath(
  baseUrl: string,
  pathname: string,
  sitemapPaths: Set<string>
): Promise<SampleResult> {
  const url = `${baseUrl}${pathname}`;
  const response = await fetch(url, { redirect: 'follow' });
  const html = await response.text();
  const text = stripTags(html);
  const internalLinkCount = extractInternalLinkCount(html);
  const schemaTypes = extractSchemaTypes(html);
  const policy = scholarshipPolicyForPath(pathname);
  const baseResult: Omit<SampleResult, 'classification'> = {
    url,
    routeFamily: routeFamilyFromPath(pathname),
    status: response.status,
    finalUrl: response.url,
    robots: extractMetaContent(html, 'robots'),
    canonical: extractCanonical(html),
    title: extractTitle(html),
    metaDescription: extractMetaContent(html, 'description'),
    h1: extractH1(html),
    visibleWordCount: text ? text.split(/\s+/).length : 0,
    internalLinkCount,
    jsonLdCount: (html.match(/application\/ld\+json/gi) ?? []).length,
    schemaTypes,
    inSitemap: sitemapPaths.has(pathname),
    policyRouteFamily: policy?.routeFamily ?? null,
    policyShouldIndex: policy?.shouldIndex ?? null,
    policyShouldIncludeInSitemap: policy?.shouldIncludeInSitemap ?? null,
    policyReasons: policy?.reasons ?? [],
    qualityScore:
      (response.status === 200 ? 20 : 0) +
      (extractCanonical(html) ? 15 : 0) +
      (extractTitle(html) ? 10 : 0) +
      (extractH1(html) ? 10 : 0) +
      Math.min(25, Math.floor((text ? text.split(/\s+/).length : 0) / 60)) +
      Math.min(20, internalLinkCount * 2)
  };
  return { ...baseResult, classification: classify(baseResult) };
}

async function main() {
  const baseUrl = normalizeBaseUrl(
    argValue('--base-url') ?? 'https://scholarshiptop.com'
  );
  const outPath =
    argValue('--out') ??
    'artifacts/seo/scholarship-seo-quality-sample-2026-05-28.json';
  const sitemapPaths = await fetchSitemapPaths(baseUrl);
  const results: SampleResult[] = [];

  for (const pathname of KNOWN_SAMPLE_PATHS) {
    results.push(await auditPath(baseUrl, pathname, sitemapPaths));
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl,
        sitemapPathCount: sitemapPaths.size,
        samples: results
      },
      null,
      2
    )}\n`
  );
  console.log(`Wrote ${results.length} samples to ${outPath}`);
  for (const item of results) {
    console.log(
      `${item.status} ${item.classification} ${item.visibleWordCount}w ${item.internalLinkCount} links ${item.url}`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
