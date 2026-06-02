/**
 * Stage 6B.4 — revalidate + production smoke after hub UI deploy.
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/ai-resources-stage6b4-hub-deploy-smoke.ts
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { postSeoRevalidate } from '@/lib/seo/revalidateSeoPath';

const SITE = 'https://scholarshiptop.com';
const REPORT_PATH = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6b4-hub-polish-deploy-smoke-2026-05-21.md'
);

const LIVE_AI_SLUGS = [
  'best-scholarship-websites',
  'best-scholarship-search-engines-international-students',
  'scholarshiptop-vs-fastweb',
  'scholarshiptop-vs-scholarships-com',
  'best-free-scholarship-websites-without-spam',
  'best-scholarship-websites-for-graduate-students'
] as const;

async function fetchSmoke(url: string) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'ScholarshipTop-Stage6B4-Smoke/1.0' },
    redirect: 'follow'
  });
  const html = await res.text();
  return {
    status: res.status,
    noTable: !/<table\b/i.test(html),
    noTypeQ: !html.includes('???'),
    noKeyPoint: !/key point\s*\d/i.test(html),
    no35: !/in 3[–-]5 bullets/i.test(html),
    noRawPaths: !/(?<![(\[])\/(?:scholarships|resources)\/[a-z0-9-]+(?![)\]])/i.test(
      html.replace(/<[^>]+>/g, ' ')
    ),
    noIqCta: !html.includes('resource-article-iq-cta'),
    hasAiArticles:
      html.includes('best-scholarship-search-engines') ||
      html.includes('scholarshiptop-vs-fastweb') ||
      html.includes('can-chatgpt') === false,
    internalLinks: (html.match(/href=["']\/(?:scholarships|resources)/gi) ?? []).length
  };
}

async function main() {
  const paths = [
    '/resources',
    ...LIVE_AI_SLUGS.map((s) => `/resources/${s}`)
  ];
  const revalidateResults: { path: string; ok: boolean }[] = [];
  for (const p of paths) {
    const pathOnly = p.split('?')[0];
    const ok = await postSeoRevalidate({
      path: pathOnly,
      tag:
        pathOnly.startsWith('/resources/') && pathOnly !== '/resources'
          ? 'published-content-post-by-slug-v2'
          : undefined
    });
    revalidateResults.push({ path: p, ok });
    console.log(`${ok ? 'OK' : 'FAIL'} revalidate ${p}`);
  }

  await new Promise((r) => setTimeout(r, 5000));

  const hub = await fetchSmoke(`${SITE}/resources?cat=ai`);
  const hubRes = await fetch(`${SITE}/resources?cat=ai`, {
    headers: { 'user-agent': 'ScholarshipTop-Stage6B4-Smoke/1.0' }
  });
  const hubHtml = await hubRes.text();

  const articleSmokes: Record<string, Awaited<ReturnType<typeof fetchSmoke>>> = {};
  for (const slug of LIVE_AI_SLUGS) {
    articleSmokes[`/resources/${slug}`] = await fetchSmoke(
      `${SITE}/resources/${slug}`
    );
  }

  let report = `# AI Resources Stage 6B.4 — hub polish deploy smoke\n\n`;
  report += `**Date:** 2026-05-21  \n`;
  report += `**Deploy commit:** \`1737b7b\` — \`fix(resources): polish AI resources hub and live articles\`  \n`;
  report += `**Scope:** UI hub fix only (no OpenAI, no new publishes)\n\n`;

  report += `## Hub \`/resources?cat=ai\`\n\n`;
  report += `| Check | Result |\n|-------|--------|\n`;
  report += `| HTTP | ${hub.status} |\n`;
  report += `| No \`Type ???\` | ${hub.noTypeQ} |\n`;
  report += `| No IQ CTA block | ${hub.noIqCta} |\n`;
  report += `| Shows live AI articles (search engines slug) | ${hubHtml.includes('best-scholarship-search-engines')} |\n`;
  report += `| Shows Fastweb comparison | ${hubHtml.includes('scholarshiptop-vs-fastweb')} |\n`;

  report += `\n## ISR revalidate\n\n`;
  for (const r of revalidateResults) {
    report += `- \`${r.path}\`: ${r.ok ? 'OK' : 'FAIL'}\n`;
  }

  report += `\n## Live AI article smoke (6 URLs)\n\n`;
  report += `| URL | HTTP | no table | no ??? | no Key Point | no 3–5 bullets | no raw paths | no IQ CTA |\n`;
  report += `|-----|------|----------|--------|--------------|----------------|--------------|----------|\n`;
  for (const [p, s] of Object.entries(articleSmokes)) {
    report += `| ${p} | ${s.status} | ${s.noTable} | ${s.noTypeQ} | ${s.noKeyPoint} | ${s.no35} | ${s.noRawPaths} | ${s.noIqCta} |\n`;
  }

  report += `\n## Verdict\n\n`;
  const hubOk =
    hub.status === 200 && hub.noTypeQ && hub.noIqCta && hubHtml.includes('best-scholarship-search-engines');
  const articlesOk = Object.values(articleSmokes).every(
    (s) =>
      s.status === 200 &&
      s.noTable &&
      s.noTypeQ &&
      s.noKeyPoint &&
      s.no35 &&
      s.noRawPaths &&
      s.noIqCta
  );
  report += hubOk && articlesOk
    ? '**PASS** — hub UI fix live; six AI articles healthy.\n'
    : '**NEEDS REVIEW** — see failing rows above.\n';

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, report, 'utf8');
  console.log(JSON.stringify({ phase: 'report', path: REPORT_PATH, hubOk, articlesOk }, null, 2));

  if (!hubOk || !articlesOk) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
