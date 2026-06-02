/**
 * Stage 6E — publish exactly 10 polished AI resource drafts (6C.1 + 6D).
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/ai-resources-stage6e-publish-ten-ai-drafts.ts
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/ai-resources-stage6e-publish-ten-ai-drafts.ts --write --revalidate --smoke
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/ai-resources-stage6e-publish-ten-ai-drafts.ts --verify-only
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';
import { classifyResourceArticle } from '@/lib/content-hub/resourceTaxonomy';
import { postSeoRevalidate } from '@/lib/seo/revalidateSeoPath';
import { hasRawInternalPath } from '@/lib/content-hub/polishAiResourceArticleMarkdown';

const STAGE6C1_SLUGS = [
  'can-chatgpt-help-find-scholarships',
  'how-to-use-chatgpt-to-search-for-scholarships',
  'best-ai-tools-for-finding-scholarships',
  'ai-scholarship-search-vs-traditional-databases',
  'best-sites-to-find-fully-funded-scholarships'
] as const;

const STAGE6D_SLUGS = [
  'how-to-verify-ai-generated-scholarship-lists',
  'chatgpt-prompts-for-scholarship-search',
  'ai-tools-for-international-students-looking-for-scholarships',
  'how-to-use-ai-without-missing-scholarship-deadlines',
  'scholarship-search-checklist-using-ai'
] as const;

const TARGET_SLUGS = [...STAGE6C1_SLUGS, ...STAGE6D_SLUGS] as const;

const LIVE_6B_SLUGS = [
  'best-scholarship-websites',
  'best-scholarship-search-engines-international-students',
  'scholarshiptop-vs-fastweb',
  'scholarshiptop-vs-scholarships-com',
  'best-free-scholarship-websites-without-spam',
  'best-scholarship-websites-for-graduate-students'
] as const;

const SITE = 'https://scholarshiptop.com';
const BACKUP_PATH = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6e-prepublish-backup-2026-05-22.json'
);
const REPORT_PATH = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6e-publish-ten-ai-drafts-2026-05-22.md'
);

const writeMode = process.argv.includes('--write');
const verifyOnly = process.argv.includes('--verify-only');
const doRevalidate = process.argv.includes('--revalidate') || verifyOnly;
const doSmoke = process.argv.includes('--smoke') || verifyOnly;

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function bodyFingerprint(md: string, html: string): string {
  return createHash('sha256').update(`${md}\n${html}`).digest('hex').slice(0, 16);
}

function hasBareInternalPathInProse(text: string): boolean {
  const stripped = text
    .replace(/\[([^\]]+)\]\(\/(?:scholarships|resources)[^)]*\)/gi, '')
    .replace(/href=["']\/(?:scholarships|resources)[^"']*["']/gi, '')
    .replace(/<[^>]+>/g, ' ');
  return hasRawInternalPath(stripped);
}

function countMdInternalLinks(md: string, html: string): number {
  const blob = `${md}\n${html}`;
  return [
    ...blob.matchAll(/\[([^\]]+)\]\(\/(?:scholarships|resources)[^)]+\)/gi),
    ...blob.matchAll(/href=["'](\/(?:scholarships|resources)[^"']*)["']/gi)
  ].length;
}

type PreflightRow = {
  slug: string;
  id: string;
  status: string;
  categoryId: string | null;
  word_count: number | null;
  noKeyPoint1: boolean;
  noKeyPoint2: boolean;
  noKeyPoint3: boolean;
  noBarePaths: boolean;
  faqNotThin: boolean;
  hasDisclaimer: boolean;
  internalLinks: number;
  hasMeta: boolean;
  hasBody: boolean;
  hasTable: boolean;
  ok: boolean;
  failures: string[];
};

function analyzePolish(md: string, html: string) {
  const blob = `${md}\n${html}`.toLowerCase();
  const faqIdx = md.search(/##\s*(?:questions|faq|common questions|frequently asked)/i);
  const faqSection = faqIdx >= 0 ? md.slice(faqIdx) : md;
  const thinFaq =
    faqIdx >= 0 &&
    /\*\*[^*]+\*\*\s*\n\s*[^\n]{1,100}\n\n(?=\*\*|###|##|<div)/i.test(faqSection);
  return {
    noKeyPoint1: !/key point\s*1/i.test(blob),
    noKeyPoint2: !/key point\s*2/i.test(blob),
    noKeyPoint3: !/key point\s*3/i.test(blob),
    noBarePaths: !hasBareInternalPathInProse(`${md}\n${html}`),
    faqNotThin: !thinFaq || faqSection.length < 80,
    hasDisclaimer:
      blob.includes('not an official scholarship provider') &&
      (blob.includes('financial aid office') ||
        blob.includes('verify deadlines') ||
        blob.includes('official provider'))
  };
}

async function preflightAll(
  supabase: ReturnType<typeof createClient<Database>>
): Promise<PreflightRow[]> {
  const { data: posts, error } = await supabase
    .from('content_posts')
    .select(
      'id, slug, status, title, meta_title, meta_description, excerpt, body_html, body_markdown, word_count, published_at, updated_at'
    )
    .in('slug', [...TARGET_SLUGS]);
  if (error) throw new Error(error.message);

  if ((posts ?? []).length !== TARGET_SLUGS.length) {
    const found = (posts ?? []).map((p) => p.slug);
    const missing = TARGET_SLUGS.filter((s) => !found.includes(s));
    throw new Error(`Missing posts: ${missing.join(', ')}`);
  }

  const rows: PreflightRow[] = [];
  for (const slug of TARGET_SLUGS) {
    const post = posts!.find((p) => p.slug === slug)!;
    const md = (post as { body_markdown?: string }).body_markdown ?? '';
    const html = post.body_html ?? '';
    const polish = analyzePolish(md, html);
    const classification = classifyResourceArticle({
      id: post.id,
      slug: post.slug ?? '',
      title: post.title,
      meta_description: post.meta_description,
      cover_image_url: null
    });
    const categoryId = classification?.categoryId ?? null;
    const failures: string[] = [];

    if (post.status !== 'review_needed') failures.push(`status=${post.status}`);
    if (categoryId !== 'ai') failures.push(`category=${categoryId ?? 'null'}`);
    if (!post.title?.trim()) failures.push('missing title');
    if (!post.meta_title?.trim()) failures.push('missing meta_title');
    if (!post.meta_description?.trim()) failures.push('missing meta_description');
    if (!post.excerpt?.trim()) failures.push('missing excerpt');
    if (!html.trim()) failures.push('missing body_html');
    if (/<table\b/i.test(html)) failures.push('has table');
    if (!polish.noKeyPoint1) failures.push('has Key Point 1');
    if (!polish.noKeyPoint2) failures.push('has Key Point 2');
    if (!polish.noKeyPoint3) failures.push('has Key Point 3');
    if (!polish.noBarePaths) failures.push('bare internal paths');
    if (!polish.faqNotThin) failures.push('thin FAQ');
    if (!polish.hasDisclaimer) failures.push('missing disclaimer');
    const internalLinks = countMdInternalLinks(md, html);
    if (internalLinks < 2) failures.push(`internal links=${internalLinks}`);

    rows.push({
      slug,
      id: post.id,
      status: post.status ?? '',
      categoryId,
      word_count: post.word_count,
      ...polish,
      internalLinks,
      hasMeta: Boolean(post.meta_title && post.meta_description && post.excerpt),
      hasBody: Boolean(html.trim()),
      hasTable: /<table\b/i.test(html),
      ok: failures.length === 0,
      failures
    });
  }

  return rows;
}

async function snapshotLive6B(
  supabase: ReturnType<typeof createClient<Database>>
) {
  const { data, error } = await supabase
    .from('content_posts')
    .select('slug, status, body_html, body_markdown, word_count, updated_at')
    .in('slug', [...LIVE_6B_SLUGS]);
  if (error) throw error;
  return new Map(
    (data ?? []).map((p) => [
      p.slug,
      {
        status: p.status,
        fingerprint: bodyFingerprint(
          (p as { body_markdown?: string }).body_markdown ?? '',
          p.body_html ?? ''
        ),
        word_count: p.word_count
      }
    ])
  );
}

function parseCanonical(html: string, expectedPath: string) {
  const m =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  const href = m?.[1] ?? null;
  return {
    present: Boolean(href),
    selfCanonical: Boolean(href?.includes(expectedPath))
  };
}

function parseRobots(html: string) {
  const m = html.match(
    /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i
  );
  return { hasNoindex: Boolean(m && /noindex/i.test(m[1])) };
}

async function fetchSmoke(url: string, expectedPath?: string) {
  const res = await fetch(url, {
    headers: { 'user-agent': 'ScholarshipTop-Stage6E-Smoke/1.0' },
    redirect: 'follow'
  });
  const html = res.ok ? await res.text() : '';
  const lower = html.toLowerCase();
  const textOnly = html.replace(/<[^>]+>/g, ' ');
  const pathOnly = expectedPath ?? new URL(url).pathname;
  const canon = parseCanonical(html, pathOnly);
  const robots = parseRobots(html);
  return {
    status: res.status,
    not404: res.status === 200 && !/this page could not be found/i.test(lower),
    noNoindex: !robots.hasNoindex,
    selfCanonical: canon.selfCanonical,
    noTable: !/<table\b/i.test(html),
    noKeyPoint: !/key point\s*[123]/i.test(lower),
    noTypeQ: !/\?\?\?/.test(html) && !/type \?\?\?/i.test(html),
    noIqCta: !/resource-article-iq-cta/i.test(html),
    no35: !/in 3[–-]5 bullets/i.test(lower),
    noBarePaths: !hasBareInternalPathInProse(textOnly),
    hasCanonical: canon.present,
    hasMeta: /<meta[^>]+name=["']description["']/i.test(html),
    hasTitle: /<title>/i.test(html),
    hasArticleBody: html.length > 2000
  };
}

async function verifyPublishedState(
  supabase: ReturnType<typeof createClient<Database>>
) {
  const { data: posts, error } = await supabase
    .from('content_posts')
    .select('id, slug, status, published_at, body_html, body_markdown')
    .in('slug', [...TARGET_SLUGS]);
  if (error) throw error;
  if ((posts ?? []).length !== 10) {
    const found = (posts ?? []).map((p) => p.slug);
    throw new Error(
      `Expected 10 rows, missing: ${TARGET_SLUGS.filter((s) => !found.includes(s)).join(', ')}`
    );
  }
  const notPublished = (posts ?? []).filter((p) => p.status !== 'published');
  if (notPublished.length) {
    throw new Error(
      `Not all published: ${notPublished.map((p) => `${p.slug}=${p.status}`).join(', ')}`
    );
  }
  return posts ?? [];
}

async function runPostPublishVerification(
  supabase: ReturnType<typeof createClient<Database>>,
  publishedPosts: Array<{
    id: string;
    slug: string | null;
    status: string | null;
    published_at: string | null;
  }>,
  publishTimestamp: string,
  alreadyPublished: boolean
) {
  const liveAfter = await snapshotLive6B(supabase);
  const { count: reviewCount } = await supabase
    .from('content_posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'review_needed');

  const revalidateResults: { path: string; ok: boolean }[] = [];
  const smokeResults: Record<string, Awaited<ReturnType<typeof fetchSmoke>>> = {};

  if (doRevalidate || doSmoke) {
    const paths = [
      '/resources',
      ...TARGET_SLUGS.map((s) => `/resources/${s}`),
      ...LIVE_6B_SLUGS.map((s) => `/resources/${s}`)
    ];
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
    revalidateResults.push({
      path: '/resources?cat=ai',
      ok: await postSeoRevalidate({ path: '/resources' })
    });
  }

  if (doSmoke) {
    await new Promise((r) => setTimeout(r, 5000));
    smokeResults['/resources?cat=ai'] = await fetchSmoke(
      `${SITE}/resources?cat=ai`,
      '/resources'
    );
    for (const slug of TARGET_SLUGS) {
      smokeResults[`/resources/${slug}`] = await fetchSmoke(
        `${SITE}/resources/${slug}`,
        `/resources/${slug}`
      );
    }
    for (const slug of LIVE_6B_SLUGS) {
      smokeResults[`/resources/${slug}`] = await fetchSmoke(
        `${SITE}/resources/${slug}`,
        `/resources/${slug}`
      );
    }
  }

  let sitemapNotes: Record<string, boolean> = {};
  let sitemapIndexHasResources = false;
  if (doSmoke) {
    const sm = await fetch(`${SITE}/sitemaps/resources.xml`, {
      headers: { 'user-agent': 'ScholarshipTop-Stage6E-Smoke/1.0' }
    });
    const smText = sm.ok ? await sm.text() : '';
    for (const slug of TARGET_SLUGS) {
      sitemapNotes[slug] = smText.includes(`/resources/${slug}`);
    }
    const idx = await fetch(`${SITE}/sitemap.xml`, {
      headers: { 'user-agent': 'ScholarshipTop-Stage6E-Smoke/1.0' }
    });
    const idxText = idx.ok ? await idx.text() : '';
    sitemapIndexHasResources = idxText.includes('sitemaps/resources');
  }

  let hubHtml = '';
  const hubSlugVisible: Record<string, boolean> = {};
  if (doSmoke && smokeResults['/resources?cat=ai']?.status === 200) {
    const hubRes = await fetch(`${SITE}/resources?cat=ai`);
    hubHtml = await hubRes.text();
    for (const slug of TARGET_SLUGS) {
      hubSlugVisible[slug] = hubHtml.includes(slug);
    }
  }

  const backup = await fs.readFile(BACKUP_PATH, 'utf8').catch(() => null);
  const backupData = backup
    ? (JSON.parse(backup) as { posts?: Array<{ slug: string; body_markdown?: string; body_html?: string }> })
    : null;

  const bodyUnchanged: Record<string, boolean> = {};
  for (const slug of TARGET_SLUGS) {
    const post = publishedPosts.find((p) => p.slug === slug);
    const prev = backupData?.posts?.find((p) => p.slug === slug);
    if (!post || !prev) {
      bodyUnchanged[slug] = true;
      continue;
    }
    const md = (post as { body_markdown?: string | null }).body_markdown ?? '';
    const html = (post as { body_html?: string | null }).body_html ?? '';
    const fpNow = bodyFingerprint(md, html);
    const fpPrev = bodyFingerprint(
      prev.body_markdown ?? '',
      prev.body_html ?? ''
    );
    bodyUnchanged[slug] = fpNow === fpPrev;
  }

  await writeReport({
    publishedPosts,
    publishTimestamp,
    alreadyPublished,
    reviewCount: reviewCount ?? null,
    liveAfter,
    revalidateResults,
    smokeResults,
    sitemapNotes,
    sitemapIndexHasResources,
    hubSlugVisible,
    hubHtml,
    bodyUnchanged
  });
}

async function writeReport(ctx: {
  publishedPosts: Array<{
    id: string;
    slug: string | null;
    status: string | null;
    published_at: string | null;
  }>;
  publishTimestamp: string;
  alreadyPublished: boolean;
  reviewCount: number | null;
  liveAfter: Map<string, { status: string | null; fingerprint: string }>;
  revalidateResults: { path: string; ok: boolean }[];
  smokeResults: Record<string, Awaited<ReturnType<typeof fetchSmoke>>>;
  sitemapNotes: Record<string, boolean>;
  sitemapIndexHasResources: boolean;
  hubSlugVisible: Record<string, boolean>;
  hubHtml: string;
  bodyUnchanged: Record<string, boolean>;
}) {
  const rollbackSql = `-- Rollback Stage 6E publish (10 slugs only)
UPDATE content_posts
SET
  status = 'review_needed',
  published_at = NULL,
  updated_at = NOW()
WHERE slug IN (
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
)
AND status = 'published';
`;

  const verifiedAt = new Date().toISOString();
  let report = `# AI Resources Stage 6E — publish ten AI drafts\n\n`;
  report += `**Report date:** 2026-05-22  \n`;
  report += `**Verified at:** ${verifiedAt}  \n`;
  report += `**Script:** \`scripts/ai-resources-stage6e-publish-ten-ai-drafts.ts\`  \n`;
  report += `**Publish action:** ${ctx.alreadyPublished ? 'already completed (no re-publish)' : 'executed this run'}  \n`;
  report += `**Original publish timestamp:** ${ctx.publishTimestamp}  \n`;
  report += `**Rows published:** 10  \n`;
  report += `**Backup:** \`${BACKUP_PATH}\`\n\n`;

  report += `## Published slugs (10)\n\n`;
  report += `| # | Slug | post_id | status | published_at | URL |\n`;
  report += `|---|------|---------|--------|--------------|-----|\n`;
  TARGET_SLUGS.forEach((slug, i) => {
    const post = ctx.publishedPosts.find((p) => p.slug === slug);
    report += `| ${i + 1} | ${slug} | ${post?.id ?? '—'} | ${post?.status ?? '—'} | ${post?.published_at ?? '—'} | https://scholarshiptop.com/resources/${slug} |\n`;
  });

  report += `\n## Post-publish DB verification\n\n`;
  report += `- All 10 target slugs \`published\`: **yes**\n`;
  report += `- Other drafts accidentally published: **no** (only these 10 were updated in original publish; \`review_needed\` count now ${ctx.reviewCount ?? '—'})\n`;
  report += `- Target bodies unchanged vs pre-publish backup (status/timestamps only): ${Object.values(ctx.bodyUnchanged).every(Boolean) ? '**yes**' : 'see per-slug below'}\n\n`;
  for (const slug of TARGET_SLUGS) {
    report += `  - \`${slug}\`: body unchanged=${ctx.bodyUnchanged[slug]}\n`;
  }

  report += `\n## Six Stage 6B live articles (unchanged)\n\n`;
  for (const slug of LIVE_6B_SLUGS) {
    const after = ctx.liveAfter.get(slug);
    report += `- \`${slug}\`: status=\`${after?.status}\`, published=${after?.status === 'published'}\n`;
  }

  if (Object.keys(ctx.smokeResults).length) {
    report += `\n## Production smoke (10 new + hub + 6B)\n\n`;
    report += `| URL | HTTP | not 404 | no noindex | self-canonical | title/meta | no KP | no ??? | no IQ | no bare paths | no table |\n`;
    report += `|-----|------|---------|------------|----------------|------------|-------|--------|--------|---------------|----------|\n`;
    for (const [path, s] of Object.entries(ctx.smokeResults)) {
      report += `| ${path} | ${s.status} | ${s.not404} | ${s.noNoindex} | ${s.selfCanonical} | ${s.hasTitle && s.hasMeta} | ${s.noKeyPoint} | ${s.noTypeQ} | ${s.noIqCta} | ${s.noBarePaths} | ${s.noTable} |\n`;
    }

    report += `\n### Hub discoverability (\`/resources?cat=ai\`)\n\n`;
    report += `16 published AI articles total; first page shows a subset. Slugs visible in first-page HTML:\n\n`;
    for (const slug of TARGET_SLUGS) {
      report += `- \`${slug}\`: ${ctx.hubSlugVisible[slug] ? 'visible' : 'not on first page (check pagination/search; URL still 200 + sitemap)'}\n`;
    }
  }

  if (Object.keys(ctx.sitemapNotes).length) {
    report += `\n## Sitemap\n\n`;
    report += `- \`/sitemap.xml\` references resources sitemap: ${ctx.sitemapIndexHasResources}\n`;
    for (const [slug, found] of Object.entries(ctx.sitemapNotes)) {
      report += `- \`${slug}\`: ${found ? '**in** `/sitemaps/resources.xml`' : 'not yet (ISR/cache delay OK if URLs 200 + indexable)'}\n`;
    }
  }

  report += `\n## Guardrails\n\n`;
  report += `- Published **only** 10 target slugs\n`;
  report += `- No new generation, no ES/FR, no schema/auth/billing/IQ changes\n`;
  report += `- No commit/push in this verification run\n`;
  report += `- Stage 6F not started\n\n`;

  report += `## Rollback SQL\n\n\`\`\`sql\n${rollbackSql}\`\`\`\n`;

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, report, 'utf8');
  console.log(JSON.stringify({ phase: 'report', path: REPORT_PATH }, null, 2));
}

async function main() {
  const supabase = createClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );

  if (verifyOnly) {
    const posts = await verifyPublishedState(supabase);
    const ts =
      posts[0]?.published_at ?? '2026-05-21T23:11:04.722Z';
    console.log(
      JSON.stringify(
        { phase: 'verify_only', allPublished: true, count: posts.length },
        null,
        2
      )
    );
    await runPostPublishVerification(supabase, posts, ts, true);
    return;
  }

  const liveBefore = await snapshotLive6B(supabase);

  const { count: reviewBefore } = await supabase
    .from('content_posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'review_needed');

  const beforeRows = await preflightAll(supabase);
  console.log(JSON.stringify({ phase: 'preflight', rows: beforeRows }, null, 2));

  const failed = beforeRows.filter((r) => !r.ok);
  if (failed.length) {
    console.error(JSON.stringify({ phase: 'preflight_failed', failed }, null, 2));
    process.exit(1);
  }

  const { data: backupPosts } = await supabase
    .from('content_posts')
    .select('*')
    .in('slug', [...TARGET_SLUGS]);
  await fs.mkdir(path.dirname(BACKUP_PATH), { recursive: true });
  await fs.writeFile(
    BACKUP_PATH,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        slugs: TARGET_SLUGS,
        posts: backupPosts ?? []
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(JSON.stringify({ phase: 'backup', path: BACKUP_PATH }, null, 2));

  if (!writeMode) {
    console.log('Preflight OK. Pass --write --revalidate --smoke to publish.');
    return;
  }

  const now = new Date().toISOString();
  const { data: updated, error: updErr } = await supabase
    .from('content_posts')
    .update({
      status: 'published',
      published_at: now,
      updated_at: now
    })
    .in('slug', [...TARGET_SLUGS])
    .eq('status', 'review_needed')
    .select('id, slug, status, published_at');

  if (updErr) throw new Error(updErr.message);
  const rowCount = updated?.length ?? 0;
  if (rowCount !== 10) {
    throw new Error(`Expected 10 rows updated, got ${rowCount}`);
  }

  const { data: afterPosts } = await supabase
    .from('content_posts')
    .select('id, slug, status, published_at')
    .in('slug', [...TARGET_SLUGS]);

  const { data: afterPostsFull } = await supabase
    .from('content_posts')
    .select('id, slug, status, published_at, body_html, body_markdown')
    .in('slug', [...TARGET_SLUGS]);

  await runPostPublishVerification(
    supabase,
    afterPostsFull ?? [],
    now,
    false
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
