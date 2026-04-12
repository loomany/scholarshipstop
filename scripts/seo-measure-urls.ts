/**
 * Prints URLs to paste into Search Console URL inspection, PageSpeed Insights,
 * or Chrome DevTools Performance (field-like: use production + throttling).
 *
 * Usage: npx tsx scripts/seo-measure-urls.ts
 * Optional: BASE_URL=https://scholarshiptop.com npx tsx scripts/seo-measure-urls.ts
 */
const base = (
  process.env.BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'http://localhost:3000'
).replace(/\/+$/, '');

const paths = [
  '/',
  '/scholarships',
  '/scholarships/for-women',
  '/scholarships/category/engineering',
  '/resources',
  '/faq'
] as const;

console.log('ScholarshipTop — URLs for SEO / speed checks\n');
console.log('Search Console: Performance → Pages / Queries (group by URL prefix).');
console.log(
  'PageSpeed: https://pagespeed.web.dev/ — paste each URL (mobile + desktop).\n'
);
for (const p of paths) {
  console.log(`${base}${p}`);
}
console.log(
  '\n+ Add 2–3 live scholarship detail URLs from your catalog (GSC → top pages).'
);
console.log(
  'Content priority: in GSC open Pages → sort by Clicks; improve titles/snippets for positions 5–15 first.'
);
