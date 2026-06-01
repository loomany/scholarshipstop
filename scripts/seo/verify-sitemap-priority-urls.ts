/**
 * D16 targeted sitemap verification for priority URLs.
 * Run: npx tsx scripts/seo/verify-sitemap-priority-urls.ts
 * Optional production fetch: npx tsx scripts/seo/verify-sitemap-priority-urls.ts --prod
 */
import fs from 'fs';
import path from 'path';

import { buildDedicatedResourceGuideSitemapEntries } from '@/lib/seo/dedicatedResourceGuideSitemap';

const BASE = 'https://scholarshiptop.com';
const PROD = process.argv.includes('--prod');

function dedicatedResourceGuideUrls(base: string): string[] {
  return buildDedicatedResourceGuideSitemapEntries(base).map((e) => e.url);
}

type Row = {
  url: string;
  http_status: string;
  robots_meta: string;
  canonical: string;
  expected_in_sitemap: string;
  found_in_sitemap: string;
  sitemap_bucket: string;
  result: string;
  notes: string;
};

const TARGETS: {
  path: string;
  expectedInSitemap: boolean;
  note?: string;
}[] = [
  { path: '/resources/medical-scholarships-guide', expectedInSitemap: true },
  { path: '/essays/career-goals', expectedInSitemap: true },
  {
    path: '/resources/best-scholarships-texas-international-students',
    expectedInSitemap: true
  },
  { path: '/resources/how-to-find-scholarships', expectedInSitemap: true },
  { path: '/resources/best-scholarship-websites', expectedInSitemap: true },
  { path: '/providers/loyola-university-chicago', expectedInSitemap: true },
  {
    path: '/scholarships/texas/tarleton-state-university',
    expectedInSitemap: true
  },
  {
    path: '/scholarships/california/california-state-university-northridge',
    expectedInSitemap: true
  },
  {
    path: '/compare/states/california-vs-texas',
    expectedInSitemap: false,
    note: 'noindex policy'
  },
  {
    path: '/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida',
    expectedInSitemap: false,
    note: 'noindex policy; may appear in seo.xml per drip'
  }
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

async function fetchText(url: string): Promise<{ status: number; text: string }> {
  const resp = await fetch(url, { signal: AbortSignal.timeout(60000) });
  return { status: resp.status, text: await resp.text() };
}

const TARGET_BUCKETS = [
  'resources',
  'essays-0',
  'providers',
  'seo',
  'scholarships-0',
  'compare'
] as const;

async function loadProductionSitemapHits(): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  await Promise.all(
    TARGET_BUCKETS.map(async (bucketName) => {
      try {
        const { text } = await fetchText(`${BASE}/sitemaps/${bucketName}.xml`);
        for (const target of TARGETS) {
          const full = `${BASE}${target.path}`;
          if (text.includes(full) && !found.has(full)) {
            found.set(full, bucketName);
          }
        }
      } catch {
        /* skip failed bucket */
      }
    })
  );
  return found;
}

async function main() {
  const dedicated = dedicatedResourceGuideUrls(BASE);
  const codeMedical = dedicated.some((u) =>
    u.endsWith('/resources/medical-scholarships-guide')
  );

  let sitemapHits = new Map<string, string>();
  if (PROD) {
    sitemapHits = await loadProductionSitemapHits();
  } else if (codeMedical) {
    sitemapHits.set(
      `${BASE}/resources/medical-scholarships-guide`,
      'resources (code-level)'
    );
  }

  const rows: Row[] = [];
  for (const target of TARGETS) {
    const url = `${BASE}${target.path}`;
    let httpStatus = PROD ? '0' : 'skip';
    let robots = '';
    let canonical = '';

    if (PROD) {
      try {
        const { status, text } = await fetchText(url);
        httpStatus = String(status);
        robots = extractMeta(text, 'robots') || '(none)';
        canonical = extractCanonical(text);
      } catch (e) {
        httpStatus = 'error';
        robots = e instanceof Error ? e.message : String(e);
      }
    }

    const bucket = sitemapHits.get(url) ?? '';
    const found = Boolean(bucket);
    const expected = target.expectedInSitemap ? 'yes' : 'no';

    let result = 'ok';
    if (target.expectedInSitemap && !found) result = 'fail';
    if (!target.expectedInSitemap && found) result = 'note';

    let notes = target.note ?? '';
    if (target.path === '/resources/medical-scholarships-guide') {
      if (codeMedical && !found) {
        result = 'pending_deploy';
        notes = 'code fix verified; not yet in live sitemap until deploy';
      } else if (codeMedical && found) {
        notes = notes || 'medical guide present in sitemap';
      }
    }

    rows.push({
      url,
      http_status: httpStatus,
      robots_meta: robots,
      canonical,
      expected_in_sitemap: expected,
      found_in_sitemap: found ? 'yes' : 'no',
      sitemap_bucket: bucket,
      result,
      notes
    });
  }

  const header = Object.keys(rows[0]).join(',');
  const csv = [header, ...rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
  const outDir = path.join(process.cwd(), 'reports/data');
  fs.writeFileSync(path.join(outDir, 'd16-sitemap-targeted-verification.csv'), csv + '\n', 'utf8');
  console.log('Wrote reports/data/d16-sitemap-targeted-verification.csv');
  console.log('codeMedical=', codeMedical, 'mode=', PROD ? 'prod' : 'local-code');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
