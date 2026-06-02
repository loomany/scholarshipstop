/**
 * Stage 6C.1 — polish five review_needed AI resource drafts (no publish).
 *
 *   npx dotenv-cli -e services/content-hub/.env -- npx tsx scripts/ai-resources-stage6c1-polish-review-five.ts
 *   npx dotenv-cli -e services/content-hub/.env -- npx tsx scripts/ai-resources-stage6c1-polish-review-five.ts --write
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';
import { deduplicateQuickSummaryBlocksInHtml } from '@/lib/content-hub/deduplicateQuickSummaryInHtml';
import {
  AI_RESOURCE_LIVE_PUBLISHED_SLUGS,
  AI_RESOURCE_STAGE6C_REVIEW_SLUGS,
  analyzeStage6cDraft,
  polishAiResourceStage6cDraftMarkdown,
  type AiResourceStage6cReviewSlug
} from '@/lib/content-hub/polishAiResourceStage6cDrafts';
import { markdownToHtml } from '@/services/content-hub/src/lib/html.ts';
import {
  countCharsNoSpaces,
  countWords
} from '@/services/content-hub/src/lib/markdown.ts';

const PREVIEW_OUT_DIR = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6c1-polished-previews-2026-05-21'
);
const POLISHED_DATA_DIR = path.join(process.cwd(), 'data/content/polished');
const REPORT_PATH = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6c1-five-review-draft-polish-2026-05-21.md'
);

const writeMode = process.argv.includes('--write');

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
    const isExternal = /^https?:\/\//i.test(href);
    if (!isExternal) {
      a = a.replace(/\s*target=["'][^"']*["']/gi, '');
      a = a.replace(/\s*rel=["'][^"']*["']/gi, '');
      return `<a${a}>`;
    }
    a = a.replace(/\s*target=["'][^"']*["']/gi, '');
    a = a.replace(/\s*rel=["'][^"']*["']/gi, '');
    return `<a${a} target="_blank" rel="noopener noreferrer nofollow">`;
  });
}

function countRelativeInternalLinks(md: string, html: string): number {
  const blob = `${md}\n${html}`;
  return [
    ...blob.matchAll(/\[([^\]]+)\]\(\/(?:scholarships|resources)[^)]+\)/gi),
    ...blob.matchAll(/href=["'](\/(?:scholarships|resources)[^"']*)["']/gi)
  ].length;
}

async function main() {
  const supabase = createClient<Database>(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );

  const allSlugs = [
    ...AI_RESOURCE_STAGE6C_REVIEW_SLUGS,
    ...AI_RESOURCE_LIVE_PUBLISHED_SLUGS
  ];

  const { data: posts, error } = await supabase
    .from('content_posts')
    .select('id, slug, status, title, body_markdown, body_html, word_count, updated_at')
    .in('slug', allSlugs);
  if (error) throw new Error(error.message);

  const liveBefore = AI_RESOURCE_LIVE_PUBLISHED_SLUGS.map((slug) => {
    const p = posts?.find((x) => x.slug === slug);
    return {
      slug,
      id: p?.id,
      status: p?.status,
      word_count: p?.word_count,
      updated_at: p?.updated_at,
      body_len: (p?.body_markdown ?? '').length
    };
  });

  const rows: {
    slug: string;
    id: string;
    status: string;
    wordsBefore: number;
    wordsAfter: number;
    internalBefore: number;
    internalAfter: number;
    qaBefore: ReturnType<typeof analyzeStage6cDraft>;
    qaAfter: ReturnType<typeof analyzeStage6cDraft>;
  }[] = [];

  for (const slug of AI_RESOURCE_STAGE6C_REVIEW_SLUGS) {
    const post = posts?.find((p) => p.slug === slug);
    if (!post) throw new Error(`Missing draft: ${slug}`);
    if (post.status !== 'review_needed') {
      throw new Error(`${slug} status=${post.status}, expected review_needed`);
    }

    const mdBefore = post.body_markdown ?? '';
    const htmlBefore = post.body_html ?? '';
    const polishedMd = polishAiResourceStage6cDraftMarkdown(
      slug as AiResourceStage6cReviewSlug,
      mdBefore
    );
    let html = cleanupExternalAnchors(await markdownToHtml(polishedMd));
    html = deduplicateQuickSummaryBlocksInHtml(html);

    const qaBefore = analyzeStage6cDraft(mdBefore, htmlBefore);
    const qaAfter = analyzeStage6cDraft(polishedMd, html);

    rows.push({
      slug,
      id: post.id,
      status: post.status,
      wordsBefore: post.word_count ?? countWords(mdBefore),
      wordsAfter: countWords(polishedMd),
      internalBefore: countRelativeInternalLinks(mdBefore, htmlBefore),
      internalAfter: countRelativeInternalLinks(polishedMd, html),
      qaBefore,
      qaAfter
    });

    await fs.mkdir(POLISHED_DATA_DIR, { recursive: true });
    await fs.mkdir(PREVIEW_OUT_DIR, { recursive: true });
    await fs.writeFile(
      path.join(POLISHED_DATA_DIR, `${slug}-stage6c1-2026-05-21.md`),
      polishedMd,
      'utf8'
    );
    const preview = `# ${post.title}\n\n**slug:** ${slug}  \n**status:** review_needed (unchanged)  \n**post_id:** ${post.id}\n\n---\n\n${polishedMd}`;
    await fs.writeFile(path.join(PREVIEW_OUT_DIR, `${slug}.md`), preview, 'utf8');

    console.log(
      JSON.stringify(
        {
          phase: 'polish',
          slug,
          id: post.id,
          write: writeMode,
          qaAfter
        },
        null,
        2
      )
    );

    if (writeMode) {
      const { error: upErr } = await supabase
        .from('content_posts')
        .update({
          body_markdown: polishedMd,
          body_html: html,
          word_count: countWords(polishedMd),
          char_count: countCharsNoSpaces(polishedMd),
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id)
        .eq('slug', slug)
        .eq('status', 'review_needed');
      if (upErr) throw new Error(upErr.message);
    }
  }

  const { data: postsAfter } = await supabase
    .from('content_posts')
    .select('id, slug, status, word_count, updated_at, body_markdown')
    .in('slug', allSlugs);

  const liveAfter = AI_RESOURCE_LIVE_PUBLISHED_SLUGS.map((slug) => {
    const p = postsAfter?.find((x) => x.slug === slug);
    const before = liveBefore.find((b) => b.slug === slug);
    return {
      slug,
      status: p?.status,
      unchanged:
        p?.status === before?.status &&
        p?.status === 'published' &&
        (p?.body_markdown ?? '').length === (before?.body_len ?? -1)
    };
  });

  const reviewAfter = AI_RESOURCE_STAGE6C_REVIEW_SLUGS.map((slug) => {
    const p = postsAfter?.find((x) => x.slug === slug);
    return { slug, status: p?.status, id: p?.id };
  });

  let report = `# AI Resources Stage 6C.1 — review_needed draft polish\n\n`;
  report += `**Date:** 2026-05-21  \n`;
  report += `**DB writes:** ${writeMode ? 'yes (5 review_needed posts, status unchanged)' : 'dry-run only'}  \n`;
  report += `**Publish:** none  \n`;
  report += `**Commit/push:** not performed\n\n`;

  report += `## Changed files\n\n`;
  report += `- \`lib/content-hub/polishAiResourceStage6cDrafts.ts\` (new)\n`;
  report += `- \`scripts/ai-resources-stage6c1-polish-review-five.ts\` (new)\n`;
  report += `- \`data/content/polished/*-stage6c1-2026-05-21.md\` (5 polished markdown exports)\n`;
  report += `- \`reports/seo/ai-resources-stage6c1-polished-previews-2026-05-21/*.md\` (5 preview files)\n\n`;

  report += `## DB rows updated\n\n`;
  report += `| Slug | post_id | status | words before→after | internal links before→after |\n`;
  report += `|------|---------|--------|----------------------|----------------------------|\n`;
  for (const r of rows) {
    report += `| ${r.slug} | ${r.id} | review_needed | ${r.wordsBefore}→${r.wordsAfter} | ${r.internalBefore}→${r.internalAfter} |\n`;
  }

  report += `\n## QA before → after\n\n`;
  for (const r of rows) {
    report += `### ${r.slug}\n\n`;
    report += `| Check | Before | After |\n|-------|--------|-------|\n`;
    for (const key of Object.keys(r.qaAfter) as (keyof typeof r.qaAfter)[]) {
      report += `| ${key} | ${r.qaBefore[key]} | ${r.qaAfter[key]} |\n`;
    }
    report += '\n';
  }

  report += `## Status confirmation (after run)\n\n`;
  report += `### Five Stage 6C drafts\n\n`;
  for (const r of reviewAfter) {
    report += `- \`${r.slug}\`: \`${r.status}\` (${r.id})\n`;
  }
  const allReview = reviewAfter.every((r) => r.status === 'review_needed');

  report += `\n### Six live Stage 6B articles (must be untouched)\n\n`;
  for (const r of liveAfter) {
    report += `- \`${r.slug}\`: status=\`${r.status}\`, body unchanged=${r.unchanged}\n`;
  }
  const liveOk = liveAfter.every((r) => r.unchanged && r.status === 'published');

  report += `\n## Guardrails\n\n`;
  report += `- No OpenAI generation\n`;
  report += `- No publish (\`AUTO_PUBLISH=0\` unchanged)\n`;
  report += `- No ES/FR, sitemap, auth, billing, schema, or RLS changes\n`;
  report += `- All five remain \`review_needed\`: ${allReview ? '**yes**' : '**NO — check statuses**'}\n`;
  report += `- Six published live articles untouched: ${liveOk ? '**yes**' : '**NO — verify**'}\n`;

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, report, 'utf8');
  console.log(JSON.stringify({ phase: 'report', path: REPORT_PATH }, null, 2));

  if (!allReview || !liveOk) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
