import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { runArticleScholarshipMatchingPipeline } from '@/lib/content-hub/articleScholarshipMatching';
import { enqueueGoogleIndexingUrls, resourceIndexingUrl } from '@/lib/seo/googleIndexingQueue';
import type { Database } from '@/types_db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/internal/resources/apply-article-matching
 * Header: Authorization: Bearer ${CONTENT_ARTICLE_MATCH_SECRET}
 * Body: { "postId": "uuid" } | { "slug": "article-slug" }
 *
 * Loads the row, runs deterministic matching, writes body_html, related_scholarships,
 * article_match_diagnostics, and clears legacy scholarship_links.
 *
 * Not invoked automatically from this repo: call after publish (cron, CMS webhook, or manual).
 * Legacy alias: POST /api/internal/content-hub/apply-article-matching
 */
export async function POST(request: Request) {
  const secret = process.env.CONTENT_ARTICLE_MATCH_SECRET?.trim();
  const auth = request.headers.get('authorization')?.trim();
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: 'Server missing Supabase URL or service role key' },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    postId?: string;
    slug?: string;
  } | null;
  if (!body?.postId?.trim() && !body?.slug?.trim()) {
    return NextResponse.json(
      { error: 'Body must include postId or slug' },
      { status: 400 }
    );
  }

  const supabase = createClient<Database>(url, serviceKey);
  const { data: post, error: loadErr } = body.postId?.trim()
    ? await supabase
        .from('content_posts')
        .select('*')
        .eq('id', body.postId.trim())
        .maybeSingle()
    : await supabase
        .from('content_posts')
        .select('*')
        .eq('slug', body.slug!.trim())
        .maybeSingle();
  if (loadErr) {
    return NextResponse.json({ error: loadErr.message }, { status: 500 });
  }
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const title = post.title?.trim() || 'Article';
  const bodyHtml = post.body_html?.trim() ?? '';
  if (!bodyHtml) {
    return NextResponse.json(
      { error: 'Post has empty body_html' },
      { status: 400 }
    );
  }

  try {
    const result = await runArticleScholarshipMatchingPipeline(supabase, {
      title,
      metaTitle: post.meta_title,
      metaDescription: post.meta_description,
      bodyHtml
    });

    const { error: upErr } = await supabase
      .from('content_posts')
      .update({
        body_html: result.bodyHtml,
        related_scholarships: result.relatedJson,
        article_match_diagnostics: result.diagnosticsJson,
        scholarship_links: null
      })
      .eq('id', post.id);

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    if (post.slug?.trim()) {
      enqueueGoogleIndexingUrls({
        kind: 'resource',
        urls: [resourceIndexingUrl(post.slug.trim())],
        source: 'internal:resources:apply-article-matching'
      });
    }

    return NextResponse.json({
      ok: true,
      postId: post.id,
      inlineLinksInserted: result.diagnostics.inlineLinksInserted,
      inlineFallbackUsed: result.diagnostics.inlineFallbackUsed,
      relatedCount: result.relatedScholarships.length
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
