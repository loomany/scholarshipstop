/**
 * Post-deploy smoke: scholarship detail sitemaps + reciprocal hreflang.
 * Usage: npx tsx scripts/seo/seo-p0-p1-scholarship-detail-smoke.ts
 */
const BASE = (process.env.SMOKE_BASE_URL ?? 'https://scholarshiptop.com').replace(
  /\/$/,
  ''
);

const SAMPLE_SLUG = 'climate-stripes-scholarship-14487';
const FAKE_SLUG = 'definitely-unpublished-slug-zzzz-no-translation-99999';

function countLocs(xml: string): number {
  return (xml.match(/<loc>/g) ?? []).length;
}

function extractHreflang(html: string): string[] {
  const out: string[] = [];
  const re =
    /<link[^>]+rel=["']alternate["'][^>]+hreflang=["']([^"']+)["'][^>]+href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push(`${m[1]}=${m[2]}`);
  }
  return out;
}

function extractMeta(html: string, name: string): string | null {
  const m = html.match(
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)`, 'i')
  );
  return m?.[1] ?? null;
}

function extractCanonical(html: string): string | null {
  const m = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)"/i
  );
  return m?.[1] ?? null;
}

async function fetchText(path: string): Promise<{ status: number; text: string }> {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, text: await res.text() };
}

async function main() {
  const failures: string[] = [];

  const indexRes = await fetchText('/sitemap.xml');
  if (indexRes.status !== 200) failures.push(`sitemap.xml status ${indexRes.status}`);

  const childPaths = [
    ...(indexRes.text.match(/<loc>([^<]+)<\/loc>/g) ?? []).map((x) =>
      x.replace('<loc>', '').replace('</loc>', '').replace(BASE, '')
    )
  ];

  for (const path of childPaths) {
    const { status } = await fetchText(path);
    if (status !== 200) failures.push(`child sitemap ${path} status ${status}`);
  }

  const esDetailPath = '/sitemaps/locale-es-scholarships-detail-db.xml';
  const frDetailPath = '/sitemaps/locale-fr-scholarships-detail-db.xml';
  if (!indexRes.text.includes('locale-es-scholarships-detail-db')) {
    failures.push('index missing locale-es-scholarships-detail-db');
  }
  if (!indexRes.text.includes('locale-fr-scholarships-detail-db')) {
    failures.push('index missing locale-fr-scholarships-detail-db');
  }

  const esDetail = await fetchText(esDetailPath);
  const frDetail = await fetchText(frDetailPath);
  if (esDetail.status !== 200) {
    failures.push(`ES detail sitemap status ${esDetail.status}`);
  }
  if (frDetail.status !== 200) {
    failures.push(`FR detail sitemap status ${frDetail.status}`);
  }

  const esN = countLocs(esDetail.text);
  const frN = countLocs(frDetail.text);
  if (esN === 0 || frN === 0) {
    failures.push(`detail sitemap empty ES=${esN} FR=${frN}`);
  }
  if (esN !== frN) {
    failures.push(`ES/FR detail count mismatch ES=${esN} FR=${frN}`);
  }
  if ([esDetail.text, frDetail.text].some((x) => x.includes('/en/'))) {
    failures.push('detail sitemap contains /en/');
  }

  const enUrl = `/scholarships/${SAMPLE_SLUG}`;
  const esUrl = `/es/scholarships/${SAMPLE_SLUG}`;
  const frUrl = `/fr/scholarships/${SAMPLE_SLUG}`;

  const enHtml = (await fetchText(enUrl)).text;
  const esHtml = (await fetchText(esUrl)).text;
  const frHtml = (await fetchText(frUrl)).text;

  const enHref = extractHreflang(enHtml);
  const esHref = extractHreflang(esHtml);
  if (!enHref.some((h) => h.startsWith('es='))) {
    failures.push('EN detail missing es hreflang');
  }
  if (!enHref.some((h) => h.startsWith('fr='))) {
    failures.push('EN detail missing fr hreflang');
  }
  if (!enHref.some((h) => h.startsWith('en='))) {
    failures.push('EN detail missing en hreflang');
  }
  if (!esHref.some((h) => h.startsWith('en='))) {
    failures.push('ES detail missing en hreflang');
  }

  const enWithQuery = await fetchText(
    `${enUrl}?return_to=${encodeURIComponent('/scholarships')}`
  );
  const canonQ = extractCanonical(enWithQuery.text);
  const robotsQ = extractMeta(enWithQuery.text, 'robots');
  if (canonQ !== `${BASE}${enUrl}`) {
    failures.push(`return_to canonical wrong: ${canonQ}`);
  }
  if (!robotsQ?.includes('noindex')) {
    failures.push(`return_to should be noindex, got ${robotsQ}`);
  }

  const fakeEs = await fetchText(`/es/scholarships/${FAKE_SLUG}`);
  if (fakeEs.status !== 404) {
    failures.push(`untranslated ES slug status ${fakeEs.status} expected 404`);
  }

  const enFakeHref = extractHreflang(
    (await fetchText(`/scholarships/${FAKE_SLUG}`)).text
  );
  if (enFakeHref.some((h) => h.startsWith('es=') || h.startsWith('fr='))) {
    failures.push('unseeded EN scholarship should not hreflang to es/fr');
  }

  const enRoot = await fetchText('/en');
  if (enRoot.status !== 404) failures.push(`/en status ${enRoot.status}`);

  console.log(
    JSON.stringify(
      {
        base: BASE,
        childSitemaps: childPaths.length,
        esDetailUrls: esN,
        frDetailUrls: frN,
        enHreflang: enHref,
        failures
      },
      null,
      2
    )
  );

  if (failures.length) {
    console.error('FAIL', failures);
    process.exit(1);
  }
  console.log('OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
