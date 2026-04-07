/**
 * Sync data/seo-scholarship-routes.json with canonical paths from data/seo-pending-queue.json.
 *
 * For each queue URL → canonical path (same rules as lib/seo/seoDripFeed queueEntryToCanonicalPath):
 * - If the path exists in the manifest → patch quality flags + optional copy from AI JSON.
 * - If missing → insert a row built via buildDynamicEntryFromCanonicalPath + GOOD flags.
 *
 * Patches applied: qualityBucket "GOOD", indexable true, noindexNow false, canonicalTarget null,
 * reasonCodes ["good_route"].
 *
 *   npx tsx scripts/sync-manifest-with-queue.ts           # dry-run (no write)
 *   npx tsx scripts/sync-manifest-with-queue.ts --write
 */

import fs from 'fs';
import path from 'path';

import { queueEntryToCanonicalPath } from '../lib/seo/seoDripFeed';
import { buildDynamicEntryFromCanonicalPath } from '../lib/scholarships/seoScholarshipDynamicEntry';
import { deriveSeoIdFromCanonicalPath } from '../lib/scholarships/seoScholarshipId';
import type {
  SeoScholarshipRouteManifestEntry,
  SeoScholarshipRoutesManifest
} from '../lib/scholarships/seoScholarshipManifest';

const ROOT = path.join(__dirname, '..');
const QUEUE_PATH = path.join(ROOT, 'data', 'seo-pending-queue.json');
const MANIFEST_PATH = path.join(ROOT, 'data', 'seo-scholarship-routes.json');
const CONTENT_DIR = path.join(ROOT, 'data', 'seo-scholarship-content');

function loadQueueCanonicalPathsInOrder(): string[] {
  const raw = fs.readFileSync(QUEUE_PATH, 'utf8');
  if (!raw.trim()) return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`${QUEUE_PATH}: expected JSON array`);
  }
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
}

function readAiCopy(canonicalPath: string): {
  h1?: string;
  seo_title?: string;
  seo_description?: string;
} | null {
  const safe = canonicalPath.replace(/\//g, '__');
  const fp = path.join(CONTENT_DIR, `${safe}.json`);
  if (!fs.existsSync(fp)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(fp, 'utf8')) as Record<string, unknown>;
    const h1 = typeof j.h1 === 'string' ? j.h1.trim() : '';
    const seo_title = typeof j.seo_title === 'string' ? j.seo_title.trim() : '';
    const seo_description =
      typeof j.seo_description === 'string' ? j.seo_description.trim() : '';
    if (!h1 && !seo_title && !seo_description) return null;
    return {
      ...(h1 ? { h1 } : {}),
      ...(seo_title ? { seo_title } : {}),
      ...(seo_description ? { seo_description } : {})
    };
  } catch {
    return null;
  }
}

function mergeAiFallbacks(
  entry: SeoScholarshipRouteManifestEntry,
  canonicalPath: string
): SeoScholarshipRouteManifestEntry {
  const ai = readAiCopy(canonicalPath);
  if (!ai) return entry;
  return {
    ...entry,
    ...(ai.h1 ? { h1Fallback: ai.h1 } : {}),
    ...(ai.seo_title ? { metaTitleFallback: ai.seo_title } : {}),
    ...(ai.seo_description ? { metaDescriptionFallback: ai.seo_description } : {})
  };
}

function applyQueuePromotion(
  base: SeoScholarshipRouteManifestEntry,
  canonicalPath: string,
  nowIso: string
): SeoScholarshipRouteManifestEntry {
  const merged = mergeAiFallbacks(
    {
      ...base,
      canonicalPath,
      seoId: base.seoId ?? deriveSeoIdFromCanonicalPath(canonicalPath),
      indexable: true,
      qualityBucket: 'GOOD',
      noindexNow: false,
      canonicalTarget: null,
      reasonCodes: ['good_route'],
      lastEvaluatedAt: nowIso,
      source: base.source ?? 'auto',
      pageKind: base.pageKind ?? 'manifest'
    },
    canonicalPath
  );
  return merged;
}

function buildNewFromQueuePath(
  canonicalPath: string,
  nowIso: string
): SeoScholarshipRouteManifestEntry | null {
  const dynamic = buildDynamicEntryFromCanonicalPath(canonicalPath);
  if (!dynamic) return null;
  return applyQueuePromotion(dynamic, canonicalPath, nowIso);
}

function main() {
  const write = process.argv.includes('--write');
  const queuePaths = loadQueueCanonicalPathsInOrder();
  const queueSet = new Set(queuePaths);

  const rawManifest = fs.readFileSync(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(rawManifest) as SeoScholarshipRoutesManifest;
  if (!manifest.routes || !Array.isArray(manifest.routes)) {
    throw new Error(`${MANIFEST_PATH}: invalid manifest (missing routes[])`);
  }

  const nowIso = new Date().toISOString();
  const manifestPaths = new Set(manifest.routes.map((r) => r.canonicalPath));
  const queueInManifest = queuePaths.filter((p) => manifestPaths.has(p)).length;

  let added = 0;
  let updated = 0;
  const skipped: string[] = [];

  const nextRoutes: SeoScholarshipRouteManifestEntry[] = manifest.routes.map((row) => {
    if (!queueSet.has(row.canonicalPath)) return row;
    const promoted = applyQueuePromotion(row, row.canonicalPath, nowIso);
    updated += 1;
    return promoted;
  });

  const pathsInResult = new Set(nextRoutes.map((r) => r.canonicalPath));
  for (const p of queuePaths) {
    if (pathsInResult.has(p)) continue;
    const neo = buildNewFromQueuePath(p, nowIso);
    if (!neo) {
      skipped.push(p);
      continue;
    }
    nextRoutes.push(neo);
    pathsInResult.add(p);
    added += 1;
  }

  console.log('=== sync-manifest-with-queue ===\n');
  console.log(`Queue paths (unique): ${queuePaths.length}`);
  console.log(`Manifest routes before: ${manifest.routes.length}`);
  console.log(`Queue paths that already exist in manifest: ${queueInManifest}`);
  console.log(`Updated (patched in place): ${updated}`);
  console.log(`Added (queue only): ${added}`);
  if (skipped.length) {
    console.log(`Skipped (unparsable path / no tokens): ${skipped.length}`);
    console.log(skipped.slice(0, 15).map((s) => `  - ${s}`).join('\n'));
    if (skipped.length > 15) console.log(`  ... +${skipped.length - 15} more`);
  }
  console.log(`Manifest routes after: ${nextRoutes.length}`);

  if (!write) {
    console.log('\n(dry-run: pass --write to save seo-scholarship-routes.json)');
    return;
  }

  manifest.routes = nextRoutes;
  manifest.generatedAt = nowIso;
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nWrote ${MANIFEST_PATH}`);
}

main();
