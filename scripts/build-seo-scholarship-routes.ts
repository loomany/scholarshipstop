/**
 * Data-driven SEO manifest builder for /scholarships/[[...slugPath]].
 *
 * Discovers candidates from the live USA matches catalog, scores them, dedupes by
 * canonical path, merges with existing manifest (preserving manual rows), and
 * optionally writes data/seo-scholarship-routes.json.
 *
 *   npx tsx scripts/build-seo-scholarship-routes.ts --dry-run --json=data/scholarships.json
 *   SCHOLARSHIPS_JSON_URL=https://host/api/scholarships npx tsx scripts/build-seo-scholarship-routes.ts --dry-run
 *   npx tsx scripts/build-seo-scholarship-routes.ts --write
 *   npx tsx scripts/build-seo-scholarship-routes.ts --write --prune-stale-auto
 *   npx tsx scripts/build-seo-scholarship-routes.ts --only=high-priority
 *
 * Each merged route gets a stable `seoId` (deterministic from `canonicalPath`) via
 * `refreshManifestEntryDerived` for dedupe checks and audits.
 */

import fs from 'fs';
import path from 'path';

import type { Scholarship } from '../app/scholarships/scholarshipsData';
import {
  buildSeoScholarshipAutoCandidates,
  finalizeManifestRouteQuality,
  refreshManifestEntryDerived
} from '../lib/scholarships/seoScholarshipCandidateBuilder';
import {
  bumpManifestMeta,
  mergeSeoManifestRoutes
} from '../lib/scholarships/seoScholarshipManifestMerge';
import type {
  SeoScholarshipRouteManifestEntry,
  SeoScholarshipRoutesManifest
} from '../lib/scholarships/seoScholarshipManifest';
import { fetchActiveScholarshipsForScript } from '../lib/scholarships/supabase';
import { fetchScholarshipsCatalogFromUrl } from './scholarshipsApiCatalog';

const ROOT = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'data', 'seo-scholarship-routes.json');

async function loadScholarships(): Promise<Scholarship[]> {
  const jsonArg = process.argv
    .find((a) => a.startsWith('--json='))
    ?.slice('--json='.length);
  if (jsonArg) {
    const p = path.isAbsolute(jsonArg)
      ? jsonArg
      : path.join(ROOT, jsonArg);
    const raw = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) throw new Error('expected array');
    return data as Scholarship[];
  }

  const url =
    process.env.SCHOLARSHIPS_JSON_URL ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') + '/api/scholarships';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (supabaseUrl && supabaseKey) {
    return fetchActiveScholarshipsForScript();
  }
  if (!url || url.endsWith('undefined/api/scholarships')) {
    console.error(
      'Use --json=relative/or/absolute/path.json, or set SCHOLARSHIPS_JSON_URL / NEXT_PUBLIC_SITE_URL, or set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
    process.exit(1);
  }
  return fetchScholarshipsCatalogFromUrl(url);
}

function summarizeDrops(
  drops: Array<{ reason: string }>
): Record<string, number> {
  const m: Record<string, number> = {};
  for (const d of drops) {
    m[d.reason] = (m[d.reason] ?? 0) + 1;
  }
  return m;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const write = process.argv.includes('--write');
  const pruneStaleAuto = process.argv.includes('--prune-stale-auto');
  const onlyArg = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];
  const onlyPriority = onlyArg === 'high-priority' ? 'high' : 'all';

  if (dryRun && write) {
    console.warn('Note: --write takes precedence over --dry-run');
  }
  const effectiveDry = dryRun && !write;

  const list = await loadScholarships();
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(raw) as SeoScholarshipRoutesManifest;

  const report = buildSeoScholarshipAutoCandidates(list, { onlyPriority });

  const dropSummary = summarizeDrops(report.dropped);
  console.log('\n=== SEO scholarship route builder ===\n');
  console.log(
    `Promoted (auto): ${report.promoted.length} (single=${report.promotedByType.single}, double=${report.promotedByType.double}, triple=${report.promotedByType.triple})`
  );
  console.log(`Pair endpoint pool size: ${report.pairPoolSize}`);
  console.log(`Dropped candidates: ${report.dropped.length}`, dropSummary);

  const spotPaths = [
    'for-women/no-essay',
    'international-students/california',
    'undergraduate/california',
    'high-school/no-essay',
    'engineering/texas',
    'computer-science/no-essay'
  ];
  const autoPromotedPaths = new Set(
    report.promoted.map((r) => r.canonicalPath)
  );
  console.log('\nSpot-check (in this run auto promoted set):');
  for (const p of spotPaths) {
    console.log(`  ${p}: ${autoPromotedPaths.has(p) ? 'yes' : 'no'}`);
  }
  console.log('\nTop 20 promoted paths by score:');
  console.log(
    [...report.promoted]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 20)
      .map((r) => `${r.canonicalPath}\tscore=${r.score}\tcount=${r.scholarshipsCount}`)
      .join('\n')
  );

  if (effectiveDry) {
    console.log('\n(dry-run: no manifest write)');
    return;
  }

  const generatedAuto = new Map(
    report.promoted.map((r) => [r.canonicalPath, r])
  );

  const refreshedByPath = new Map<string, SeoScholarshipRouteManifestEntry>();
  for (const row of manifest.routes) {
    refreshedByPath.set(
      row.canonicalPath,
      refreshManifestEntryDerived(list, row)
    );
  }

  const nowIso = new Date().toISOString();
  let merged = mergeSeoManifestRoutes({
    existing: manifest.routes,
    generatedAuto,
    refreshedByPath,
    opts: { nowIso, pruneStaleAuto }
  });

  merged = finalizeManifestRouteQuality(list, merged);

  if (write) {
    manifest.routes = merged;
    bumpManifestMeta(
      manifest,
      nowIso,
      process.env.OPENAI_SEO_PROMPT_VERSION ?? undefined
    );
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
    console.log('\nWrote', MANIFEST_PATH, `total routes=${manifest.routes.length}`);
  } else {
    console.log(
      '\n(no --write) merged preview size would be',
      merged.length,
      '— add --write to persist'
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
