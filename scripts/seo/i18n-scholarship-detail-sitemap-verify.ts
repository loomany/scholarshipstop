/**
 * Verify scholarship detail-db sitemaps; optional expected total per locale.
 * Usage: npx tsx scripts/seo/i18n-scholarship-detail-sitemap-verify.ts 56
 */
const BASE = (process.env.SMOKE_BASE_URL ?? 'https://scholarshiptop.com').replace(/\/$/, '');
const expected = Number(process.argv[2] ?? '6');

async function main() {
  const index = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const es = await (await fetch(`${BASE}/sitemaps/locale-es-scholarships-detail-db.xml`)).text();
  const fr = await (await fetch(`${BASE}/sitemaps/locale-fr-scholarships-detail-db.xml`)).text();
  const esN = (es.match(/<loc>/g) ?? []).length;
  const frN = (fr.match(/<loc>/g) ?? []).length;
  console.log('index ES bucket:', index.includes('locale-es-scholarships-detail-db'));
  console.log('index FR bucket:', index.includes('locale-fr-scholarships-detail-db'));
  console.log('ES URLs:', esN, 'FR URLs:', frN, 'expected:', expected);
  const bad = [es, fr].some((x) => x.includes('/en/') || x.includes('review_required'));
  if (bad || esN < expected || frN < expected) process.exit(1);
  console.log('OK');
}

main();
