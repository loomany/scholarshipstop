import { NextResponse } from 'next/server';

import { sendTelegramResourceNotification } from '@/lib/telegram/notifyResources';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import type { Database } from '@/types_db';

export const dynamic = 'force-dynamic';

type ContentPostRow = Database['public']['Tables']['content_posts']['Row'];

function getNotifySecret() {
  return (
    process.env.TELEGRAM_RESOURCE_NOTIFY_SECRET?.trim() ||
    process.env.CONTENT_ARTICLE_MATCH_SECRET?.trim() ||
    ''
  );
}

/** When false (0/false/no/off), publish webhooks skip Telegram entirely (users/admins get no article cards). */
function isResourcePublishTelegramNotifyEnabled(): boolean {
  const v = process.env.TELEGRAM_RESOURCE_PUBLISH_NOTIFY_ENABLED?.trim().toLowerCase();
  if (!v) return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  return true;
}

function isAuthorized(request: Request) {
  const secret = getNotifySecret();
  if (!secret) return false;
  const auth = request.headers.get('authorization')?.trim();
  return auth === `Bearer ${secret}`;
}

function shouldNotifyPublish(params: {
  record: Partial<ContentPostRow> | null | undefined;
  oldRecord: Partial<ContentPostRow> | null | undefined;
  type?: string;
}): boolean {
  const { record, oldRecord, type } = params;
  if (!record?.slug?.trim()) return false;
  if (record.status !== 'published') return false;

  if (type === 'INSERT') return true;
  if (type === 'UPDATE') {
    if (oldRecord == null) return false;
    return oldRecord.status !== 'published';
  }
  return true;
}

/**
 * POST /api/internal/resources/notify-published
 * Authorization: Bearer ${TELEGRAM_RESOURCE_NOTIFY_SECRET} (or CONTENT_ARTICLE_MATCH_SECRET fallback)
 *
 * Optional: TELEGRAM_RESOURCE_PUBLISH_NOTIFY_ENABLED=0 disables Telegram for this endpoint (DB trigger still 200).
 * Optional: set TELEGRAM_RESOURCES_BROADCAST_ALL=1 to DM every bot user who used /start
 * (`telegram_users.last_bot_started_at` set). Throttle with TELEGRAM_RESOURCES_SEND_DELAY_MS (default 40).
 *
 * Call from Supabase Database Webhook on `content_posts` (INSERT/UPDATE) or manually:
 * `{ "slug": "my-article" }` | `{ "postId": "uuid" }`
 *
 * Supabase webhook-style body is also accepted:
 * `{ "type": "INSERT", "table": "content_posts", "record": {...}, "old_record": {...} }`
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isResourcePublishTelegramNotifyEnabled()) {
    return NextResponse.json({
      ok: true,
      skipped: 'telegram_publish_notifications_disabled'
    });
  }

  const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const supabase = createServiceRoleSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Server missing Supabase service role client' },
      { status: 500 }
    );
  }

  let post: ContentPostRow | null = null;

  const table =
    typeof raw.table === 'string' ? raw.table : typeof raw.table_name === 'string' ? raw.table_name : null;
  const webhookType = typeof raw.type === 'string' ? raw.type : null;
  const record = raw.record as Partial<ContentPostRow> | undefined;
  const oldRecord = (raw.old_record ?? raw.oldRecord) as Partial<ContentPostRow> | undefined;

  if (table === 'content_posts' && record && webhookType) {
    if (!shouldNotifyPublish({ record, oldRecord, type: webhookType })) {
      return NextResponse.json({ ok: true, skipped: 'not_a_publish_event' });
    }
    const id = record.id;
    if (typeof id === 'string' && id) {
      const { data } = await supabase.from('content_posts').select('*').eq('id', id).maybeSingle();
      post = data ?? null;
    } else if (record.slug?.trim()) {
      const { data } = await supabase
        .from('content_posts')
        .select('*')
        .eq('slug', record.slug.trim())
        .maybeSingle();
      post = data ?? null;
    }
  }

  const postId = typeof raw.postId === 'string' ? raw.postId.trim() : '';
  const slugDirect = typeof raw.slug === 'string' ? raw.slug.trim() : '';

  if (!post && postId) {
    const { data } = await supabase.from('content_posts').select('*').eq('id', postId).maybeSingle();
    post = data ?? null;
  }
  if (!post && slugDirect) {
    const { data } = await supabase.from('content_posts').select('*').eq('slug', slugDirect).maybeSingle();
    post = data ?? null;
  }

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  if (post.status !== 'published' || !post.slug?.trim()) {
    return NextResponse.json({ ok: true, skipped: 'not_published_or_no_slug' });
  }

  const ok = await sendTelegramResourceNotification({
    title: post.title ?? 'Article',
    description: post.meta_description,
    image_url: post.cover_image_url,
    slug: post.slug.trim()
  });

  if (!ok) {
    return NextResponse.json({ error: 'Telegram send failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, slug: post.slug });
}
