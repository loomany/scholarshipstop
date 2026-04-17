import { JWT } from 'google-auth-library';

import type { Database } from '@/types_db';
import { resourcesArticlePath } from '@/lib/content-hub/resourcesSection';
import { buildProviderProfileScholarshipsHref } from '@/lib/providers/providerProfilePagination';
import { scholarshipPublicPath } from '@/app/scholarships/scholarshipsData';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import { getURL } from '@/utils/helpers';

export type GoogleIndexingContentKind =
  | 'scholarship'
  | 'resource'
  | 'provider'
  | 'essay';

export type GoogleIndexingNotificationType = 'URL_UPDATED' | 'URL_DELETED';

/** DB + legacy API shape for queue rows */
export type GoogleIndexingQueueItem = {
  id?: string;
  url: string;
  kind: GoogleIndexingContentKind | null;
  notificationType: GoogleIndexingNotificationType;
  source: string | null;
  /** DB: pending | processed | failed — legacy summaries map processed→sent, failed→error */
  status: 'pending' | 'processed' | 'failed' | 'sent' | 'error';
  enqueuedAt: string;
  attemptCount: number;
  lastError?: string | null;
};

const GOOGLE_INDEXING_ENDPOINT =
  'https://indexing.googleapis.com/v3/urlNotifications:publish';

function normalizeIndexingUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      return parsed.toString();
    } catch {
      return null;
    }
  }
  return getURL(raw.startsWith('/') ? raw : `/${raw}`);
}

function inferGoogleIndexingKindFromUrl(url: string): GoogleIndexingContentKind | null {
  try {
    const pathname = new URL(url).pathname.replace(/\/+$/, '');
    if (pathname.startsWith('/scholarships/')) return 'scholarship';
    if (pathname.startsWith('/resources/')) return 'resource';
    if (pathname.startsWith('/providers/')) return 'provider';
    if (pathname.startsWith('/essays/')) return 'essay';
    return null;
  } catch {
    return null;
  }
}

function googleIndexingJwt(): JWT | null {
  const email = process.env.GOOGLE_INDEXING_CLIENT_EMAIL?.trim();
  const rawKey = process.env.GOOGLE_INDEXING_PRIVATE_KEY?.trim();
  if (!email || !rawKey) return null;

  return new JWT({
    email,
    key: rawKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/indexing']
  });
}

export type PingGoogleIndexingDirectResult =
  | { ok: true; status: number }
  | {
      ok: false;
      skipped?: 'invalid_url' | 'missing_credentials' | 'no_token';
      status?: number;
      error?: string;
    };

/**
 * Sends one URL to Google Indexing API immediately (no DB queue).
 * Safe for ephemeral filesystems (e.g. Railway). Errors are logged; does not throw.
 */
export async function pingGoogleIndexingDirect(
  url: string,
  notificationType: GoogleIndexingNotificationType = 'URL_UPDATED'
): Promise<PingGoogleIndexingDirectResult> {
  const normalized = normalizeIndexingUrl(url);
  if (!normalized) {
    console.error('[google-indexing-direct] invalid URL:', url);
    return { ok: false, skipped: 'invalid_url' };
  }

  try {
    const client = googleIndexingJwt();
    if (!client) {
      console.error(
        '[google-indexing-direct] missing GOOGLE_INDEXING_CLIENT_EMAIL or GOOGLE_INDEXING_PRIVATE_KEY'
      );
      return { ok: false, skipped: 'missing_credentials' };
    }

    const accessToken = await client.getAccessToken();
    const token =
      typeof accessToken === 'string' ? accessToken : accessToken?.token ?? null;
    if (!token) {
      console.error('[google-indexing-direct] could not obtain access token');
      return { ok: false, skipped: 'no_token' };
    }

    const response = await fetch(GOOGLE_INDEXING_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: normalized,
        type: notificationType
      })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error(
        '[google-indexing-direct] API error',
        response.status,
        text
      );
      return { ok: false, status: response.status, error: text };
    }

    return { ok: true, status: response.status };
  } catch (error) {
    console.error('[google-indexing-direct]', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

type QueueRow = Database['public']['Tables']['google_indexing_queue']['Row'];

function rowToItem(row: QueueRow): GoogleIndexingQueueItem {
  const st = row.status;
  const legacyStatus =
    st === 'processed' ? 'sent' : st === 'failed' ? 'error' : 'pending';
  return {
    id: row.id,
    url: row.url,
    kind: row.content_kind as GoogleIndexingContentKind | null,
    notificationType: row.notification_type as GoogleIndexingNotificationType,
    source: row.source,
    status: legacyStatus,
    enqueuedAt: row.added_at,
    attemptCount: row.attempt_count,
    lastError: row.last_error
  };
}

export async function getGoogleIndexingQueueSummary() {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return {
      total: 0,
      pending: 0,
      sent: 0,
      error: 0,
      processed: 0,
      failed: 0,
      items: [] as GoogleIndexingQueueItem[]
    };
  }

  const [
    totalRes,
    pendingRes,
    processedRes,
    failedRes,
    rowsRes
  ] = await Promise.all([
    admin.from('google_indexing_queue').select('*', { count: 'exact', head: true }),
    admin
      .from('google_indexing_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('google_indexing_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'processed'),
    admin
      .from('google_indexing_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed'),
    admin
      .from('google_indexing_queue')
      .select('*')
      .order('added_at', { ascending: false })
      .limit(2000)
  ]);

  if (totalRes.error) {
    console.error('[google-indexing-queue] summary', totalRes.error.message);
    return {
      total: 0,
      pending: 0,
      sent: 0,
      error: 0,
      processed: 0,
      failed: 0,
      items: [] as GoogleIndexingQueueItem[]
    };
  }

  const list = rowsRes.data ?? [];
  if (rowsRes.error) {
    console.error('[google-indexing-queue] summary items', rowsRes.error.message);
  }

  const total = totalRes.count ?? 0;
  const pending = pendingRes.count ?? 0;
  const processed = processedRes.count ?? 0;
  const failed = failedRes.count ?? 0;

  return {
    total,
    pending,
    sent: processed,
    error: failed,
    processed,
    failed,
    items: list.map((r) => rowToItem(r as QueueRow))
  };
}

export function scholarshipIndexingUrl(input: {
  id: string;
  slug?: string | null;
}): string {
  return getURL(scholarshipPublicPath(input));
}

export function resourceIndexingUrl(slug: string): string {
  return getURL(resourcesArticlePath(slug));
}

export function essayIndexingUrl(slug: string): string {
  const s = slug.trim();
  return getURL(s ? `/essays/${encodeURIComponent(s)}` : '/essays');
}

export function providerIndexingUrl(providerRouteId: string): string {
  return getURL(buildProviderProfileScholarshipsHref(providerRouteId, 1).replace(/#.*$/, ''));
}

export async function addToIndexingQueue(
  url: string,
  input?: {
    kind?: GoogleIndexingContentKind;
    notificationType?: GoogleIndexingNotificationType;
    source?: string;
  }
) {
  const normalized = normalizeIndexingUrl(url);
  if (!normalized) {
    throw new Error('addToIndexingQueue: invalid URL');
  }

  const kind = input?.kind ?? inferGoogleIndexingKindFromUrl(normalized);
  if (!kind) {
    throw new Error(
      `addToIndexingQueue: could not infer content kind for URL "${normalized}"`
    );
  }

  return enqueueGoogleIndexingUrls({
    urls: [normalized],
    kind,
    notificationType: input?.notificationType,
    source: input?.source ?? 'auto:add-to-indexing-queue'
  });
}

export async function enqueueGoogleIndexingUrls(input: {
  urls: string[];
  kind: GoogleIndexingContentKind;
  notificationType?: GoogleIndexingNotificationType;
  source?: string;
}) {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    throw new Error('Server missing Supabase service role for indexing queue');
  }

  const notificationType = input.notificationType ?? 'URL_UPDATED';
  const source = input.source?.trim() || 'manual';
  const now = new Date().toISOString();

  const normalizedUrls: string[] = [];
  for (const value of input.urls) {
    const normalized = normalizeIndexingUrl(value);
    if (normalized) normalizedUrls.push(normalized);
  }
  if (normalizedUrls.length === 0) {
    return { ok: true, enqueued: 0, total: 0, pending: 0 };
  }

  const { data: existing } = await admin
    .from('google_indexing_queue')
    .select('url, attempt_count')
    .in('url', normalizedUrls);

  const prevAttempts = new Map(
    (existing ?? []).map((r) => [r.url, r.attempt_count as number])
  );

  const payload = normalizedUrls.map((url) => ({
    url,
    status: 'pending' as const,
    added_at: now,
    notification_type: notificationType,
    content_kind: input.kind,
    source,
    last_error: null as string | null,
    attempt_count: prevAttempts.get(url) ?? 0
  }));

  const { error } = await admin
    .from('google_indexing_queue')
    .upsert(payload, { onConflict: 'url' });

  if (error) {
    throw new Error(error.message);
  }

  const { count: pendingCount } = await admin
    .from('google_indexing_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: totalCount } = await admin
    .from('google_indexing_queue')
    .select('*', { count: 'exact', head: true });

  return {
    ok: true,
    enqueued: normalizedUrls.length,
    total: totalCount ?? 0,
    pending: pendingCount ?? 0
  };
}

export async function flushGoogleIndexingQueue(limit = 50) {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return {
      ok: false,
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 'Missing Supabase service role'
    };
  }

  const cap = Math.max(1, Math.min(200, Math.floor(limit) || 50));

  const { data: pending, error: selErr } = await admin
    .from('google_indexing_queue')
    .select('id, url, notification_type, attempt_count')
    .eq('status', 'pending')
    .order('added_at', { ascending: true })
    .limit(cap);

  if (selErr) {
    return {
      ok: false,
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: selErr.message
    };
  }

  const batch = pending ?? [];
  if (batch.length === 0) {
    return { ok: true, processed: 0, sent: 0, failed: 0, skipped: 'Queue empty' };
  }

  const client = googleIndexingJwt();
  if (!client) {
    return {
      ok: false,
      processed: 0,
      sent: 0,
      failed: 0,
      skipped:
        'Missing GOOGLE_INDEXING_CLIENT_EMAIL or GOOGLE_INDEXING_PRIVATE_KEY'
    };
  }

  const accessToken = await client.getAccessToken();
  const token =
    typeof accessToken === 'string' ? accessToken : accessToken?.token ?? null;
  if (!token) {
    return {
      ok: false,
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 'Could not obtain Google Indexing API access token'
    };
  }

  let sent = 0;
  let failed = 0;

  for (const row of batch) {
    const notificationType = row.notification_type as GoogleIndexingNotificationType;
    try {
      const response = await fetch(GOOGLE_INDEXING_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: row.url,
          type: notificationType
        })
      });

      const nextAttempts = (row.attempt_count ?? 0) + 1;

      if (!response.ok) {
        failed += 1;
        const errText = await response.text().catch(() => '');
        await admin
          .from('google_indexing_queue')
          .update({
            status: 'failed',
            last_error: errText.slice(0, 2000),
            attempt_count: nextAttempts
          })
          .eq('id', row.id);
        continue;
      }

      sent += 1;
      await admin
        .from('google_indexing_queue')
        .update({
          status: 'processed',
          last_error: null,
          attempt_count: nextAttempts
        })
        .eq('id', row.id);
    } catch (error) {
      failed += 1;
      await admin
        .from('google_indexing_queue')
        .update({
          status: 'failed',
          last_error:
            (error instanceof Error ? error.message : String(error)).slice(
              0,
              2000
            ),
          attempt_count: (row.attempt_count ?? 0) + 1
        })
        .eq('id', row.id);
    }
  }

  return {
    ok: failed === 0,
    processed: batch.length,
    sent,
    failed
  };
}
