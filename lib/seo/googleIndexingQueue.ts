import { JWT } from 'google-auth-library';

import type { Database } from '@/types_db';
import { resourcesArticlePath } from '@/lib/content-hub/resourcesSection';
import { buildProviderProfileScholarshipsHref } from '@/lib/providers/providerProfilePagination';
import { SEO_ROUTE_STATE_SLUG_TO_CODE } from '@/lib/scholarships/seoTags/routeSegmentMaps';
import { scholarshipPublicPath } from '@/app/scholarships/scholarshipsData';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import { getURL } from '@/utils/helpers';

export type GoogleIndexingContentKind =
  | 'scholarship'
  | 'resource'
  | 'provider'
  | 'essay'
  | 'page';

export type GoogleIndexingNotificationType = 'URL_UPDATED' | 'URL_DELETED';
export type GoogleIndexingQuotaLane = 'immediate' | 'queue';
export type GoogleIndexingQuotaBucket =
  | 'scholarship'
  | 'resource'
  | 'provider'
  | 'essay'
  | 'page';

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
const NON_SCHOLARSHIP_BUCKETS: GoogleIndexingQuotaBucket[] = [
  'resource',
  'provider',
  'essay',
  'page'
];

/** Default matches GCP Indexing API quota (200 publish requests/day per project). */
function maxPublishPerDay(): number {
  const raw = process.env.GOOGLE_INDEXING_MAX_PUBLISH_PER_DAY?.trim();
  if (!raw) return 200;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 200;
  return Math.min(Math.floor(n), 50_000);
}

function parsePercent(value: string | undefined, fallback: number): number {
  const n = Number(value ?? '');
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.floor(n)));
}

function computeLaneCaps(total: number): Record<GoogleIndexingQuotaLane, number> {
  const immediateShare = parsePercent(
    process.env.GOOGLE_INDEXING_IMMEDIATE_SHARE_PERCENT,
    50
  );
  const immediate = Math.floor((total * immediateShare) / 100);
  return {
    immediate,
    queue: Math.max(0, total - immediate)
  };
}

function distributeEvenly(total: number, buckets: GoogleIndexingQuotaBucket[]) {
  const out: Record<GoogleIndexingQuotaBucket, number> = {
    scholarship: 0,
    resource: 0,
    provider: 0,
    essay: 0,
    page: 0
  };
  if (total <= 0 || buckets.length === 0) return out;
  const base = Math.floor(total / buckets.length);
  let remainder = total - base * buckets.length;
  for (const bucket of buckets) {
    out[bucket] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
  }
  return out;
}

function computeBucketCapsPerLane(
  laneCap: number,
  input?: { seoPagePriorityActive?: boolean }
): Record<GoogleIndexingQuotaBucket, number> {
  if (input?.seoPagePriorityActive) {
    const pageCap = Math.floor(laneCap / 2);
    return {
      scholarship: Math.floor(laneCap * 0.42),
      resource: Math.max(1, Math.floor(laneCap * 0.02)),
      provider: Math.max(1, Math.floor(laneCap * 0.02)),
      essay: Math.max(1, Math.floor(laneCap * 0.02)),
      page: pageCap
    };
  }

  const scholarshipShare = parsePercent(
    process.env.GOOGLE_INDEXING_SCHOLARSHIP_SHARE_PERCENT,
    80
  );
  const scholarshipCap = Math.floor((laneCap * scholarshipShare) / 100);
  const remaining = Math.max(0, laneCap - scholarshipCap);
  const distributed = distributeEvenly(remaining, NON_SCHOLARSHIP_BUCKETS);
  return {
    scholarship: scholarshipCap,
    resource: distributed.resource,
    provider: distributed.provider,
    essay: distributed.essay,
    page: distributed.page
  };
}

async function hasPendingSeoPageIndexingBacklog(
  admin: ReturnType<typeof createServiceRoleSupabaseClient>
): Promise<boolean> {
  if (!admin) return false;
  if (process.env.GOOGLE_INDEXING_SEO_PAGE_PRIORITY === '0') return false;
  const { count, error } = await admin
    .from('google_indexing_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .eq('content_kind', 'page');
  if (error) {
    console.error('[google-indexing] pending page backlog check', error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

function quotaBucketForKind(
  kind: GoogleIndexingContentKind | GoogleIndexingQuotaBucket | null | undefined
): GoogleIndexingQuotaBucket {
  if (!kind) return 'page';
  if (kind === 'scholarship') return 'scholarship';
  if (kind === 'resource') return 'resource';
  if (kind === 'provider') return 'provider';
  if (kind === 'essay') return 'essay';
  return 'page';
}

type ReserveIndexingSlotResult =
  | 'ok'
  | 'no_service_role'
  | 'rpc_error'
  | 'quota_exhausted';

/**
 * Reserves one publish slot in DB before calling Google (Pacific calendar day).
 * When SUPABASE_SERVICE_ROLE_KEY is unset, returns no_service_role so callers can still ping (local dev).
 */
async function tryReserveIndexingPublish(
  input: {
    lane: GoogleIndexingQuotaLane;
    bucket: GoogleIndexingQuotaBucket;
    admin?: ReturnType<typeof createServiceRoleSupabaseClient>;
  }
): Promise<ReserveIndexingSlotResult> {
  const client = input.admin ?? createServiceRoleSupabaseClient();
  if (!client) return 'no_service_role';
  const totalCap = maxPublishPerDay();
  const laneCaps = computeLaneCaps(totalCap);
  const seoPagePriorityActive = await hasPendingSeoPageIndexingBacklog(client);
  const bucketCaps = computeBucketCapsPerLane(laneCaps[input.lane], {
    seoPagePriorityActive
  });
  /**
   * Call `client.rpc(...)` on the client — do not assign `client.rpc` to a variable and invoke it,
   * or `this` is lost inside @supabase/supabase-js and you get `Cannot read properties of undefined (reading 'rest')`.
   * RPC name is not in generated `Database` types yet; narrow via assertion.
   */
  const { data, error } = await (
    client as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
    }
  ).rpc('google_indexing_try_consume_quota_bucket', {
    p_lane: input.lane,
    p_bucket: input.bucket,
    p_max_total: totalCap,
    p_max_lane: laneCaps[input.lane],
    p_max_bucket: bucketCaps[input.bucket]
  });
  if (error) {
    const { data: fallbackData, error: fallbackError } = await client.rpc(
      'google_indexing_try_consume_quota',
      {
        p_max: totalCap
      }
    );
    if (fallbackError) {
      console.error(
        '[google-indexing] quota RPC',
        error.message,
        '| fallback:',
        fallbackError.message
      );
      return 'rpc_error';
    }
    if (fallbackData === true) return 'ok';
    return 'quota_exhausted';
  }
  if (data === true) return 'ok';
  return 'quota_exhausted';
}

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

/**
 * One PostgreSQL `INSERT … ON CONFLICT (url)` batch must not list the same `url` twice.
 * `Set` is not enough: different strings can parse to the same URL (encoding, default port, etc.).
 */
function dedupeCanonicalIndexingUrls(urls: string[]): string[] {
  const byHref = new Map<string, string>();
  for (const u of urls) {
    try {
      const href = new URL(u).href;
      byHref.set(href, href);
    } catch {
      byHref.set(u, u);
    }
  }
  return [...byHref.values()];
}

function inferGoogleIndexingKindFromUrl(url: string): GoogleIndexingContentKind | null {
  try {
    const pathname = new URL(url).pathname.replace(/\/+$/, '');
    if (pathname.startsWith('/scholarships/')) {
      const parts = pathname.split('/').filter(Boolean);
      return parts.length === 2 ? 'scholarship' : 'page';
    }
    if (pathname.startsWith('/compare/')) return 'page';
    if (pathname.startsWith('/resources/')) return 'resource';
    if (pathname.startsWith('/providers/')) {
      const rest = pathname.slice('/providers/'.length);
      const seg = decodeURIComponent(rest.split('/')[0] ?? '')
        .trim()
        .toLowerCase();
      if (seg && SEO_ROUTE_STATE_SLUG_TO_CODE[seg]) {
        return 'page';
      }
      return 'provider';
    }
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
      skipped?:
        | 'invalid_url'
        | 'missing_credentials'
        | 'no_token'
        | 'daily_quota_exceeded'
        | 'quota_rpc_unavailable'
        /** URL is in google_indexing_queue only; cron flush will call the API in FIFO order. */
        | 'deferred_to_indexing_queue';
      status?: number;
      error?: string;
    };

/**
 * Sends one URL to Google Indexing API immediately (no DB queue).
 * Safe for ephemeral filesystems (e.g. Railway). Errors are logged; does not throw.
 * Publish volume is capped per Pacific day via `google_indexing_try_consume_quota` when service role is set.
 */
export async function pingGoogleIndexingDirect(
  url: string,
  notificationType: GoogleIndexingNotificationType = 'URL_UPDATED',
  kind?: GoogleIndexingContentKind
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

    const inferredKind = kind ?? inferGoogleIndexingKindFromUrl(normalized);
    const slot = await tryReserveIndexingPublish({
      lane: 'immediate',
      bucket: quotaBucketForKind(inferredKind)
    });
    if (slot === 'quota_exhausted') {
      await deferIndexingUrlWhenQuotaDeferred(
        normalized,
        notificationType,
        inferredKind
      );
      console.warn(
        `[google-indexing-direct] daily publish cap (${maxPublishPerDay()}/day) — URL queued, API not called`
      );
      return { ok: false, skipped: 'daily_quota_exceeded' };
    }
    if (slot === 'rpc_error') {
      return { ok: false, skipped: 'quota_rpc_unavailable' };
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
  // One INSERT … ON CONFLICT batch must not list the same conflict key twice.
  const uniqueUrls = dedupeCanonicalIndexingUrls([...new Set(normalizedUrls)]);
  if (uniqueUrls.length === 0) {
    return { ok: true, enqueued: 0, total: 0, pending: 0 };
  }

  const { data: existing } = await admin
    .from('google_indexing_queue')
    .select('url, attempt_count')
    .in('url', uniqueUrls);

  const prevAttempts = new Map(
    (existing ?? []).map((r) => [r.url, r.attempt_count as number])
  );

  const payload = uniqueUrls.map((url) => ({
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
    enqueued: uniqueUrls.length,
    total: totalCount ?? 0,
    pending: pendingCount ?? 0
  };
}

const FIFO_FRONT_ADDED_AT_MS_AGO = 365 * 24 * 60 * 60 * 1000;

/**
 * Moves URLs to the front of `flushGoogleIndexingQueue` FIFO order by setting `added_at`
 * well in the past. Only rows matching the normalized URLs are updated (does not touch other pending URLs).
 */
export async function prioritizeGoogleIndexingQueueUrls(input: {
  urls: string[];
  source: string;
  /** ISO timestamp for `added_at`; default ≈365 days ago */
  addedAt?: string;
}): Promise<{ ok: true; updated: number; normalizedUrls: string[] } | { ok: false; error: string }> {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return { ok: false, error: 'Server missing Supabase service role for indexing queue' };
  }

  const normalizedUrls = dedupeCanonicalIndexingUrls(
    input.urls.map(normalizeIndexingUrl).filter((value): value is string => Boolean(value))
  );
  if (normalizedUrls.length === 0) {
    return { ok: true, updated: 0, normalizedUrls: [] };
  }

  const added_at =
    input.addedAt ??
    new Date(Date.now() - FIFO_FRONT_ADDED_AT_MS_AGO).toISOString();

  const { data, error } = await admin
    .from('google_indexing_queue')
    .update({
      added_at,
      status: 'pending',
      source: input.source,
      lane: 'queue'
    })
    .in('url', normalizedUrls)
    .select('url');

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    updated: data?.length ?? 0,
    normalizedUrls
  };
}

export async function markGoogleIndexingUrlsProcessed(
  urls: string[],
  input?: { lastError?: string | null }
) {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    throw new Error('Server missing Supabase service role for indexing queue');
  }

  const normalizedUrls = dedupeCanonicalIndexingUrls(
    urls.map(normalizeIndexingUrl).filter((value): value is string => Boolean(value))
  );
  if (normalizedUrls.length === 0) return { ok: true, updated: 0 };

  const { error } = await admin
    .from('google_indexing_queue')
    .update({
      status: 'processed',
      last_error: input?.lastError ?? null
    })
    .in('url', normalizedUrls);

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true, updated: normalizedUrls.length };
}

export async function submitUrlsForImmediateIndexing(input: {
  urls: string[];
  kind: GoogleIndexingContentKind;
  notificationType?: GoogleIndexingNotificationType;
  source?: string;
  /**
   * When false, rows are only upserted into `google_indexing_queue` (FIFO by `added_at`);
   * `cron-google-indexing-flush` / flush worker sends them without competing for the immediate ping path.
   * Default true preserves historical behaviour (enqueue + try Google API now).
   */
  immediatePing?: boolean;
}) {
  const queueResult = await enqueueGoogleIndexingUrls(input);
  const results: Array<{
    url: string;
    ping: PingGoogleIndexingDirectResult;
  }> = [];

  const immediatePing = input.immediatePing !== false;

  if (!immediatePing) {
    for (const url of input.urls) {
      const normalized = normalizeIndexingUrl(url);
      results.push({
        url: normalized ?? url.trim(),
        ping: { ok: false, skipped: 'deferred_to_indexing_queue' }
      });
    }
    return {
      ...queueResult,
      results
    };
  }

  for (const url of input.urls) {
    const ping = await pingGoogleIndexingDirect(
      url,
      input.notificationType,
      input.kind
    );
    const normalized = normalizeIndexingUrl(url);
    if (normalized && ping.ok) {
      await markGoogleIndexingUrlsProcessed([normalized]);
    }
    results.push({
      url: normalized ?? url,
      ping
    });
  }

  return {
    ...queueResult,
    results
  };
}

async function deferIndexingUrlWhenQuotaDeferred(
  normalizedUrl: string,
  notificationType: GoogleIndexingNotificationType,
  kindHint?: GoogleIndexingContentKind | null
): Promise<void> {
  const kind = kindHint ?? inferGoogleIndexingKindFromUrl(normalizedUrl);
  if (!kind) return;
  try {
    await enqueueGoogleIndexingUrls({
      urls: [normalizedUrl],
      kind,
      notificationType,
      source: 'auto:quota-deferred'
    });
  } catch (e) {
    console.error('[google-indexing-direct] quota-deferred enqueue', e);
  }
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
    .select('id, url, notification_type, attempt_count, content_kind')
    .eq('status', 'pending')
    .or('lane.is.null,lane.eq.queue')
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
  let stoppedEarly: 'daily_quota' | 'quota_rpc' | null = null;

  for (const row of batch) {
    const notificationType = row.notification_type as GoogleIndexingNotificationType;
    const slot = await tryReserveIndexingPublish({
      lane: 'queue',
      bucket: quotaBucketForKind(
        (row.content_kind as GoogleIndexingContentKind | null) ??
          inferGoogleIndexingKindFromUrl(row.url)
      ),
      admin
    });
    if (slot === 'quota_exhausted') {
      console.warn(
        `[google-indexing-queue] daily publish cap (${maxPublishPerDay()}/day) — leaving remaining rows pending`
      );
      stoppedEarly = 'daily_quota';
      break;
    }
    if (slot === 'rpc_error') {
      stoppedEarly = 'quota_rpc';
      break;
    }

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
    ok: failed === 0 && stoppedEarly === null,
    processed: sent + failed,
    sent,
    failed,
    ...(stoppedEarly === 'daily_quota'
      ? { skipped: 'Daily publish quota reached (Pacific day); remaining URLs stay pending' }
      : stoppedEarly === 'quota_rpc'
        ? { skipped: 'Quota RPC unavailable (apply migration or check DB)' }
        : {})
  };
}
