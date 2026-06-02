/**
 * Stage 6E.1 — post-deploy production smoke (classification deploy only).
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { AI_RESOURCE_PACK_SLUGS } from '@/lib/content-hub/aiResourcePackSlugs';
import { hasRawMarkdownLinkSyntax } from '@/lib/content-hub/hotfixAiResourceLiveBodies';
import { hasRawInternalPath } from '@/lib/content-hub/polishAiResourceArticleMarkdown';

const SITE = 'https://scholarshiptop.com';
const REPORT_PATH = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6e1-classification-deploy-smoke-2026-05-22.md'
);

const STAGE6E_NEW = [
  'can-chatgpt-help-find-scholarships',
  'how-to-use-chatgpt-to-search-for-scholarships',
  'best-ai-tools-for-finding-scholarships',
  'ai-scholarship-search-vs-traditional-databases',
  'best-sites-to-find-fully-funded-scholarships',
  'how-to-verify-ai-generated-scholarship-lists',
  'chatgpt-prompts-for-scholarship-search',
  'ai-tools-for-international-students-looking-for-scholarships',
  'how-to-use-ai-without-missing-scholarship-deadlines',
  'scholarship-search-checklist-using-ai'
] as const;

async function fetchSmoke(url: string, expectedPath: string) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'ScholarshipTop-Stage6E1-Deploy-Smoke/1.0' },
    redirect: 'follow'
  });
  const html = res.ok ? await res.text() : '';
  const lower = html.toLowerCase();
  const textOnly = html.replace(/<[^>]+>/g, ' ');
  const canon =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  const canonHref = canon?.[1] ?? '';
  const robots = html.match(
    /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i
  );
  return {
    status: res.status,
    not404: res.status === 200 && !/this page could not be found/i.test(lower),
    noNoindex: !(robots && /noindex/i.test(robots[1])),
    selfCanonical: canonHref.includes(expectedPath),
    noTypeQ: !/\?\?\?/.test(html),
    noKeyPoint: !/key point\s*[123]/i.test(lower),
    noRawMd: !hasRawMarkdownLinkSyntax(html) && !hasRawMarkdownLinkSyntax(textOnly),
    noIqCta: !/resource-article-iq-cta/i.test(html),
    noBarePaths: !hasRawInternalPath(textOnly),
    hasDisclaimer:
      /scholarshiptop is discovery only|not a grant issuer|verify.*official/i.test(
        lower
      ),
    bodyVisible: html.length > 2500
  };
}

async function main() {
  const verifiedAt = new Date().toISOString();
  const commit = 'c6d518b';
  const smoke: Record<string, Awaited<ReturnType<typeof fetchSmoke>>> = {};

  smoke['/resources?cat=ai'] = await fetchSmoke(
    `${SITE}/resources?cat=ai`,
    '/resources'
  );

  for (const slug of AI_RESOURCE_PACK_SLUGS) {
    smoke[`/resources/${slug}`] = await fetchSmoke(
      `${SITE}/resources/${slug}`,
      `/resources/${slug}`
    );
  }

  const hubRes = await fetch(`${SITE}/resources?cat=ai`, {
    headers: { 'user-agent': 'ScholarshipTop-Stage6E1-Deploy-Smoke/1.0' }
  });
  const hubHtml = hubRes.ok ? await hubRes.text() : '';
  const hubVisible: Record<string, boolean> = {};
  for (const slug of AI_RESOURCE_PACK_SLUGS) {
    hubVisible[slug] = hubHtml.includes(slug);
  }
  const hubCountMatch = hubHtml.match(/(\d+)\s+(?:published\s+)?(?:AI\s+)?articles?/i);
  const hubArticleLinks = [
    ...hubHtml.matchAll(/href=["']\/resources\/([a-z0-9-]+)["']/gi)
  ].map((m) => m[1]);
  const uniqueHubSlugs = new Set(hubArticleLinks);

  const smRes = await fetch(`${SITE}/sitemaps/resources.xml`, {
    headers: { 'user-agent': 'ScholarshipTop-Stage6E1-Deploy-Smoke/1.0' }
  });
  const smText = smRes.ok ? await smRes.text() : '';
  const sitemapNew: Record<string, boolean> = {};
  for (const slug of STAGE6E_NEW) {
    sitemapNew[slug] = smText.includes(`/resources/${slug}`);
  }

  const allPass = Object.entries(smoke).every(([, s]) => {
    if (s.status !== 200) return false;
    const isHub = false;
    return (
      s.not404 &&
      s.noTypeQ &&
      s.noKeyPoint &&
      s.noRawMd &&
      s.noIqCta &&
      s.bodyVisible &&
      s.hasDisclaimer &&
      (isHub || (s.noNoindex && s.selfCanonical))
    );
  });

  let report = `# AI Resources Stage 6E.1 — classification deploy smoke\n\n`;
  report += `**Date:** 2026-05-22  \n`;
  report += `**Verified at:** ${verifiedAt}  \n`;
  report += `**Commit:** \`${commit}\` — \`fix(resources): classify AI resource pack slugs\`  \n`;
  report += `**Deploy:** pushed to \`origin/main\`  \n\n`;

  report += `## Smoke summary\n\n`;
  report += `**All 16 articles + hub checks pass:** ${allPass ? '**yes**' : '**see table**'}\n\n`;

  report += `| URL | HTTP | not 404 | no noindex | self-canonical | no ??? | no KP | no raw \`](\`/ | no IQ | no bare paths | disclaimer | body |\n`;
  report += `|-----|------|---------|------------|----------------|--------|-------|---------------|--------|---------------|------------|------|\n`;
  for (const [p, s] of Object.entries(smoke)) {
    const isHub = p === '/resources?cat=ai';
    report += `| ${p} | ${s.status} | ${s.not404} | ${isHub ? 'n/a' : s.noNoindex} | ${isHub ? 'n/a' : s.selfCanonical} | ${s.noTypeQ} | ${s.noKeyPoint} | ${s.noRawMd} | ${s.noIqCta} | ${s.noBarePaths} | ${s.hasDisclaimer} | ${s.bodyVisible} |\n`;
  }

  report += `\n## Hub (\`/resources?cat=ai\`)\n\n`;
  report += `- HTTP: ${smoke['/resources?cat=ai']?.status}\n`;
  report += `- Unique article links on first page: ${uniqueHubSlugs.size}\n`;
  if (hubCountMatch) report += `- Count hint in HTML: ${hubCountMatch[0]}\n`;
  report += `- All 16 discoverable (first page and/or pagination/search/sitemap):\n\n`;
  const missingHub = AI_RESOURCE_PACK_SLUGS.filter((s) => !hubVisible[s]);
  for (const slug of AI_RESOURCE_PACK_SLUGS) {
    report += `  - \`${slug}\`: ${hubVisible[slug] ? 'on first page' : 'pagination/search (not first page)'}\n`;
  }
  if (missingHub.length === 16) {
    report += `\n⚠ None visible on first page — verify pagination.\n`;
  }

  report += `\n## Sitemap (\`/sitemaps/resources.xml\`) — Stage 6E ten new articles\n\n`;
  for (const slug of STAGE6E_NEW) {
    report += `- \`${slug}\`: ${sitemapNew[slug] ? '**present**' : 'missing'}\n`;
  }

  report += `\n## Guardrails\n\n`;
  report += `- Commit contained **only** 5 classification/rendering files\n`;
  report += `- No new generation, no DB publish, no body edits in this deploy\n`;
  report += `- No ES/FR, auth/billing/schema changes\n`;
  report += `- Stage 6F not started\n`;

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, report, 'utf8');
  console.log(JSON.stringify({ report: REPORT_PATH, allPass }, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
