/**
 * HTML spot-check for localized scholarship detail pages.
 * Usage: npx tsx scripts/seo/i18n-scholarship-detail-html-check.ts es /es/scholarships/SLUG [title fragment]
 */
const BASE = (process.env.SMOKE_BASE_URL ?? 'https://scholarshiptop.com').replace(/\/$/, '');

type Locale = 'es' | 'fr';

const EN_FALLBACK_MARKERS = [
  'ScholarshipTop does not award this scholarship',
  'Use this page as a starting point and validate eligibility',
  'Before you apply, confirm on the provider'
];

const OVERLAY_MARKERS: Record<Locale, string[]> = {
  es: [
    'ScholarshipTop no concede esta beca',
    'Verifique siempre los detalles',
    'página oficial del proveedor'
  ],
  fr: [
    "ScholarshipTop n'accorde pas cette bourse",
    'Vérifiez toujours les détails',
    'page officielle du financeur'
  ]
};

export type HtmlCheckResult = {
  path: string;
  status: number;
  ok: boolean;
  issues: string[];
  canonical: string | null;
  hreflangs: string[];
  robots: string | null;
  hasSwitcher: boolean;
  hasOverlay: boolean;
  hasEnHref: boolean;
};

export async function checkScholarshipDetailHtml(
  locale: Locale,
  path: string,
  opts?: { titleFragment?: string; amountFragment?: string; providerFragment?: string }
): Promise<HtmlCheckResult> {
  const issues: string[] = [];
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  const html = await res.text();

  if (res.status !== 200) {
    return {
      path,
      status: res.status,
      ok: false,
      issues: [`HTTP ${res.status}`],
      canonical: null,
      hreflangs: [],
      robots: null,
      hasSwitcher: false,
      hasOverlay: false,
      hasEnHref: false
    };
  }

  const canonical =
    (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ??
      html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i))?.[1] ??
    null;

  const hreflangs = [
    ...html.matchAll(/<link[^>]+rel=["']alternate["'][^>]+hreflang=["']([^"']+)["']/gi)
  ].map((m) => m[1]!.toLowerCase());

  const robots =
    (html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i))?.[1] ??
    null;

  const slugMatch = path.match(/\/scholarships\/([^/?#]+)/i);
  const slug = slugMatch?.[1] ?? '';
  const hasHreflangCluster =
    ['en', 'es', 'fr', 'x-default'].every((h) => hreflangs.includes(h)) &&
    Boolean(slug) &&
    html.includes(`/scholarships/${slug}`) &&
    html.includes(`/es/scholarships/${slug}`) &&
    html.includes(`/fr/scholarships/${slug}`);

  const hasSwitcher =
    html.includes('data-language-switcher="true"') ||
    html.includes('data-language-switcher-locale=') ||
    hasHreflangCluster;

  const hasOverlay = OVERLAY_MARKERS[locale].some((m) => html.includes(m));
  const hasEnHref = /href=["']\/en(?:\/|["'])/i.test(html);

  if (!canonical?.includes(path.replace(/\/$/, ''))) {
    issues.push('canonical mismatch or missing');
  }
  for (const h of ['en', 'es', 'fr', 'x-default']) {
    if (!hreflangs.includes(h)) issues.push(`missing hreflang ${h}`);
  }
  if (!robots?.includes('index')) issues.push(`robots not index: ${robots}`);
  if (!hasSwitcher) issues.push('language switcher / hreflang cluster missing');
  if (!hasOverlay) issues.push('localized overlay markers missing');
  if (hasEnHref) issues.push('/en link in HTML');
  if (EN_FALLBACK_MARKERS.some((m) => html.includes(m))) {
    issues.push('possible English body fallback');
  }
  if (opts?.titleFragment && !html.includes(opts.titleFragment)) {
    issues.push('official title fragment not found');
  }
  if (opts?.amountFragment && !html.includes(opts.amountFragment)) {
    issues.push('amount fragment not found');
  }
  if (opts?.providerFragment && !html.includes(opts.providerFragment)) {
    issues.push('provider fragment not found');
  }

  return {
    path,
    status: res.status,
    ok: issues.length === 0,
    issues,
    canonical,
    hreflangs,
    robots,
    hasSwitcher,
    hasOverlay,
    hasEnHref
  };
}

async function main() {
  const locale = (process.argv[2] ?? 'es') as Locale;
  const path = process.argv[3];
  if (!path || (locale !== 'es' && locale !== 'fr')) {
    console.error(
      'Usage: npx tsx scripts/seo/i18n-scholarship-detail-html-check.ts es|fr /es/scholarships/slug [titleFragment]'
    );
    process.exit(1);
  }
  const titleFragment = process.argv[4];
  const result = await checkScholarshipDetailHtml(locale, path, {
    titleFragment: titleFragment || undefined
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

const isDirectRun =
  typeof process.argv[1] === 'string' &&
  process.argv[1].replace(/\\/g, '/').endsWith('i18n-scholarship-detail-html-check.ts');

if (isDirectRun) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
