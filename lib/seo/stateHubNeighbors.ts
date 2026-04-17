import { listUsStateSeoSlugs } from '@/lib/scholarships/seoScholarshipRouteTokens';

/**
 * Limited adjacency map for cross-links; unknown slugs fall back to popular hubs.
 */
const NEIGHBORS: Record<string, string[]> = {
  california: ['nevada', 'arizona', 'oregon'],
  texas: ['new-mexico', 'oklahoma', 'louisiana', 'arkansas'],
  'new-york': ['new-jersey', 'connecticut', 'pennsylvania', 'massachusetts'],
  florida: ['georgia', 'alabama'],
  illinois: ['wisconsin', 'indiana', 'missouri', 'iowa'],
  pennsylvania: ['new-jersey', 'new-york', 'ohio', 'maryland'],
  ohio: ['michigan', 'indiana', 'kentucky', 'pennsylvania'],
  georgia: ['florida', 'alabama', 'tennessee', 'south-carolina'],
  'north-carolina': ['south-carolina', 'virginia', 'tennessee', 'georgia'],
  michigan: ['ohio', 'indiana', 'wisconsin'],
  washington: ['oregon', 'idaho'],
  colorado: ['wyoming', 'nebraska', 'kansas', 'utah', 'new-mexico', 'arizona'],
  virginia: ['maryland', 'west-virginia', 'north-carolina', 'tennessee', 'kentucky'],
  massachusetts: ['new-hampshire', 'vermont', 'new-york', 'connecticut', 'rhode-island']
};

const FALLBACK: string[] = [
  'california',
  'texas',
  'florida',
  'new-york',
  'illinois',
  'pennsylvania'
];

export function neighborStateSlugsForSeoHub(
  stateSlug: string,
  limit = 6
): string[] {
  const n = stateSlug.trim().toLowerCase();
  const pool = NEIGHBORS[n] ?? FALLBACK.filter((s) => s !== n);
  const all = listUsStateSeoSlugs();
  const allowed = new Set(all);
  const out: string[] = [];
  for (const s of pool) {
    if (s === n) continue;
    if (!allowed.has(s)) continue;
    out.push(s);
    if (out.length >= limit) break;
  }
  for (const s of all) {
    if (out.length >= limit) break;
    if (s === n || out.includes(s)) continue;
    out.push(s);
  }
  return out.slice(0, limit);
}
