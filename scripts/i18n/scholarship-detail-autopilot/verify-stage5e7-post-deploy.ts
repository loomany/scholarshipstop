/**
 * Stage 5E-7 post-deploy production verification.
 */
import { BASE } from './env';

const WAVE79_SLUGS = [
  'fte-fellowships-for-doctoral-students-fte-fellowships-for-doctoral-stu',
  'national-coal-transportation-association-scholarship-ugrffrt7mhwx',
  'eth-zurich-branco-weiss-fellowships-at-university-of-melbourne-2026-eth-zurich-branco-weiss-fellowsh'
];

const UNSEEDED = 'how-to-apply-for-a-scholarship-step-by-step';

async function status(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  return res.status;
}

async function main() {
  const issues: string[] = [];
  const indexStatus = await status('/sitemap.xml');
  if (indexStatus !== 200) issues.push(`sitemap.xml ${indexStatus}`);

  const indexXml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const esXml = await (await fetch(`${BASE}/sitemaps/locale-es-scholarships-detail-db.xml`)).text();
  const frXml = await (await fetch(`${BASE}/sitemaps/locale-fr-scholarships-detail-db.xml`)).text();

  const esStatus = await status('/sitemaps/locale-es-scholarships-detail-db.xml');
  const frStatus = await status('/sitemaps/locale-fr-scholarships-detail-db.xml');
  if (esStatus !== 200) issues.push(`ES xml ${esStatus}`);
  if (frStatus !== 200) issues.push(`FR xml ${frStatus}`);

  const esCount = (esXml.match(/<loc>/g) ?? []).length;
  const frCount = (frXml.match(/<loc>/g) ?? []).length;
  if (esCount !== 616) issues.push(`ES count ${esCount} != 616`);
  if (frCount !== 616) issues.push(`FR count ${frCount} != 616`);

  if ([esXml, frXml, indexXml].some((x) => x.includes('/en/') || x.includes('review_required'))) {
    issues.push('forbidden sitemap strings');
  }

  for (const slug of WAVE79_SLUGS) {
    if (!esXml.includes(`/es/scholarships/${slug}`)) issues.push(`ES xml missing ${slug}`);
    if (!frXml.includes(`/fr/scholarships/${slug}`)) issues.push(`FR xml missing ${slug}`);
  }

  const routeChecks: Record<string, { en: number; es: number; fr: number }> = {};
  for (const slug of WAVE79_SLUGS) {
    routeChecks[slug] = {
      en: await status(`/scholarships/${slug}`),
      es: await status(`/es/scholarships/${slug}`),
      fr: await status(`/fr/scholarships/${slug}`)
    };
    const r = routeChecks[slug]!;
    if (r.en !== 200 || r.es !== 200 || r.fr !== 200) {
      issues.push(`routes ${slug} en=${r.en} es=${r.es} fr=${r.fr}`);
    }
  }

  const unseededEs = await status(`/es/scholarships/${UNSEEDED}`);
  const unseededFr = await status(`/fr/scholarships/${UNSEEDED}`);
  if (unseededEs !== 404 || unseededFr !== 404) {
    issues.push(`unseeded es=${unseededEs} fr=${unseededFr}`);
  }

  const passed = issues.length === 0;
  console.log(
    JSON.stringify(
      {
        passed,
        indexStatus,
        esStatus,
        frStatus,
        esCount,
        frCount,
        wave79InXml: WAVE79_SLUGS.map((s) => ({
          slug: s,
          es: esXml.includes(s),
          fr: frXml.includes(s)
        })),
        routeChecks,
        unseeded: { es: unseededEs, fr: unseededFr },
        issues
      },
      null,
      2
    )
  );
  process.exit(passed ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
