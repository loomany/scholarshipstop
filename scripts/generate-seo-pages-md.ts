/**
 * Writes docs/seo-pages.md from data/seo-scholarship-routes.json (indexable manifest rows).
 *
 *   npm run generate-seo-pages-md
 */

import fs from 'fs';
import path from 'path';

import type {
  SeoScholarshipRouteManifestEntry,
  SeoScholarshipRoutesManifest
} from '../lib/scholarships/seoScholarshipManifest';

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'data', 'seo-scholarship-routes.json');
const OUT = path.join(ROOT, 'docs', 'seo-pages.md');

function capitalizeWord(w: string): string {
  if (!w) return w;
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

/** canonicalPath segments → "For Women No Essay Scholarships" */
function titleFromCanonicalPath(canonicalPath: string): string {
  const segments = canonicalPath.split('/').filter(Boolean);
  const parts = segments.flatMap((seg) =>
    seg.split('-').filter(Boolean).map(capitalizeWord)
  );
  const head = parts.join(' ');
  return head ? `${head} Scholarships` : 'Scholarships';
}

function scoreOf(r: SeoScholarshipRouteManifestEntry): number {
  if (typeof r.score === 'number' && Number.isFinite(r.score)) return r.score;
  if (typeof r.priority === 'number' && Number.isFinite(r.priority)) return r.priority;
  return 0;
}

function countOf(r: SeoScholarshipRouteManifestEntry): number {
  if (typeof r.scholarshipsCount === 'number' && Number.isFinite(r.scholarshipsCount)) {
    return r.scholarshipsCount;
  }
  if (typeof r.minCountSnapshot === 'number' && Number.isFinite(r.minCountSnapshot)) {
    return r.minCountSnapshot;
  }
  return 0;
}

function sourceLabel(r: SeoScholarshipRouteManifestEntry): string {
  return r.source === 'auto' ? 'auto' : 'manual';
}

function main() {
  const raw = fs.readFileSync(MANIFEST, 'utf8');
  const manifest = JSON.parse(raw) as SeoScholarshipRoutesManifest;

  const indexable = manifest.routes.filter((r) => r.indexable === true);
  indexable.sort((a, b) => {
    const ds = scoreOf(b) - scoreOf(a);
    if (ds !== 0) return ds;
    return countOf(b) - countOf(a);
  });

  const top = indexable.slice(0, 200);
  const dateStr = new Date().toISOString().slice(0, 10);

  const lines: string[] = [
    '# SEO Pages (auto)',
    '',
    `_Generated at: ${dateStr}_`,
    '',
    'Manifest: `data/seo-scholarship-routes.json` · filter: `indexable === true` · top 200 by score, then count.',
    '',
    '## Top indexable',
    ''
  ];

  for (const r of top) {
    const urlPath = `/scholarships/${r.canonicalPath}`;
    const title = titleFromCanonicalPath(r.canonicalPath);
    lines.push(`- [${title}](${urlPath})`);
  }

  lines.push('', '## Debug table', '', '| URL | Count | Score | Source |', '| --- | ---: | ---: | --- |');

  for (const r of top) {
    const urlPath = `/scholarships/${r.canonicalPath}`;
    const c = countOf(r);
    const s = scoreOf(r);
    const src = sourceLabel(r);
    lines.push(`| \`${urlPath}\` | ${c} | ${s} | ${src} |`);
  }

  lines.push('');

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
  console.log(`Wrote ${top.length} rows → ${OUT}`);
}

main();
