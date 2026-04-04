/**
 * Audit SEO manifest routes: seo_id, in-memory exact counts, duplicate seo_id.
 *
 *   npx tsx scripts/audit-seo-listing-routes.ts --json=data/scholarships.json
 *
 * Counts use the same JS pipeline as `getScholarshipsMatchingManifestEntry` (USA matches);
 * live SQL totals may differ slightly from Supabase.
 */

import fs from 'fs';
import path from 'path';

import type { Scholarship } from '../app/scholarships/scholarshipsData';
import { countScholarshipsMatchingManifestEntry } from '../lib/scholarships/seoScholarshipListing';
import type { SeoScholarshipRouteManifestEntry } from '../lib/scholarships/seoScholarshipManifest';
import { deriveSeoIdFromCanonicalPath } from '../lib/scholarships/seoScholarshipId';

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'data', 'seo-scholarship-routes.json');

function loadScholarships(): Scholarship[] {
  const jsonArg = process.argv
    .find((a) => a.startsWith('--json='))
    ?.slice('--json='.length);
  if (!jsonArg) {
    console.error('Required: --json=path/to/scholarships.json (array export)');
    process.exit(1);
  }
  const p = path.isAbsolute(jsonArg) ? jsonArg : path.join(ROOT, jsonArg);
  const raw = fs.readFileSync(p, 'utf8');
  const data = JSON.parse(raw) as unknown;
  if (!Array.isArray(data)) throw new Error('expected scholarships array');
  return data as Scholarship[];
}

function main() {
  const list = loadScholarships();
  const manifest = JSON.parse(
    fs.readFileSync(MANIFEST, 'utf8')
  ) as { routes: SeoScholarshipRouteManifestEntry[] };
  const routes = manifest.routes ?? [];

  const seoIdToPaths = new Map<string, string[]>();
  const rows: string[] = [];

  rows.push(
    '| route | seo_id | exact_count | fallback_count | status | indexable |'
  );
  rows.push(
    '| --- | --- | ---: | ---: | --- | --- |'
  );

  for (const entry of routes) {
    const seoId =
      entry.seoId?.trim() || deriveSeoIdFromCanonicalPath(entry.canonicalPath);
    const paths = seoIdToPaths.get(seoId) ?? [];
    paths.push(entry.canonicalPath);
    seoIdToPaths.set(seoId, paths);

    const exact = countScholarshipsMatchingManifestEntry(list, entry);
    let fallback = exact;
    let status = 'OK';
    if (exact === 0) {
      const nuclear = { ...entry, legacyBaseSlugs: [], filters: undefined };
      fallback = countScholarshipsMatchingManifestEntry(list, nuclear);
      status = fallback > 0 ? 'fallback_used' : 'empty_even_nuclear';
    }
    const thin = fallback < 5;
    const noindex = thin || entry.indexable === false;
    const statusNote = noindex ? 'noindex_rule' : status;

    rows.push(
      `| ${entry.canonicalPath} | ${seoId} | ${exact} | ${fallback} | ${statusNote} | ${entry.indexable !== false} |`
    );
  }

  console.log(rows.join('\n'));

  const dupSeo = [...seoIdToPaths.entries()].filter(([, p]) => p.length > 1);
  if (dupSeo.length) {
    console.log('\n## Duplicate seo_id (should be merged)\n');
    for (const [id, paths] of dupSeo) {
      console.log(id, '→', paths.join(', '));
    }
  }
}

main();
