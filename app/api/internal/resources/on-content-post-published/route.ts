import { NextResponse } from 'next/server';

import { applyArticleMatchingToPost } from '@/lib/content-hub/articleScholarshipMatching/applyArticleMatchingToPost';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import type { Database } from '@/types_db';

export const dynamic = 'force-dynamic';

type ContentPostRow = Database['public']['Tables']['content_posts']['Row'];
type ContentPostWebhookPayload = {
  type?: 'INSERT' | 'UPDATE' | 'DELETE';
  table?: string;
  schema?: string;
  record?: Partial<ContentPostRow> | null;
  old_record?: Partial<ContentPostRow> | null;
};

function hasRelevantPublishedChange(payload: ContentPostWebhookPayload): boolean {
  const record = payload.record;
  if (!record || record.status !== 'published') return false;

  const oldRecord = payload.old_record;
  if (!oldRecord) return true;
  if (oldRecord.status !== 'published') return true;

  return (
    (record.body_html ?? null) !== (oldRecord.body_html ?? null) ||
    (record.title ?? null) !== (oldRecord.title ?? null) ||
    (record.meta_title ?? null) !== (oldRecord.meta_title ?? null) ||
    (record.meta_description ?? null) !== (oldRecord.meta_description ?? null)
  );
}

/**
 * POST /api/internal/resources/on-content-post-published
 * Header: Authorization: Bearer ${CONTENT_ARTICLE_MATCH_SECRET}
 *
 * Intended for a DB webhook on `public.content_posts` INSERT/UPDATE events.
 * Runs article scholarship matching as soon as a post becomes published (or
 * published content changes), so `/resources/[slug]` is already ready for the
 * first visitor.
 */
export async function POST(request: Request) {
  const secret = process.env.CONTENT_ARTICLE_MATCH_SECRET?.trim();
  const auth = request.headers.get('authorization')?.trim();
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | ContentPostWebhookPayload
    | null;
  if (!payload) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (payload.table && payload.table !== 'content_posts') {
    return NextResponse.json({ ok: true, skipped: 'non-content_posts event' });
  }

  if (!hasRelevantPublishedChange(payload)) {
    return NextResponse.json({
      ok: true,
      skipped: 'event is not a publish transition or published content change'
    });
  }

  const postId = payload.record?.id?.trim();
  if (!postId) {
    return NextResponse.json(
      { error: 'Webhook payload missing record.id' },
      { status: 400 }
    );
  }

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Server missing Supabase URL or service role key' },
      { status: 500 }
    );
  }

  const { data: post, error: loadErr } = await admin
    .from('content_posts')
    .select('*')
    .eq('id', postId)
    .eq('status', 'published')
    .maybeSingle();

  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 });
  if (!post) return NextResponse.json({ ok: true, skipped: 'post not found/published' });

  try {
    const result = await applyArticleMatchingToPost(admin, post as ContentPostRow);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
