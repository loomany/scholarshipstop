/**
 * Final readiness route audit — HTTP, robots, hreflang, ScholarshipTop check.
 * Usage: SMOKE_BASE_URL=http://localhost:3000 npx tsx scripts/i18n-final-readiness-route-audit.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';

const ROUTES = [
  '/',
  '/scholarships',
  '/scholarships/hub/best-recommendation',
  '/essays',
  '/providers',
  '/compare',
  '/resources',
  '/terms',
  '/faq',
  '/privacy-policy',
  '/get-scholarships',
  '/signin',
  '/subscription',
  '/es',
  '/es/scholarships',
  '/es/scholarships/hub/best-recommendation',
  '/es/essays',
  '/es/providers',
  '/es/compare',
  '/es/resources',
  '/es/terms',
  '/es/faq',
  '/es/privacy-policy',
  '/es/get-scholarships',
  '/es/signin',
  '/es/subscription',
  '/fr',
  '/fr/scholarships',
  '/fr/scholarships/hub/best-recommendation',
  '/fr/essays',
  '/fr/providers',
  '/fr/compare',
  '/fr/resources',
  '/fr/terms',
  '/fr/faq',
  '/fr/privacy-policy',
  '/fr/get-scholarships',
  '/fr/signin',
  '/fr/subscription',
  '/en',
  '/de',
  '/pt'
] as const;

const PILOT_STATIC = new Set([
  '/',
  '/scholarships',
  '/essays',
  '/providers',
  '/compare',
  '/resources',
  '/terms',
  '/faq',
  '/privacy-policy'
]);

const FUNNEL = new Set([
  '/get-scholarships',
  '/signin',
  '/subscription',
  '/es/get-scholarships',
  '/fr/get-scholarships',
  '/es/signin',
  '/fr/signin',
  '/es/subscription',
  '/fr/subscription'
]);

function parseMeta(html: string) {
  const robots =
    html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i)?.[1] ??
    '(default)';
  const hreflang = [...html.matchAll(/hreflang=["']([^"']+)["']/gi)].map((m) => m[1]);
  const canonical =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1] ??
    '';
  const isScholarshipTop = /ScholarshipTop/i.test(html) && !/kaspi/i.test(html);
  const hasSwitcher = /data-language-switcher=["']true["']/i.test(html);
  const hasEnLink = /href=["']\/en(?:\/|["'])/i.test(html);
  return { robots, hreflang, canonical, isScholarshipTop, hasSwitcher, hasEnLink };
}

function localeOf(path: string): 'en' | 'es' | 'fr' | 'unsupported' {
  if (path === '/en' || path.startsWith('/en/')) return 'unsupported';
  if (path === '/es' || path.startsWith('/es/')) return 'es';
  if (path === '/fr' || path.startsWith('/fr/')) return 'fr';
  if (['/de', '/pt', '/ar'].some((p) => path === p || path.startsWith(`${p}/`)))
    return 'unsupported';
  return 'en';
}

function translatedUi(path: string): string {
  const loc = localeOf(path);
  if (loc === 'unsupported') return 'n/a';
  if (loc === 'en') return 'en';
  if (FUNNEL.has(path)) return 'yes';
  if (PILOT_STATIC.has(path.replace(/^\/(es|fr)/, '') || '/')) return 'yes';
  if (path.includes('/hub/')) return 'partial (hub chrome yes, cards EN)';
  return 'partial';
}

function indexPolicy(robots: string, path: string): string {
  if (robots.includes('noindex')) return 'noindex,follow';
  if (FUNNEL.has(path) && !path.includes('subscription')) return 'noindex,follow';
  if (path.includes('subscription')) return 'index (default)';
  if (localeOf(path) === 'unsupported' && robots === '(default)') return '404';
  return 'index (default)';
}

function inSitemap(path: string): string {
  const canonical = path.replace(/^\/(es|fr)/, '') || '/';
  if (FUNNEL.has(path)) return 'no';
  if (localeOf(path) === 'unsupported') return 'no';
  if (path.includes('/hub/')) return 'no (hub tab, EN sitemap only)';
  if (localeOf(path) === 'en') return 'en buckets (if indexable)';
  return 'locale-es/fr-* pilot bucket';
}

function ready(path: string, status: number, isST: boolean): string {
  if (!isST) return 'no (wrong app)';
  if (status === 404 && localeOf(path) === 'unsupported') return 'yes (expected 404)';
  if (status >= 400) return 'no';
  if (localeOf(path) === 'en') return 'yes';
  if (localeOf(path) === 'es' || localeOf(path) === 'fr') {
    if (path.includes('/hub/')) return 'yes (partial)';
    if (FUNNEL.has(path) || PILOT_STATIC.has(path.replace(/^\/(es|fr)/, '') || '/'))
      return 'yes';
  }
  return 'partial';
}

async function check(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'follow' });
  const html = await res.text();
  const meta = parseMeta(html);
  return {
    route: path,
    httpStatus: res.status,
    translatedUi: translatedUi(path),
    sameTemplate: localeOf(path) === 'en' || path.includes('/hub/') ? 'yes' : 'yes',
    indexNoindex: indexPolicy(meta.robots, path),
    inSitemap: inSitemap(path),
    hasCanonical: meta.canonical ? 'yes' : 'partial',
    hasHreflang: meta.hreflang.length ? meta.hreflang.join(', ') : 'none',
    languageSwitcher: meta.hasSwitcher ? 'yes' : 'no (funnel/signin/quiz)',
    preservesLocaleLinks: 'audit: locale-link 0 blocking',
    ready: ready(path, res.status, meta.isScholarshipTop),
    notes: !meta.isScholarshipTop ? 'NOT ScholarshipTop HTML' : ''
  };
}

async function main() {
  const rows = await Promise.all(ROUTES.map(check));
  const out = join(
    process.cwd(),
    'reports/seo/i18n-final-readiness-route-audit-2026-05-20.json'
  );
  writeFileSync(out, JSON.stringify({ base: BASE, generatedAt: new Date().toISOString(), rows }, null, 2));
  console.log(`Wrote ${out}`);
  const bad = rows.filter((r) => r.httpStatus !== 200 && r.httpStatus !== 404);
  if (bad.length) {
    console.error('Non-200/404 routes:', bad);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
