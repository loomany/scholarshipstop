import 'server-only';

import fs from 'fs';
import path from 'path';
import { JWT } from 'google-auth-library';

import { resourcesArticlePath } from '@/lib/content-hub/resourcesSection';
import { buildProviderProfileScholarshipsHref } from '@/lib/providers/providerProfilePagination';
import { scholarshipPublicPath } from '@/app/scholarships/scholarshipsData';
import { getURL } from '@/utils/helpers';

export type GoogleIndexingContentKind =
  | 'scholarship'
  | 'resource'
  | 'provider';

export type GoogleIndexingNotificationType = 'URL_UPDATED' | 'URL_DELETED';

export type GoogleIndexingQueueItem = {
  url: string;
  kind: GoogleIndexingContentKind;
  notificationType: GoogleIndexingNotificationType;
  source: string;
  status: 'pending' | 'sent' | 'error';
  enqueuedAt: string;
  lastAttemptAt?: string;
  sentAt?: string;
  attemptCount: number;
  lastError?: string;
};

const GOOGLE_INDEXING_ENDPOINT =
  'https://indexing.googleapis.com/v3/urlNotifications:publish';

const QUEUE_REL = ['data', 'google-indexing-queue.json'] as const;

function queueFilePath(): string {
  return path.join(process.cwd(), ...QUEUE_REL);
}

function readGoogleIndexingQueue(): GoogleIndexingQueueItem[] {
  const abs = queueFilePath();
  try {
    const raw = fs.readFileSync(abs, 'utf8');
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is GoogleIndexingQueueItem =>
            Boolean(
              item &&
                typeof item === 'object' &&
                typeof (item as GoogleIndexingQueueItem).url === 'string'
            )
        )
      : [];
  } catch {
    return [];
  }
}

function writeGoogleIndexingQueue(items: GoogleIndexingQueueItem[]): void {
  const abs = queueFilePath();
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
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

function inferGoogleIndexingKindFromUrl(url: string): GoogleIndexingContentKind | null {
  try {
    const pathname = new URL(url).pathname.replace(/\/+$/, '');
    if (pathname.startsWith('/scholarships/')) return 'scholarship';
    if (pathname.startsWith('/resources/')) return 'resource';
    if (pathname.startsWith('/providers/')) return 'provider';
    return null;
  } catch {
    return null;
  }
}

function queueKey(item: {
  url: string;
  notificationType: GoogleIndexingNotificationType;
}): string {
  return `${item.notificationType}:${item.url}`;
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

export function getGoogleIndexingQueueSummary() {
  const items = readGoogleIndexingQueue();
  return {
    total: items.length,
    pending: items.filter((item) => item.status === 'pending').length,
    sent: items.filter((item) => item.status === 'sent').length,
    error: items.filter((item) => item.status === 'error').length,
    items
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

export function providerIndexingUrl(providerRouteId: string): string {
  return getURL(buildProviderProfileScholarshipsHref(providerRouteId, 1).replace(/#.*$/, ''));
}

export function addToIndexingQueue(
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

export function enqueueGoogleIndexingUrls(input: {
  urls: string[];
  kind: GoogleIndexingContentKind;
  notificationType?: GoogleIndexingNotificationType;
  source?: string;
}) {
  const notificationType = input.notificationType ?? 'URL_UPDATED';
  const source = input.source?.trim() || 'manual';
  const now = new Date().toISOString();
  const queue = readGoogleIndexingQueue();
  const byKey = new Map(queue.map((item) => [queueKey(item), item]));

  let enqueued = 0;

  for (const value of input.urls) {
    const normalized = normalizeIndexingUrl(value);
    if (!normalized) continue;
    const key = queueKey({ url: normalized, notificationType });
    const prev = byKey.get(key);
    const next: GoogleIndexingQueueItem = {
      url: normalized,
      kind: input.kind,
      notificationType,
      source,
      status: 'pending',
      enqueuedAt: now,
      attemptCount: prev?.attemptCount ?? 0,
      ...(prev?.lastAttemptAt ? { lastAttemptAt: prev.lastAttemptAt } : {}),
      ...(prev?.sentAt ? { sentAt: prev.sentAt } : {})
    };
    byKey.set(key, next);
    enqueued += 1;
  }

  const items = Array.from(byKey.values()).sort((a, b) =>
    b.enqueuedAt.localeCompare(a.enqueuedAt)
  );
  writeGoogleIndexingQueue(items);

  return {
    ok: true,
    enqueued,
    total: items.length,
    pending: items.filter((item) => item.status === 'pending').length
  };
}

export async function flushGoogleIndexingQueue(limit = 50) {
  const queue = readGoogleIndexingQueue();
  const pending = queue
    .filter((item) => item.status === 'pending')
    .slice(0, Math.max(1, Math.min(200, Math.floor(limit) || 50)));

  if (pending.length === 0) {
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
  const byKey = new Map(queue.map((item) => [queueKey(item), item]));

  for (const item of pending) {
    const now = new Date().toISOString();
    try {
      const response = await fetch(GOOGLE_INDEXING_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: item.url,
          type: item.notificationType
        })
      });

      const next = byKey.get(queueKey(item));
      if (!next) continue;

      next.lastAttemptAt = now;
      next.attemptCount += 1;

      if (!response.ok) {
        failed += 1;
        next.status = 'error';
        next.lastError = await response.text();
        continue;
      }

      sent += 1;
      next.status = 'sent';
      next.sentAt = now;
      delete next.lastError;
    } catch (error) {
      const next = byKey.get(queueKey(item));
      if (!next) continue;
      failed += 1;
      next.status = 'error';
      next.lastAttemptAt = now;
      next.attemptCount += 1;
      next.lastError = error instanceof Error ? error.message : String(error);
    }
  }

  const items = Array.from(byKey.values()).sort((a, b) =>
    b.enqueuedAt.localeCompare(a.enqueuedAt)
  );
  writeGoogleIndexingQueue(items);

  return {
    ok: failed === 0,
    processed: pending.length,
    sent,
    failed
  };
}
