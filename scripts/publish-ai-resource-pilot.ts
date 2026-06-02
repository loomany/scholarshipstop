/**
 * Publish exactly one AI resources pilot post (Stage 6A.4).
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/publish-ai-resource-pilot.ts
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/publish-ai-resource-pilot.ts --write
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

const PILOT_POST_ID = '07caa51c-695b-4605-9a3d-24f2688551c0';
const PILOT_SLUG = 'best-scholarship-websites';
const EXPECTED_CATEGORY = 'ai';

const writeMode = process.argv.includes('--write');

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function countInternalHref(html: string): number {
  const re = /href=["'](\/(?:scholarships|resources)[^"']*)["']/gi;
  return [...html.matchAll(re)].length;
}

async function loadClassification(slug: string): Promise<string | null> {
  const p = path.join(process.cwd(), 'data/resource-article-classification.json');
  const raw = await fs.readFile(p, 'utf8');
  const data = JSON.parse(raw) as Record<string, { categoryId?: string }>;
  return data[slug]?.categoryId ?? null;
}

async function main() {
  const supabase = createClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );

  const { data: post, error: postErr } = await supabase
    .from('content_posts')
    .select(
      'id, slug, status, title, meta_title, meta_description, excerpt, published_at, body_html'
    )
    .eq('id', PILOT_POST_ID)
    .maybeSingle();

  if (postErr) throw new Error(postErr.message);
  if (!post) throw new Error(`Post not found: ${PILOT_POST_ID}`);

  const { data: slugPublished, error: slugPubErr } = await supabase
    .from('content_posts')
    .select('id, slug, status')
    .eq('slug', PILOT_SLUG)
    .eq('status', 'published');

  if (slugPubErr) throw new Error(slugPubErr.message);

  const categoryId = await loadClassification(PILOT_SLUG);
  const internalLinks = countInternalHref(post.body_html ?? '');

  const preflight = {
    postExists: true,
    idMatch: post.id === PILOT_POST_ID,
    slugMatch: post.slug === PILOT_SLUG,
    status: post.status,
    statusOk: post.status === 'review_needed',
    categoryId,
    categoryOk: categoryId === EXPECTED_CATEGORY,
    hasTitle: Boolean(post.title?.trim()),
    hasMetaTitle: Boolean(post.meta_title?.trim()),
    hasMetaDescription: Boolean(post.meta_description?.trim()),
    hasExcerpt: Boolean(post.excerpt?.trim()),
    internalLinkCount: internalLinks,
    hasInternalLinks: internalLinks > 0,
    slugCollisionPublished: (slugPublished ?? []).filter((r) => r.id !== PILOT_POST_ID)
      .length,
    publishedAtBefore: post.published_at
  };

  console.log(JSON.stringify({ phase: 'preflight', preflight }, null, 2));

  const failures: string[] = [];
  if (!preflight.idMatch) failures.push('id mismatch');
  if (!preflight.slugMatch) failures.push('slug mismatch');
  if (!preflight.statusOk) failures.push(`status is ${post.status}, expected review_needed`);
  if (!preflight.categoryOk) failures.push(`category ${categoryId}, expected ${EXPECTED_CATEGORY}`);
  if (!preflight.hasTitle) failures.push('missing title');
  if (!preflight.hasMetaTitle) failures.push('missing meta_title');
  if (!preflight.hasMetaDescription) failures.push('missing meta_description');
  if (!preflight.hasExcerpt) failures.push('missing excerpt');
  if (!preflight.hasInternalLinks) failures.push('no internal links in body_html');
  if (preflight.slugCollisionPublished > 0) failures.push('published slug collision');

  if (failures.length) {
    console.error(JSON.stringify({ phase: 'preflight', ok: false, failures }, null, 2));
    process.exit(1);
  }

  const dryRunUpdate = {
    filter: { id: PILOT_POST_ID, slug: PILOT_SLUG, status: 'review_needed' },
    patch: {
      status: 'published' as const,
      published_at: '<now ISO>',
      updated_at: '<now ISO>'
    },
    rowsExpected: 1
  };

  if (!writeMode) {
    console.log(
      JSON.stringify(
        {
          phase: 'dry-run',
          ok: true,
          message: 'Would update exactly 1 row',
          dryRunUpdate
        },
        null,
        2
      )
    );
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
    .eq('id', PILOT_POST_ID)
    .eq('slug', PILOT_SLUG)
    .eq('status', 'review_needed')
    .select('id, slug, status, published_at');

  if (updErr) throw new Error(updErr.message);

  const rowCount = updated?.length ?? 0;
  console.log(
    JSON.stringify(
      {
        phase: 'write',
        rowsUpdated: rowCount,
        updated: updated ?? []
      },
      null,
      2
    )
  );

  if (rowCount !== 1) {
    console.error(`Expected 1 row updated, got ${rowCount}`);
    process.exit(1);
  }

  const { data: after, error: afterErr } = await supabase
    .from('content_posts')
    .select('id, slug, status, published_at')
    .eq('id', PILOT_POST_ID)
    .maybeSingle();

  if (afterErr) throw new Error(afterErr.message);

  console.log(JSON.stringify({ phase: 'verify', after }, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
