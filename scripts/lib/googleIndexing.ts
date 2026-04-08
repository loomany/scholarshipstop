import fs from 'fs';
import path from 'path';

import { getURL } from '../../utils/helpers';

type ScriptGoogleIndexingKind = 'scholarship' | 'resource' | 'provider';

type ScriptGoogleIndexingItem = {
  url: string;
  kind: ScriptGoogleIndexingKind;
  notificationType: 'URL_UPDATED' | 'URL_DELETED';
  source: string;
  status: 'pending' | 'sent' | 'error';
  enqueuedAt: string;
  lastAttemptAt?: string;
  sentAt?: string;
  attemptCount: number;
  lastError?: string;
};

const QUEUE_PATH = path.join(process.cwd(), 'data', 'google-indexing-queue.json');

function readQueue(): ScriptGoogleIndexingItem[] {
  try {
    const raw = fs.readFileSync(QUEUE_PATH, 'utf8');
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ScriptGoogleIndexingItem[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: ScriptGoogleIndexingItem[]) {
  fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
  fs.writeFileSync(QUEUE_PATH, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
}

function scholarshipUrl(input: { id: string; slug?: string | null }): string {
  const slug = input.slug?.trim();
  return getURL(`/scholarships/${encodeURIComponent(slug || input.id)}`);
}

function resourceUrl(slug: string): string {
  return getURL(`/resources/${encodeURIComponent(slug.trim())}`);
}

function providerUrl(routeId: string): string {
  return getURL(`/providers/${encodeURIComponent(routeId.trim())}`);
}

function enqueueUrls(
  urls: string[],
  kind: ScriptGoogleIndexingKind,
  source: string
): { enqueued: number; total: number } {
  const queue = readQueue();
  const byKey = new Map(queue.map((item) => [`${item.notificationType}:${item.url}`, item]));
  const now = new Date().toISOString();
  let enqueued = 0;

  for (const url of urls) {
    if (!url.trim()) continue;
    const key = `URL_UPDATED:${url}`;
    byKey.set(key, {
      url,
      kind,
      notificationType: 'URL_UPDATED',
      source,
      status: 'pending',
      enqueuedAt: now,
      attemptCount: byKey.get(key)?.attemptCount ?? 0
    });
    enqueued += 1;
  }

  const items = Array.from(byKey.values()).sort((a, b) =>
    b.enqueuedAt.localeCompare(a.enqueuedAt)
  );
  writeQueue(items);

  return { enqueued, total: items.length };
}

export function enqueueScholarshipUrlsForScript(
  rows: Array<{ id: string; slug?: string | null }>,
  source: string
): { enqueued: number; total: number } {
  return enqueueUrls(
    rows.filter((row) => row.id?.trim()).map((row) => scholarshipUrl(row)),
    'scholarship',
    source
  );
}

export function enqueueResourceUrlsForScript(
  slugs: string[],
  source: string
): { enqueued: number; total: number } {
  return enqueueUrls(
    slugs.filter((slug) => slug.trim()).map((slug) => resourceUrl(slug)),
    'resource',
    source
  );
}

export function enqueueProviderUrlsForScript(
  routeIds: string[],
  source: string
): { enqueued: number; total: number } {
  return enqueueUrls(
    routeIds.filter((routeId) => routeId.trim()).map((routeId) => providerUrl(routeId)),
    'provider',
    source
  );
}
