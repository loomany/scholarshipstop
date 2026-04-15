/**
 * Reorders data/seo-pending-queue.json by SEO strength:
 * 1) Longest manifest prefix with priority (desc)
 * 2) Then longest prefix with score / finalQualityScore (desc)
 * 3) Exact-route scholarshipsCount / minCountSnapshot (desc)
 * 4) Last segment = US state → population rank (desc)
 * 5) ROOT_INTENT first-segment fallback (desc)
 *
 * Run: node scripts/sort-seo-pending-queue.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

/** US state slug → rank (higher = larger search population / more head traffic). */
const STATE_ORDER = [
  'california',
  'texas',
  'florida',
  'new-york',
  'pennsylvania',
  'illinois',
  'ohio',
  'georgia',
  'north-carolina',
  'michigan',
  'new-jersey',
  'virginia',
  'washington',
  'arizona',
  'massachusetts',
  'tennessee',
  'indiana',
  'missouri',
  'maryland',
  'wisconsin',
  'colorado',
  'minnesota',
  'south-carolina',
  'alabama',
  'louisiana',
  'kentucky',
  'oregon',
  'oklahoma',
  'connecticut',
  'utah',
  'iowa',
  'nevada',
  'arkansas',
  'mississippi',
  'kansas',
  'new-mexico',
  'nebraska',
  'west-virginia',
  'idaho',
  'hawaii',
  'new-hampshire',
  'maine',
  'montana',
  'rhode-island',
  'delaware',
  'south-dakota',
  'north-dakota',
  'alaska',
  'vermont',
  'wyoming',
  'district-of-columbia'
];
const STATE_RANK = Object.fromEntries(
  STATE_ORDER.map((s, i) => [s, STATE_ORDER.length - i])
);

/** When manifest has no numeric tier on prefixes — typical head-term strength (0–100). */
const ROOT_INTENT = {
  'full-ride': 99,
  'computer-science': 96,
  'engineering': 95,
  'first-generation': 92,
  'phd': 90,
  'closing-soon': 89,
  'undergraduate': 88,
  'high-school': 87,
  'financial-need': 86,
  'veterans': 85,
  'african-american': 84,
  'hispanic': 83,
  'minority': 82,
  'native-american': 81,
  'disability': 80,
  'lgbtq': 78,
  'for-women': 77,
  'single-parent': 74,
  'payout-student': 73,
  'payout-college': 72,
  'foster-youth': 70,
  'international-students': 68,
  'international-students-eligibility': 67,
  'low-income': 65,
  'under-5000': 62,
  'under-10000': 61
};

function queueEntryToCanonicalPath(entry) {
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
      return rest ? rest.toLowerCase() : null;
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
  return rest ? rest.toLowerCase() : null;
}

function longestPrefixPriority(routeMap, canonicalPath) {
  const parts = canonicalPath.split('/');
  for (let len = parts.length; len >= 1; len--) {
    const pref = parts.slice(0, len).join('/');
    const r = routeMap.get(pref);
    if (r && r.priority != null && Number.isFinite(r.priority)) {
      return { value: r.priority, matched: pref };
    }
  }
  return { value: -1, matched: null };
}

function longestPrefixScore(routeMap, canonicalPath) {
  const parts = canonicalPath.split('/');
  for (let len = parts.length; len >= 1; len--) {
    const pref = parts.slice(0, len).join('/');
    const r = routeMap.get(pref);
    if (!r) continue;
    const sc = r.score ?? r.qualitySnapshot?.finalQualityScore;
    if (sc != null && Number.isFinite(Number(sc))) {
      return { value: Number(sc), matched: pref };
    }
  }
  return { value: -1, matched: null };
}

function sortKey(routeMap, canonicalPath) {
  const parts = canonicalPath.split('/');
  const exact = routeMap.get(canonicalPath);
  const count =
    exact?.scholarshipsCount ??
    exact?.minCountSnapshot ??
    exact?.qualitySnapshot?.renderedCount ??
    0;

  const lp = longestPrefixPriority(routeMap, canonicalPath);
  const ls = longestPrefixScore(routeMap, canonicalPath);

  const last = parts[parts.length - 1] ?? '';
  const stateRank = STATE_RANK[last] ?? 0;

  const root = parts[0] ?? '';
  const rootFallback = ROOT_INTENT[root] ?? 35;

  return {
    pri: lp.value,
    score: Math.max(ls.value, 0),
    count: Number(count) || 0,
    stateRank,
    rootFallback,
    path: canonicalPath
  };
}

function compare(a, b) {
  if (b.pri !== a.pri) return b.pri - a.pri;
  if (b.score !== a.score) return b.score - a.score;
  if (b.count !== a.count) return b.count - a.count;
  if (b.stateRank !== a.stateRank) return b.stateRank - a.stateRank;
  if (b.rootFallback !== a.rootFallback) return b.rootFallback - a.rootFallback;
  return a.path.localeCompare(b.path);
}

const queuePath = path.join(root, 'data', 'seo-pending-queue.json');
const manifestPath = path.join(root, 'data', 'seo-scholarship-routes.json');

const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const routeMap = new Map(manifest.routes.map((r) => [r.canonicalPath, r]));

const enriched = queue.map((url) => {
  const canonicalPath = queueEntryToCanonicalPath(url);
  if (!canonicalPath) return { url, key: null };
  return { url, key: sortKey(routeMap, canonicalPath) };
});

enriched.sort((x, y) => {
  if (!x.key && !y.key) return 0;
  if (!x.key) return 1;
  if (!y.key) return -1;
  return compare(x.key, y.key);
});

const sorted = enriched.map((e) => e.url);
fs.writeFileSync(queuePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');

const head = enriched.slice(0, 25).map((e) => e.key?.path ?? e.url);
console.log('Wrote', sorted.length, 'URLs. Top 25 paths:');
console.log(head.join('\n'));
