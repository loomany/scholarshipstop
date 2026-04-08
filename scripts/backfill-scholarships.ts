/**
 * Backfill public canonical URLs into the Google Indexing pending queue.
 *
 * Includes:
 * - scholarships -> `/scholarships/{slug|id}`
 * - articles -> `/resources/{slug}`
 * - providers -> `/providers/{slug}`
 *
 * Default: dry-run. No queue writes happen unless `--apply` is provided.
 *
 *   npx tsx scripts/backfill-scholarships.ts
 *   npx tsx scripts/backfill-scholarships.ts --apply
 */

import fs from 'fs';
import path from 'path';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

const ROOT = path.resolve(__dirname, '..');
const PAGE_SIZE = 500;
const QUEUE_PATH = path.join(ROOT, 'data', 'google-indexing-queue.json');
const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type QueueKind = 'scholarship' | 'resource' | 'provider';

type ScholarshipQueueRow = Pick<
  Database['public']['Tables']['scholarships']['Row'],
  'id' | 'slug' | 'is_active' | 'is_indexable'
>;

type ArticleQueueRow = Pick<
  Database['public']['Tables']['content_posts']['Row'],
  'id' | 'slug' | 'status'
>;

type ProviderQueueRow = Pick<
  Database['public']['Tables']['providers']['Row'],
  'id' | 'slug'
>;

type QueueItem = {
  url: string;
  kind: QueueKind;
  notificationType: 'URL_UPDATED' | 'URL_DELETED';
  source: string;
  status: 'pending' | 'sent' | 'error';
  enqueuedAt: string;
  lastAttemptAt?: string;
  sentAt?: string;
  attemptCount: number;
  lastError?: string;
};

type QueueEntry = {
  url: string;
  kind: QueueKind;
};

function loadEnvFiles() {
  for (const name of ['.env', '.env.local']) {
    const filePath = path.join(ROOT, name);
    if (!fs.existsSync(filePath)) continue;
    const text = fs.readFileSync(filePath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

function parseArgs() {
  const argv = process.argv.slice(2);
  return {
    apply: argv.includes('--apply')
  };
}

function getSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) {
    throw new Error(
      'Missing NEXT_PUBLIC_SITE_URL. Set it before running this script so canonical URLs use the correct site origin.'
    );
  }

  const withoutTrailingSlash = raw.replace(/\/+$/, '');
  return withoutTrailingSlash.startsWith('http')
    ? withoutTrailingSlash
    : `https://${withoutTrailingSlash}`;
}

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const key = serviceRoleKey || anonKey;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and a Supabase key. Set SUPABASE_SERVICE_ROLE_KEY for a full backfill, or NEXT_PUBLIC_SUPABASE_ANON_KEY for public rows only.'
    );
  }

  if (!serviceRoleKey) {
    console.warn(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Results may be limited by RLS, so this may not include every eligible row.'
    );
  }

  return createClient<Database>(url, key);
}

function scholarshipPath(input: Pick<ScholarshipQueueRow, 'id' | 'slug'>): string {
  const slug = input.slug?.trim();
  if (slug && !UUID_LIKE.test(slug)) {
    return `/scholarships/${encodeURIComponent(slug)}`;
  }
  return `/scholarships/${input.id}`;
}

function articlePath(slug: string): string {
  return `/resources/${encodeURIComponent(slug.trim())}`;
}

function providerPath(slug: string): string {
  return `/providers/${encodeURIComponent(slug.trim())}`;
}

function canonicalUrl(siteOrigin: string, relativePath: string): string {
  return `${siteOrigin}${relativePath}`;
}

function readQueue(): QueueItem[] {
  try {
    const raw = fs.readFileSync(QUEUE_PATH, 'utf8');
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as QueueItem[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueueItem[]) {
  fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
  fs.writeFileSync(QUEUE_PATH, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
}

function queueKey(url: string, notificationType = 'URL_UPDATED'): string {
  return `${notificationType}:${url}`;
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

async function fetchAllScholarships(
  supabase: ReturnType<typeof createSupabaseClient>
): Promise<ScholarshipQueueRow[]> {
  const rows: ScholarshipQueueRow[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('scholarships')
      .select('id, slug, is_active, is_indexable')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Supabase scholarship query failed: ${error.message}`);
    }

    const batch = (data ?? []) as ScholarshipQueueRow[];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchAllArticles(
  supabase: ReturnType<typeof createSupabaseClient>
): Promise<ArticleQueueRow[]> {
  const rows: ArticleQueueRow[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('content_posts')
      .select('id, slug, status')
      .eq('status', 'published')
      .not('slug', 'is', null)
      .neq('slug', '')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Supabase content_posts query failed: ${error.message}`);
    }

    const batch = (data ?? []) as ArticleQueueRow[];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchAllProviders(
  supabase: ReturnType<typeof createSupabaseClient>
): Promise<ProviderQueueRow[]> {
  const rows: ProviderQueueRow[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('providers')
      .select('id, slug')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Supabase providers query failed: ${error.message}`);
    }

    const batch = (data ?? []) as ProviderQueueRow[];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

function buildMixedEntries(input: {
  siteOrigin: string;
  scholarships: ScholarshipQueueRow[];
  articles: ArticleQueueRow[];
  providers: ProviderQueueRow[];
}): QueueEntry[] {
  const entries: QueueEntry[] = [];

  for (const row of input.scholarships) {
    if (!row.id?.trim()) continue;
    entries.push({
      url: canonicalUrl(input.siteOrigin, scholarshipPath(row)),
      kind: 'scholarship'
    });
  }

  for (const row of input.articles) {
    const slug = row.slug?.trim();
    if (!slug) continue;
    entries.push({
      url: canonicalUrl(input.siteOrigin, articlePath(slug)),
      kind: 'resource'
    });
  }

  for (const row of input.providers) {
    const slug = row.slug?.trim();
    if (!slug) continue;
    entries.push({
      url: canonicalUrl(input.siteOrigin, providerPath(slug)),
      kind: 'provider'
    });
  }

  const deduped = new Map<string, QueueEntry>();
  for (const entry of entries) {
    deduped.set(queueKey(entry.url), entry);
  }
  return Array.from(deduped.values());
}

function queueImpact(entries: QueueEntry[], existing: QueueItem[]) {
  const keys = new Set(existing.map((item) => queueKey(item.url, item.notificationType)));
  let newUrls = 0;
  let requeuedUrls = 0;

  for (const entry of entries) {
    if (keys.has(queueKey(entry.url))) {
      requeuedUrls += 1;
    } else {
      newUrls += 1;
    }
  }

  return { newUrls, requeuedUrls };
}

function applyMixedQueue(entries: QueueEntry[], source: string) {
  const existing = readQueue();
  const byKey = new Map(existing.map((item) => [queueKey(item.url, item.notificationType), item]));
  const now = new Date().toISOString();
  const shuffled = shuffleInPlace([...entries]);
  const touchedKeys = new Set<string>();
  const nextItems: QueueItem[] = [];

  for (const entry of shuffled) {
    const key = queueKey(entry.url);
    const prev = byKey.get(key);
    touchedKeys.add(key);
    nextItems.push({
      url: entry.url,
      kind: entry.kind,
      notificationType: 'URL_UPDATED',
      source,
      status: 'pending',
      enqueuedAt: now,
      attemptCount: prev?.attemptCount ?? 0,
      ...(prev?.lastAttemptAt ? { lastAttemptAt: prev.lastAttemptAt } : {}),
      ...(prev?.sentAt ? { sentAt: prev.sentAt } : {})
    });
  }

  for (const item of existing) {
    if (touchedKeys.has(queueKey(item.url, item.notificationType))) continue;
    nextItems.push(item);
  }

  writeQueue(nextItems);

  return {
    enqueued: shuffled.length,
    total: nextItems.length,
    shuffled
  };
}

async function main() {
  loadEnvFiles();
  const { apply } = parseArgs();
  const siteOrigin = getSiteOrigin();
  const supabase = createSupabaseClient();

  const [scholarships, articles, providers] = await Promise.all([
    fetchAllScholarships(supabase),
    fetchAllArticles(supabase),
    fetchAllProviders(supabase)
  ]);

  const entries = buildMixedEntries({
    siteOrigin,
    scholarships,
    articles,
    providers
  });
  const shuffledPreview = shuffleInPlace([...entries]);
  const existingQueue = readQueue();
  const impact = queueImpact(entries, existingQueue);

  const scholarshipCount = entries.filter((entry) => entry.kind === 'scholarship').length;
  const articleCount = entries.filter((entry) => entry.kind === 'resource').length;
  const providerCount = entries.filter((entry) => entry.kind === 'provider').length;

  const activeCount = scholarships.filter((row) => row.is_active === true).length;
  const indexableCount = scholarships.filter((row) => row.is_indexable !== false).length;
  const activeAndIndexableCount = scholarships.filter(
    (row) => row.is_active === true && row.is_indexable !== false
  ).length;

  console.log('=== mixed indexing queue backfill ===\n');
  console.log(`site origin: ${siteOrigin}`);
  console.log(`scholarship rows fetched: ${scholarships.length}`);
  console.log(`article rows fetched: ${articles.length}`);
  console.log(`provider rows fetched: ${providers.length}`);
  console.log('');
  console.log(`unique scholarship URLs: ${scholarshipCount}`);
  console.log(`unique article URLs: ${articleCount}`);
  console.log(`unique provider URLs: ${providerCount}`);
  console.log(`unique total URLs: ${entries.length}`);
  console.log('');
  console.log(`scholarship active rows: ${activeCount}`);
  console.log(`scholarship indexable rows: ${indexableCount}`);
  console.log(`scholarship active + indexable rows: ${activeAndIndexableCount}`);
  console.log('');
  console.log(
    `queue impact: ${impact.newUrls} new, ${impact.requeuedUrls} existing URL(s) will be reset to pending`
  );
  console.log('queue write order: scholarship/article/provider URLs are shuffled into one mixed batch');
  console.log('');

  if (shuffledPreview.length > 0) {
    console.log('sample shuffled URLs:');
    for (const entry of shuffledPreview.slice(0, 8)) {
      console.log(`  [${entry.kind}] ${entry.url}`);
    }
    if (shuffledPreview.length > 8) {
      console.log(`  ... and ${shuffledPreview.length - 8} more`);
    }
    console.log('');
  }

  if (!apply) {
    console.log(
      'Dry run only. Re-run with `npx tsx scripts/backfill-scholarships.ts --apply` to write the mixed queue to data/google-indexing-queue.json.'
    );
    return;
  }

  const result = applyMixedQueue(entries, 'script:backfill-scholarships');
  console.log(
    `Applied. Google indexing queue: +${result.enqueued} URL(s), total queued ${result.total}.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
