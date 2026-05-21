/**
 * Post-build smoke: HTTP status + key SEO headers for Stage 2 pilot routes.
 * Usage: SCREENSHOT_BASE_URL=http://localhost:3000 npx tsx scripts/i18n-build-smoke-check.ts
 */
const BASE = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:3000';

const paths = [
  '/',
  '/es',
  '/fr',
  '/scholarships',
  '/es/scholarships',
  '/fr/scholarships',
  '/essays',
  '/es/essays',
  '/fr/essays',
  '/compare/scholarship-vs-grant',
  '/es/compare/scholarship-vs-grant',
  '/fr/compare/scholarship-vs-grant',
  '/es/essays/outline',
  '/fr/resources/how-to-find-scholarships',
  '/es/terms',
  '/fr/faq',
  '/es/international-students',
  '/resources/how-to-apply-for-scholarships',
  '/es/resources/how-to-apply-for-scholarships',
  '/en',
  '/de'
] as const;

function extractCanonical(html: string): string | null {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  return m?.[1] ?? null;
}

function hasHreflang(html: string, lang: string): boolean {
  return new RegExp(`hreflang=["']${lang}["']`, 'i').test(html);
}

function isNoindex(html: string): boolean {
  return /noindex/i.test(html);
}

async function checkPath(path: string) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { redirect: 'follow' });
  const html = await res.text();
  const canonical = extractCanonical(html);
  return { path, status: res.status, canonical, html };
}

async function main() {
  const results: string[] = [];
  let failed = false;

  for (const path of paths) {
    const { status, canonical, html } = await checkPath(path);
    if (path === '/en' || path === '/de') {
      if (status !== 404) {
        failed = true;
        results.push(`FAIL ${path} expected 404 got ${status}`);
      } else {
        results.push(`OK   ${path} → 404`);
      }
      continue;
    }

    if (status !== 200) {
      failed = true;
      results.push(`FAIL ${path} status ${status}`);
      continue;
    }

    const locale = path.startsWith('/es')
      ? 'es'
      : path.startsWith('/fr')
        ? 'fr'
        : 'en';
    const expectedCanonicalHost = 'scholarshiptop.com';
    if (!canonical?.includes(expectedCanonicalHost)) {
      failed = true;
      results.push(`FAIL ${path} missing canonical`);
      continue;
    }
    if (locale === 'es' && !canonical.includes('/es')) {
      failed = true;
      results.push(`FAIL ${path} canonical not localized: ${canonical}`);
      continue;
    }
    if (locale === 'fr' && !canonical.includes('/fr')) {
      failed = true;
      results.push(`FAIL ${path} canonical not localized: ${canonical}`);
      continue;
    }
    if (locale === 'en' && /\/(es|fr)\//.test(canonical)) {
      failed = true;
      results.push(`FAIL ${path} English canonical has locale prefix: ${canonical}`);
      continue;
    }
    if (!hasHreflang(html, 'en') || !hasHreflang(html, 'es') || !hasHreflang(html, 'fr')) {
      failed = true;
      results.push(`FAIL ${path} missing hreflang cluster`);
      continue;
    }

    results.push(`OK   ${path} → ${status} canonical=${canonical}`);
  }

  console.log(results.join('\n'));
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
