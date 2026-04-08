import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { applyArticleMatchingToPost } from '@/lib/content-hub/articleScholarshipMatching/applyArticleMatchingToPost';
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
 * Manual/utility endpoint. For automatic publish-time runs use:
 * POST /api/internal/resources/on-content-post-published
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

  try {
    const result = await applyArticleMatchingToPost(
      supabase,
      post as Database['public']['Tables']['content_posts']['Row']
    );
    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
