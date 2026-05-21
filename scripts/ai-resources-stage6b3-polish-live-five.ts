/**
 * Stage 6B.3 — polish 5 published AI resource posts + revalidate + smoke.
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/ai-resources-stage6b3-polish-live-five.ts
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/ai-resources-stage6b3-polish-live-five.ts --write
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';
import { deduplicateQuickSummaryBlocksInHtml } from '@/lib/content-hub/deduplicateQuickSummaryInHtml';
import {
  AI_RESOURCE_PUBLISH_SLUGS,
  hasRawInternalPath,
  polishAiResourceArticleMarkdown,
  type AiResourcePublishSlug
} from '@/lib/content-hub/polishAiResourceArticleMarkdown';
import { markdownToHtml } from '@/services/content-hub/src/lib/html.ts';
import {
  countCharsNoSpaces,
  countWords
} from '@/services/content-hub/src/lib/markdown.ts';
import { postSeoRevalidate } from '@/lib/seo/revalidateSeoPath';

const SITE = 'https://scholarshiptop.com';
const POLISHED_DIR = path.join(process.cwd(), 'data/content/polished');
const PREVIEW_SOURCE_DIR = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6b-previews-2026-05-21'
);
const REPORT_PATH = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6b3-five-live-articles-polish-2026-05-21.md'
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

function countInternalHref(html: string): number {
  return [...html.matchAll(/href=["'](\/(?:scholarships|resources)[^"']*)["']/gi)].length;
}

async function loadSourceMarkdown(slug: string): Promise<string> {
  const previewPath = path.join(PREVIEW_SOURCE_DIR, `${slug}.md`);
  const raw = await fs.readFile(previewPath, 'utf8');
  const startMark = '## body_markdown\n\n';
  const endMark = '\n---\n\n## body_html';
  const idx = raw.indexOf(startMark);
  if (idx < 0) throw new Error(`body_markdown missing in preview: ${slug}`);
  const end = raw.indexOf(endMark, idx);
  if (end < 0) throw new Error(`body_html marker missing in preview: ${slug}`);
  return raw.slice(idx + startMark.length, end).trim();
}

async function fetchSmoke(url: string) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'ScholarshipTop-Stage6B3-Smoke/1.0' },
    redirect: 'follow'
  });
  const html = res.ok ? await res.text() : '';
  const lower = html.toLowerCase();
  return {
    status: res.status,
    noTable: !/<table\b/i.test(html),
    no35: !/in 3[–-]5 bullets/i.test(lower),
    noTypeQ: !/\?\?\?/i.test(html),
    noKeyPoint: !/key point \d/i.test(lower),
    noRawPaths: !hasRawInternalPath(html),
    noDeadline: !/deadline passed/i.test(lower),
    noDotMoney: !/\$9\.000/.test(html),
    hasCanonical: /<link[^>]+rel=["']canonical["']/i.test(html),
    hasMeta: /<meta[^>]+name=["']description["']/i.test(html),
    internalLinks:
      /href=["']\/scholarships/i.test(html) || /href=["']\/resources/i.test(html)
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
    .select('id, slug, status, title, body_markdown, body_html, word_count')
    .in('slug', [...AI_RESOURCE_PUBLISH_SLUGS]);
  if (error) throw new Error(error.message);

  const changes: {
    slug: string;
    id: string;
    status: string;
    internalBefore: number;
    internalAfter: number;
    rawPathsBefore: boolean;
    rawPathsAfter: boolean;
    keyPointBefore: boolean;
  }[] = [];

  for (const slug of AI_RESOURCE_PUBLISH_SLUGS) {
    const post = posts?.find((p) => p.slug === slug);
    if (!post) throw new Error(`Missing: ${slug}`);
    if (post.status !== 'published') {
      throw new Error(`${slug} status=${post.status}, expected published`);
    }

    const mdBefore = await loadSourceMarkdown(slug);
    const htmlBefore = post.body_html ?? '';
    const polishedMd = polishAiResourceArticleMarkdown(
      slug as AiResourcePublishSlug,
      mdBefore
    );
    let html = cleanupExternalAnchors(await markdownToHtml(polishedMd));
    html = deduplicateQuickSummaryBlocksInHtml(html);

    const row = {
      slug,
      id: post.id,
      status: post.status,
      internalBefore: countInternalHref(htmlBefore),
      internalAfter: countInternalHref(html),
      rawPathsBefore: hasRawInternalPath(`${mdBefore}\n${htmlBefore}`),
      rawPathsAfter: hasRawInternalPath(`${polishedMd}\n${html}`),
      keyPointBefore: /key point \d/i.test(`${mdBefore}${htmlBefore}`)
    };
    changes.push(row);

    await fs.mkdir(POLISHED_DIR, { recursive: true });
    await fs.writeFile(
      path.join(POLISHED_DIR, `${slug}-2026-05-21.md`),
      polishedMd,
      'utf8'
    );

    console.log(JSON.stringify({ phase: 'polish', ...row, write: writeMode }, null, 2));

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
        .eq('status', 'published');
      if (upErr) throw new Error(upErr.message);
    }
  }

  const revalidateResults: { path: string; ok: boolean }[] = [];
  const smokeResults: Record<string, Awaited<ReturnType<typeof fetchSmoke>>> = {};

  if (writeMode) {
    const paths = [
      '/resources?cat=ai',
      '/resources',
      ...AI_RESOURCE_PUBLISH_SLUGS.map((s) => `/resources/${s}`)
    ];
    for (const p of paths) {
      const pathOnly = p.split('?')[0];
      const ok = await postSeoRevalidate({
        path: pathOnly,
        tag: pathOnly.startsWith('/resources/') && pathOnly !== '/resources'
          ? 'published-content-post-by-slug-v2'
          : undefined
      });
      revalidateResults.push({ path: p, ok });
      console.log(`${ok ? 'OK' : 'FAIL'} revalidate ${p}`);
    }

    await new Promise((r) => setTimeout(r, 4000));

    smokeResults['/resources?cat=ai'] = await fetchSmoke(`${SITE}/resources?cat=ai`);
    for (const slug of AI_RESOURCE_PUBLISH_SLUGS) {
      smokeResults[`/resources/${slug}`] = await fetchSmoke(
        `${SITE}/resources/${slug}`
      );
    }
    smokeResults['/es/resources/best-scholarship-search-engines-international-students'] =
      await fetchSmoke(
        `${SITE}/es/resources/best-scholarship-search-engines-international-students`
      );
  }

  let hubAi = '';
  if (writeMode && smokeResults['/resources?cat=ai']?.status === 200) {
    const hubRes = await fetch(`${SITE}/resources?cat=ai`, {
      headers: { 'user-agent': 'ScholarshipTop-Stage6B3-Smoke/1.0' }
    });
    hubAi = await hubRes.text();
  }

  let report = `# AI Resources Stage 6B.3 — five live articles polish\n\n`;
  report += `**Date:** 2026-05-21  \n`;
  report += `**DB writes:** ${writeMode ? 'yes (5 published posts, status unchanged)' : 'dry-run only'}  \n`;
  report += `**Code:** hide IQ promo on \`/resources?cat=ai\`; grid card “Type ???” → “Profile” elsewhere  \n`;
  report += `**Commit/push:** not performed\n\n`;

  report += `## Guardrails\n\n`;
  report += `- Publish only these 5 slugs (already published; polish only)\n`;
  report += `- No generation, batch 24/29/30, ES/FR, env/auth changes\n`;
  report += `- No unrelated posts touched\n\n`;

  report += `## Content updates per slug\n\n`;
  report += `| Slug | post_id | status | internal links before→after | raw paths before→after | had Key Point N |\n`;
  report += `|------|---------|--------|----------------------------|------------------------|------------------|\n`;
  for (const c of changes) {
    report += `| ${c.slug} | ${c.id} | ${c.status} | ${c.internalBefore}→${c.internalAfter} | ${c.rawPathsBefore}→${c.rawPathsAfter} | ${c.keyPointBefore ? 'yes' : 'no'} |\n`;
  }

  report += `\n## Hub (\`/resources?cat=ai\`)\n\n`;
  if (writeMode) {
    report += `- IQ sidebar: hidden when \`cat=ai\`\n`;
    report += `- IQ grid card at index 2: hidden when \`cat=ai\`\n`;
    report += `- “Type ???” in grid promo: removed on AI hub; other hubs show “Profile” label instead\n`;
    report += `- Page contains \`???: ${hubAi.includes('???')}\`\n`;
    report += `- Page contains \`resource-article-iq-cta\`: ${hubAi.includes('resource-article-iq-cta')}\n`;
  } else {
    report += `_Run with --write to verify live hub._\n`;
  }

  if (writeMode) {
    report += `\n## ISR revalidate\n\n`;
    for (const r of revalidateResults) {
      report += `- \`${r.path}\`: ${r.ok ? 'OK' : 'FAIL'}\n`;
    }

    report += `\n## Production smoke\n\n`;
    report += `| URL | HTTP | no table | no 3–5 bullets | no ??? | no Key Point | no raw paths | no deadline | no $9.000 | canonical | meta | internal links |\n`;
    report += `|-----|------|----------|----------------|--------|--------------|--------------|-------------|----------|-----------|------|------------------|\n`;
    for (const [path, s] of Object.entries(smokeResults)) {
      report += `| ${path} | ${s.status} | ${s.noTable} | ${s.no35} | ${s.noTypeQ} | ${s.noKeyPoint} | ${s.noRawPaths} | ${s.noDeadline} | ${s.noDotMoney} | ${s.hasCanonical} | ${s.hasMeta} | ${s.internalLinks} |\n`;
    }

    report += `\n## Live URLs\n\n`;
    for (const slug of AI_RESOURCE_PUBLISH_SLUGS) {
      report += `- https://scholarshiptop.com/resources/${slug}\n`;
    }
  }

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, report, 'utf8');
  console.log(JSON.stringify({ phase: 'report', path: REPORT_PATH }, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
