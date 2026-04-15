/**
 * SEO drip: paths in `data/seo-pending-queue.json` go live in list order after `SEO_DRIP_START_DATE`.
 * Each hour-slot unlocks `SEO_PAGES_PER_HOUR` more URLs. Slots use **ceiling** elapsed time so the
 * first batch unlocks right after start (the old floor-hour model left the site at 0 URLs for a full hour).
 */
import fs from 'fs';
import path from 'path';

const QUEUE_REL = ['data', 'seo-pending-queue.json'] as const;
const MS_PER_HOUR = 3_600_000;

export type SeoDripFeedConfig = {
  startDate: Date;
  pagesPerHour: number;
};

function normalizeListingPath(p: string): string {
  return p
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase();
}

/**
 * Accepts full URL, `/scholarships/foo/bar`, or `foo/bar` (catalog path).
 */
export function queueEntryToCanonicalPath(entry: string): string | null {
  const raw = entry.trim();
  if (!raw) return null;

  if (raw.includes('://')) {
    try {
      const u = new URL(raw);
      const pathname = u.pathname.replace(/\/$/, '');
      const prefix = '/scholarships';
      if (pathname === prefix) return null;
      if (!pathname.startsWith(`${prefix}/`)) return null;
      const rest = pathname.slice(prefix.length + 1);
      return rest ? normalizeListingPath(rest) : null;
    } catch {
      return null;
    }
  }

  let pathname = raw.startsWith('/') ? raw : `/scholarships/${raw}`;
  pathname = pathname.replace(/\/$/, '');
  const prefix = '/scholarships';
  if (pathname === prefix) return null;
  if (!pathname.startsWith(`${prefix}/`)) return null;
  const rest = pathname.slice(prefix.length + 1);
  return rest ? normalizeListingPath(rest) : null;
}

function parseDripConfig(): SeoDripFeedConfig | null {
  const startRaw = process.env.SEO_DRIP_START_DATE?.trim();
  const perHourRaw = process.env.SEO_PAGES_PER_HOUR?.trim();
  if (!startRaw || perHourRaw === undefined || perHourRaw === '') return null;

  const startMs = Date.parse(startRaw);
  if (Number.isNaN(startMs)) return null;

  const pagesPerHour = Number(perHourRaw);
  if (!Number.isFinite(pagesPerHour) || pagesPerHour < 0) return null;

  return { startDate: new Date(startMs), pagesPerHour };
}

/** Whole UTC hours elapsed since start (0 until the first full hour has passed). */
export function fullUtcHoursSinceStart(start: Date, now: Date): number {
  const ms = now.getTime() - start.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / MS_PER_HOUR);
}

/**
 * Hour-sized buckets since `start` for drip limits: first bucket begins as soon as `now > start`
 * (ceil), so drip is not idle for a full clock hour after launch.
 */
export function dripHourSlotsElapsedForLimit(start: Date, now: Date): number {
  const ms = now.getTime() - start.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / MS_PER_HOUR);
}

function loadOrderedQueuePaths(): string[] {
  const abs = path.join(process.cwd(), ...QUEUE_REL);
  let raw: string;
  try {
    raw = fs.readFileSync(abs, 'utf8');
  } catch {
    return [];
  }
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (typeof item !== 'string') continue;
      const canon = queueEntryToCanonicalPath(item);
      if (!canon || seen.has(canon)) continue;
      seen.add(canon);
      out.push(canon);
    }
    return out;
  } catch {
    return [];
  }
}

/** Logs once when the Node server process starts (see root `instrumentation.ts`). */
export function logSeoQueueLoadedOnStartup(): void {
  const count = loadOrderedQueuePaths().length;
  console.log(`SEO Queue loaded: ${count} URLs found`);
}

export function isSeoDripFeedActive(): boolean {
  return parseDripConfig() != null;
}

export type SeoDripFeedSnapshot = {
  active: true;
  /** Max URLs allowed live (may exceed queue length). */
  limit: number;
  orderedQueue: string[];
  queuedPathSet: Set<string>;
  visiblePathSet: Set<string>;
};

export function getSeoDripFeedSnapshot(now = new Date()): SeoDripFeedSnapshot | { active: false } {
  const config = parseDripConfig();
  if (!config) return { active: false };

  const orderedQueue = loadOrderedQueuePaths();
  const { pagesPerHour } = config;
  const slots = dripHourSlotsElapsedForLimit(config.startDate, now);
  const limit =
    pagesPerHour <= 0 ? 0 : slots * pagesPerHour;
  const visibleList = orderedQueue.slice(0, Math.min(limit, orderedQueue.length));

  return {
    active: true,
    limit,
    orderedQueue,
    queuedPathSet: new Set(orderedQueue),
    visiblePathSet: new Set(visibleList)
  };
}

/**
 * Canonical scholarship listing paths (no leading slash) that are “live” for drip SEO.
 * Empty array when drip is disabled (caller should not gate on this).
 */
export function getVisibleSeoRoutes(now = new Date()): string[] {
  const snap = getSeoDripFeedSnapshot(now);
  if (!snap.active) return [];
  return [...snap.visiblePathSet].sort((a, b) => a.localeCompare(b));
}

/** Listing path is gated and not yet within the visible slice → hide from sitemap / block page. */
export function shouldBlockScholarshipListingForDrip(
  canonicalPath: string,
  now = new Date()
): boolean {
  const norm = normalizeListingPath(canonicalPath);
  const snap = getSeoDripFeedSnapshot(now);
  if (!snap.active) return false;
  if (!snap.queuedPathSet.has(norm)) return false;
  return !snap.visiblePathSet.has(norm);
}

/** When drip is off, always true. When on, manifest/long-tail paths not in the queue stay allowed. */
export function canonicalPathAllowedInSeoSitemap(
  canonicalPath: string,
  now = new Date()
): boolean {
  return !shouldBlockScholarshipListingForDrip(canonicalPath, now);
}
