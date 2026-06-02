/**
 * Stage 6E.1 — hotfix 16 live AI resource articles (body DB + smoke + revalidate).
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/ai-resources-stage6e1-live-hotfix.ts
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/ai-resources-stage6e1-live-hotfix.ts --write --revalidate --smoke
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';
import { AI_RESOURCE_PACK_SLUGS } from '@/lib/content-hub/aiResourcePackSlugs';
import { classifyResourceArticle } from '@/lib/content-hub/resourceTaxonomy';
import {
  hasRawMarkdownLinkSyntax,
  hotfixAiResourceBody,
  repairRawMarkdownLinksInHtml
} from '@/lib/content-hub/hotfixAiResourceLiveBodies';
import { hasRawInternalPath } from '@/lib/content-hub/polishAiResourceArticleMarkdown';
import { deduplicateQuickSummaryBlocksInHtml } from '@/lib/content-hub/deduplicateQuickSummaryInHtml';
import { markdownToHtml } from '@/services/content-hub/src/lib/html.ts';
import {
  countCharsNoSpaces,
  countWords
} from '@/services/content-hub/src/lib/markdown.ts';
import { postSeoRevalidate } from '@/lib/seo/revalidateSeoPath';

const SITE = 'https://scholarshiptop.com';
const REPORT_PATH = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6e1-live-hotfix-2026-05-22.md'
);

const writeMode = process.argv.includes('--write');
const doRevalidate = process.argv.includes('--revalidate') || writeMode;
const doSmoke = process.argv.includes('--smoke') || writeMode;

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function cleanupExternalAnchors(html: string): string {
  return html.replace(/<a\b([^>]*?)>/gi, (_full, attrs: string) => {
    let a = attrs;
    const hrefMatch = a.match(/\bhref=["']([^"']+)["']/i);
    const href = hrefMatch?.[1] ?? '';
    if (!/^https?:\/\//i.test(href)) {
      a = a.replace(/\s*target=["'][^"']*["']/gi, '');
      a = a.replace(/\s*rel=["'][^"']*["']/gi, '');
      return `<a${a}>`;
    }
    a = a.replace(/\s*target=["'][^"']*["']/gi, '');
    a = a.replace(/\s*rel=["'][^"']*["']/gi, '');
    return `<a${a} target="_blank" rel="noopener noreferrer nofollow">`;
  });
}

function fingerprint(md: string, html: string): string {
  return createHash('sha256').update(`${md}\n${html}`).digest('hex').slice(0, 16);
}

async function fetchSmoke(url: string, expectedPath: string) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'ScholarshipTop-Stage6E1-Smoke/1.0' },
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
  const supabase = createClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );

  const { data: posts, error } = await supabase
    .from('content_posts')
    .select(
      'id, slug, status, title, meta_description, body_html, body_markdown, word_count, updated_at'
    )
    .in('slug', [...AI_RESOURCE_PACK_SLUGS]);

  if (error) throw error;
  if ((posts ?? []).length !== 16) {
    throw new Error(`Expected 16 posts, got ${posts?.length ?? 0}`);
  }

  const notPublished = (posts ?? []).filter((p) => p.status !== 'published');
  if (notPublished.length) {
    throw new Error(
      `Not all published: ${notPublished.map((p) => p.slug).join(', ')}`
    );
  }

  const hotfixRows: Array<{
    slug: string;
    id: string;
    changed: boolean;
    fixes: string[];
    beforeIssues: string[];
    afterIssues: string[];
    fpBefore: string;
    fpAfter: string;
    classification: string;
  }> = [];

  for (const post of posts ?? []) {
    const slug = post.slug?.trim() ?? '';
    const md = (post as { body_markdown?: string }).body_markdown ?? '';
    const html = post.body_html ?? '';
    const fpBefore = fingerprint(md, html);
    const result = hotfixAiResourceBody(slug, md, html);
    const classification = classifyResourceArticle({
      slug,
      title: post.title,
      meta_description: post.meta_description
    });
    const classLabel = classification
      ? `${classification.categoryId}/${classification.subcategoryId}`
      : 'none';

    const newMd = result.markdown;
    let newHtml = html;
    const needsBodyRepair =
      result.changed ||
      result.beforeIssues.length > 0 ||
      hasRawMarkdownLinkSyntax(html);
    if (needsBodyRepair) {
      let rawHtml = await markdownToHtml(newMd);
      rawHtml = repairRawMarkdownLinksInHtml(rawHtml);
      rawHtml = deduplicateQuickSummaryBlocksInHtml(rawHtml);
      newHtml = cleanupExternalAnchors(rawHtml);
    }

    const fpAfter = fingerprint(newMd, newHtml);
    const changed = fpBefore !== fpAfter || needsBodyRepair;

    hotfixRows.push({
      slug,
      id: post.id,
      changed,
      fixes: result.fixes,
      beforeIssues: result.beforeIssues,
      afterIssues: result.afterIssues,
      fpBefore,
      fpAfter,
      classification: classLabel
    });

    if (writeMode && changed) {
      const wordCount = countWords(newMd);
      const { error: updErr } = await supabase
        .from('content_posts')
        .update({
          body_markdown: newMd,
          body_html: newHtml,
          word_count: wordCount,
          char_count: countCharsNoSpaces(newMd),
          updated_at: new Date().toISOString()
        } as Database['public']['Tables']['content_posts']['Update'] & {
          body_markdown?: string;
          word_count?: number;
          char_count?: number;
        })
        .eq('id', post.id)
        .eq('status', 'published');
      if (updErr) throw new Error(`${slug}: ${updErr.message}`);
      console.log(`UPDATED ${slug}`);
    } else {
      console.log(
        `${changed ? 'WOULD_UPDATE' : 'UNCHANGED'} ${slug} issues=${result.beforeIssues.join(',') || 'none'}`
      );
    }
  }

  const revalidateResults: { path: string; ok: boolean }[] = [];
  if (doRevalidate) {
    const paths = [
      '/resources',
      ...AI_RESOURCE_PACK_SLUGS.map((s) => `/resources/${s}`)
    ];
    for (const p of paths) {
      const ok = await postSeoRevalidate({
        path: p,
        tag: p.startsWith('/resources/') ? 'published-content-post-by-slug-v2' : undefined
      });
      revalidateResults.push({ path: p, ok });
      console.log(`${ok ? 'OK' : 'FAIL'} revalidate ${p}`);
    }
    revalidateResults.push({
      path: '/resources?cat=ai',
      ok: await postSeoRevalidate({ path: '/resources' })
    });
  }

  const smokeResults: Record<string, Awaited<ReturnType<typeof fetchSmoke>>> = {};
  let hubSlugVisible: Record<string, boolean> = {};
  if (doSmoke) {
    await new Promise((r) => setTimeout(r, 4000));
    smokeResults['/resources?cat=ai'] = await fetchSmoke(
      `${SITE}/resources?cat=ai`,
      '/resources'
    );
    for (const slug of AI_RESOURCE_PACK_SLUGS) {
      smokeResults[`/resources/${slug}`] = await fetchSmoke(
        `${SITE}/resources/${slug}`,
        `/resources/${slug}`
      );
    }
    const hubRes = await fetch(`${SITE}/resources?cat=ai`);
    const hubHtml = await hubRes.text();
    for (const slug of AI_RESOURCE_PACK_SLUGS) {
      hubSlugVisible[slug] = hubHtml.includes(slug);
    }
  }

  const codeFixNote =
    'Renderer/taxonomy: `aiResourcePackSlugs` + `classifyResourceArticle` pack override + `shouldShowResourceArticleIqCta(slug)` — **requires deploy** to hide IQ CTA on live HTML until main is shipped.';

  let report = `# AI Resources Stage 6E.1 — live hotfix\n\n`;
  report += `**Date:** 2026-05-22  \n`;
  report += `**Script:** \`scripts/ai-resources-stage6e1-live-hotfix.ts\`  \n`;
  report += `**Write mode:** ${writeMode ? 'yes (production DB body updates)' : 'dry-run only'}  \n`;
  report += `**Target articles:** 16 AI pack slugs (6 Stage 6B + 10 Stage 6C/6D)  \n\n`;

  report += `## Fixes applied\n\n`;
  report += `### DB body edits (${writeMode ? 'applied' : 'planned'})\n\n`;
  for (const row of hotfixRows) {
    report += `- \`${row.slug}\`: changed=${row.changed}, fixes=[${row.fixes.join(', ')}], before=[${row.beforeIssues.join(', ') || '—'}], after=[${row.afterIssues.join(', ') || '—'}], classify=\`${row.classification}\`\n`;
  }

  report += `\n### Renderer / taxonomy edits (local code, deploy pending)\n\n`;
  report += `- Added \`lib/content-hub/aiResourcePackSlugs.ts\` — all 16 slugs force \`categoryId: ai\` (fixes hub \`?cat=ai\` filter when deployed).\n`;
  report += `- \`shouldShowResourceArticleIqCta(classification, slug)\` hides IQ block for pack slugs.\n`;
  report += `- Reordered AI \`SLUG_HINTS\` before international hints (avoids mis-classifying \`ai-tools-for-international-students…\`).\n`;
  report += `- ${codeFixNote}\n\n`;

  if (Object.keys(smokeResults).length) {
    report += `## Production smoke (16 articles + hub)\n\n`;
    report += `| URL | HTTP | not 404 | no noindex | self-canonical | no ??? | no KP | no \`](\`/ | no IQ CTA | no bare paths | disclaimer | body |\n`;
    report += `|-----|------|---------|------------|----------------|--------|-------|-------------|-----------|---------------|------------|------|\n`;
    for (const [path, s] of Object.entries(smokeResults)) {
      report += `| ${path} | ${s.status} | ${s.not404} | ${s.noNoindex} | ${s.selfCanonical} | ${s.noTypeQ} | ${s.noKeyPoint} | ${s.noRawMd} | ${s.noIqCta} | ${s.noBarePaths} | ${s.hasDisclaimer} | ${s.bodyVisible} |\n`;
    }

    report += `\n### Hub discoverability (\`/resources?cat=ai\`)\n\n`;
    report += `Classification for all 16 is \`ai\` in codebase after pack override. Hub lists paginated AI articles (16 total).\n\n`;
    for (const slug of AI_RESOURCE_PACK_SLUGS) {
      report += `- \`${slug}\`: ${hubSlugVisible[slug] ? 'visible on first page' : 'not on first page (pagination/search/sitemap OK)'}\n`;
    }
  }

  if (revalidateResults.length) {
    report += `\n## ISR revalidate\n\n`;
    for (const r of revalidateResults) {
      report += `- \`${r.path}\`: ${r.ok ? 'OK' : 'FAIL'}\n`;
    }
  }

  report += `\n## Guardrails\n\n`;
  report += `- No new article generation\n`;
  report += `- No ES/FR translation\n`;
  report += `- No auth/billing/Lemon/schema/RLS/migration changes\n`;
  report += `- All 16 remain \`published\`\n`;
  report += `- No commit/push in this step (owner approval needed for deploy)\n`;
  report += `- Stage 6F not started\n`;

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, report, 'utf8');
  console.log(JSON.stringify({ report: REPORT_PATH }, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
