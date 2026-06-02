/**
 * Stage 6B.2 — publish exactly 5 AI pack articles (slug-filtered only).
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/ai-resources-stage6b2-publish-five.ts
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/ai-resources-stage6b2-publish-five.ts --write
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/ai-resources-stage6b2-publish-five.ts --write --revalidate --smoke
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';
import { postSeoRevalidate } from '@/lib/seo/revalidateSeoPath';

const TARGET_SLUGS = [
  'best-scholarship-search-engines-international-students',
  'scholarshiptop-vs-fastweb',
  'scholarshiptop-vs-scholarships-com',
  'best-free-scholarship-websites-without-spam',
  'best-scholarship-websites-for-graduate-students'
] as const;

const PILOT_SLUG = 'best-scholarship-websites';
const SITE = 'https://scholarshiptop.com';
const REPORT_PATH = path.join(
  process.cwd(),
  'reports/seo/ai-resources-stage6b2-five-article-publish-smoke-2026-05-21.md'
);

const writeMode = process.argv.includes('--write');
const doRevalidate = process.argv.includes('--revalidate');
const doSmoke = process.argv.includes('--smoke');

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function countInternalHref(html: string): number {
  return [...html.matchAll(/href=["'](\/(?:scholarships|resources)[^"']*)["']/gi)].length;
}

async function loadClassification(slug: string): Promise<string | null> {
  const p = path.join(process.cwd(), 'data/resource-article-classification.json');
  const raw = await fs.readFile(p, 'utf8');
  const data = JSON.parse(raw) as Record<string, { categoryId?: string }>;
  return data[slug]?.categoryId ?? null;
}

type PreflightRow = {
  slug: string;
  id: string;
  status: string;
  categoryId: string | null;
  hasMeta: boolean;
  hasBody: boolean;
  hasTable: boolean;
  hasDisclaimer: boolean;
  internalLinks: number;
  ok: boolean;
  failures: string[];
};

async function preflightAll(
  supabase: ReturnType<typeof createClient<Database>>
): Promise<PreflightRow[]> {
  const { data: posts, error } = await supabase
    .from('content_posts')
    .select(
      'id, slug, status, title, meta_title, meta_description, excerpt, body_html, published_at'
    )
    .in('slug', [...TARGET_SLUGS]);
  if (error) throw new Error(error.message);

  if ((posts ?? []).length !== TARGET_SLUGS.length) {
    const found = (posts ?? []).map((p) => p.slug);
    const missing = TARGET_SLUGS.filter((s) => !found.includes(s));
    throw new Error(`Missing posts: ${missing.join(', ')}`);
  }

  const { data: dupes } = await supabase
    .from('content_posts')
    .select('id, slug, status')
    .in('slug', [...TARGET_SLUGS]);
  for (const slug of TARGET_SLUGS) {
    const rows = (dupes ?? []).filter((r) => r.slug === slug);
    if (rows.length > 1) throw new Error(`Duplicate slug rows: ${slug} (${rows.length})`);
  }

  const rows: PreflightRow[] = [];
  for (const slug of TARGET_SLUGS) {
    const post = posts!.find((p) => p.slug === slug)!;
    const html = post.body_html ?? '';
    const blob = html.toLowerCase();
    const categoryId = await loadClassification(slug);
    const failures: string[] = [];

    if (post.status !== 'review_needed') failures.push(`status=${post.status}`);
    if (categoryId !== 'ai') failures.push(`category=${categoryId}`);
    if (!post.title?.trim()) failures.push('missing title');
    if (!post.meta_title?.trim()) failures.push('missing meta_title');
    if (!post.meta_description?.trim()) failures.push('missing meta_description');
    if (!post.excerpt?.trim()) failures.push('missing excerpt');
    if (!html.trim()) failures.push('missing body_html');
    if (/<table\b/i.test(html)) failures.push('has table');
    if (
      !/not an official scholarship provider|not a scholarship provider/i.test(blob)
    ) {
      failures.push('missing disclaimer');
    }
    const internalLinks = countInternalHref(html);
    if (internalLinks <= 0) failures.push('no internal links');

    rows.push({
      slug,
      id: post.id,
      status: post.status ?? '',
      categoryId,
      hasMeta: Boolean(post.meta_title && post.meta_description && post.excerpt),
      hasBody: Boolean(html.trim()),
      hasTable: /<table\b/i.test(html),
      hasDisclaimer: failures.every((f) => f !== 'missing disclaimer'),
      internalLinks,
      ok: failures.length === 0,
      failures
    });
  }

  return rows;
}

async function fetchSmoke(url: string): Promise<{
  status: number;
  checks: Record<string, boolean>;
}> {
  const res = await fetch(url, {
    headers: { 'user-agent': 'ScholarshipTop-Stage6B2-Smoke/1.0' },
    redirect: 'follow'
  });
  const html = res.ok ? await res.text() : '';
  const lower = html.toLowerCase();
  return {
    status: res.status,
    checks: {
      noTable: !/<table\b/i.test(html),
      no35Bullets: !/in 3[–-]5 bullets/i.test(lower),
      noTypeTriple: !/type \?\?\?/i.test(html),
      noIqCta: !/resource-article-iq-cta/i.test(html),
      noDeadlinePassed: !/deadline passed/i.test(lower),
      hasCanonical: /<link[^>]+rel=["']canonical["']/i.test(html),
      hasTitle: /<title>/i.test(html),
      hasMetaDesc: /<meta[^>]+name=["']description["']/i.test(html),
      hasInternalLinks:
        /href=["']\/scholarships/i.test(html) || /href=["']\/resources/i.test(html)
    }
  };
}

async function main() {
  const supabase = createClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );

  const beforeRows = await preflightAll(supabase);
  console.log(JSON.stringify({ phase: 'preflight', rows: beforeRows }, null, 2));

  const failed = beforeRows.filter((r) => !r.ok);
  if (failed.length) {
    console.error(JSON.stringify({ phase: 'preflight', ok: false, failed }, null, 2));
    process.exit(1);
  }

  const dryRun = TARGET_SLUGS.map((slug) => {
    const row = beforeRows.find((r) => r.slug === slug)!;
    return {
      id: row.id,
      slug,
      filter: { id: row.id, slug, status: 'review_needed' },
      patch: { status: 'published', published_at: '<now ISO>', updated_at: '<now ISO>' }
    };
  });

  console.log(
    JSON.stringify(
      {
        phase: 'dry-run',
        rowsExpected: 5,
        updates: dryRun
      },
      null,
      2
    )
  );

  if (!writeMode) {
    console.log('Pass --write to publish. Optional: --revalidate --smoke');
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
  console.log(
    JSON.stringify({ phase: 'write', rowsUpdated: rowCount, updated: updated ?? [] }, null, 2)
  );

  if (rowCount !== 5) {
    console.error(`Expected 5 rows updated, got ${rowCount}`);
    process.exit(1);
  }

  const { data: afterPosts } = await supabase
    .from('content_posts')
    .select('id, slug, status, published_at')
    .in('slug', [...TARGET_SLUGS]);

  const revalidateResults: { path: string; ok: boolean }[] = [];
  if (doRevalidate || doSmoke) {
    const paths = [
      '/resources',
      '/resources?cat=ai',
      ...TARGET_SLUGS.map((s) => `/resources/${s}`)
    ];
    for (const p of paths) {
      const ok = await postSeoRevalidate({
        path: p.split('?')[0],
        tag: p.startsWith('/resources/') && !p.includes('?')
          ? 'published-content-post-by-slug-v2'
          : undefined
      });
      revalidateResults.push({ path: p, ok });
      console.log(`${ok ? 'OK' : 'FAIL'} revalidate ${p}`);
    }
  }

  const smokeResults: Record<string, { status: number; checks: Record<string, boolean> }> =
    {};
  if (doSmoke) {
    await new Promise((r) => setTimeout(r, 3000));
    for (const slug of [...TARGET_SLUGS, PILOT_SLUG]) {
      smokeResults[`/resources/${slug}`] = await fetchSmoke(`${SITE}/resources/${slug}`);
    }
    smokeResults['/resources?cat=ai'] = await fetchSmoke(`${SITE}/resources?cat=ai`);
    for (const loc of ['es', 'fr'] as const) {
      smokeResults[`/${loc}/resources/${TARGET_SLUGS[0]}`] = await fetchSmoke(
        `${SITE}/${loc}/resources/${TARGET_SLUGS[0]}`
      );
    }
  }

  let sitemapHasSlugs: Record<string, boolean> = {};
  if (doSmoke) {
    const sm = await fetch(`${SITE}/sitemaps/resources.xml`, {
      headers: { 'user-agent': 'ScholarshipTop-Stage6B2-Smoke/1.0' }
    });
    const smText = sm.ok ? await sm.text() : '';
    for (const slug of TARGET_SLUGS) {
      sitemapHasSlugs[slug] = smText.includes(`/resources/${slug}`);
    }
    sitemapHasSlugs[PILOT_SLUG] = smText.includes(`/resources/${PILOT_SLUG}`);
  }

  let report = `# AI Resources Stage 6B.2 — five-article publish smoke\n\n`;
  report += `**Date:** 2026-05-21  \n`;
  report += `**Script:** \`scripts/ai-resources-stage6b2-publish-five.ts\`  \n`;
  report += `**Rows updated:** ${rowCount}  \n`;
  report += `**Publish:** slug-filtered only (no publish-next / publish-unpublished)\n\n`;

  report += `## Guardrails\n\n`;
  report += `| Action | Run? |\n|--------|------|\n`;
  report += `| Publish only 5 Stage 6B slugs | Yes |\n`;
  report += `| Other review_needed posts | No |\n`;
  report += `| Generation / batch 24/29/30 | No |\n`;
  report += `| ES/FR | No |\n`;
  report += `| Git commit/push | No |\n\n`;

  report += `## DB before / after\n\n`;
  report += `| Slug | post_id | status before | status after | published_at |\n`;
  report += `|------|---------|---------------|--------------|---------------|\n`;
  for (const slug of TARGET_SLUGS) {
    const before = beforeRows.find((r) => r.slug === slug)!;
    const after = afterPosts?.find((p) => p.slug === slug);
    report += `| ${slug} | ${before.id} | review_needed | ${after?.status ?? '—'} | ${after?.published_at ?? '—'} |\n`;
  }

  report += `\n## Preflight (before publish)\n\n`;
  report += `| Slug | category | internal links | table | disclaimer |\n`;
  report += `|------|----------|----------------|-------|------------|\n`;
  for (const r of beforeRows) {
    report += `| ${r.slug} | ${r.categoryId} | ${r.internalLinks} | ${r.hasTable ? 'yes' : 'no'} | ${r.hasDisclaimer ? 'yes' : 'no'} |\n`;
  }

  report += `\n## Live URLs\n\n`;
  for (const slug of TARGET_SLUGS) {
    report += `- https://scholarshiptop.com/resources/${slug}\n`;
  }

  if (doRevalidate) {
    report += `\n## ISR revalidate\n\n`;
    for (const r of revalidateResults) {
      report += `- \`${r.path}\`: ${r.ok ? 'OK' : 'FAIL'}\n`;
    }
  }

  if (doSmoke) {
    report += `\n## Production smoke\n\n`;
    report += `| URL | HTTP | no table | no 3–5 bullets | no Type ??? | no IQ CTA | no deadline passed | canonical | internal links |\n`;
    report += `|-----|------|----------|----------------|-------------|-----------|-------------------|-----------|------------------|\n`;
    const entries = [
      ...TARGET_SLUGS.map((s) => `/resources/${s}`),
      '/resources?cat=ai',
      `/es/resources/${TARGET_SLUGS[0]}`,
      `/fr/resources/${TARGET_SLUGS[0]}`
    ];
    for (const path of entries) {
      const s = smokeResults[path];
      if (!s) continue;
      const c = s.checks;
      report += `| ${path} | ${s.status} | ${c.noTable} | ${c.no35Bullets} | ${c.noTypeTriple} | ${c.noIqCta} | ${c.noDeadlinePassed} | ${c.hasCanonical} | ${c.hasInternalLinks} |\n`;
    }

    report += `\n### Hub check (\`?cat=ai\`)\n\n`;
    const hub = smokeResults['/resources?cat=ai'];
    const hubHtml = hub?.status === 200 ? 'fetched' : 'n/a';
    report += `Hub page ${hubHtml}. Expected slugs visible: pilot \`${PILOT_SLUG}\` + 5 published slugs.\n`;

    report += `\n## Sitemap (\`/sitemaps/resources.xml\`)\n\n`;
    for (const [slug, found] of Object.entries(sitemapHasSlugs)) {
      report += `- \`${slug}\`: ${found ? '**present**' : 'not yet (cache/regeneration delay possible)'}\n`;
    }
  }

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, report, 'utf8');
  console.log(JSON.stringify({ phase: 'report', path: REPORT_PATH }, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
