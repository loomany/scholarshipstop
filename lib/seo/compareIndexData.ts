import {
  interleaveStateThenUniversity,
  sortCompareIndexSlice,
  type CompareIndexItem
} from '@/lib/seo/compareIndexFilters';
import type { StateCompareIndexRow } from '@/lib/seo/stateCompareServer';
import { parseStateVsSlug } from '@/lib/seo/stateCompareSlug';
import type { UniversityCompareIndexRow } from '@/lib/seo/universityCompareServer';
import { parseUniversityVsSlug } from '@/lib/seo/universityCompareSlug';

export function normalizeCompareTitle(rawTitle: string | null, slug: string): string {
  return rawTitle?.trim() || slug.replace(/-/g, ' ');
}

export function compareDescription(
  type: 'universities' | 'states',
  rawDescription: string | null
) {
  const trimmed = rawDescription?.trim();
  if (trimmed) return trimmed;

  return type === 'universities'
    ? 'Compare funding depth, student context, and scholarship opportunities across two institutions.'
    : 'Compare statewide scholarship climate, grant volume, and funding context across both states.';
}

export function buildUniversityCompareItems(rows: UniversityCompareIndexRow[]): CompareIndexItem[] {
  return rows.map((row) => ({
    id: `universities:${row.slug}`,
    type: 'universities' as const,
    slug: row.slug,
    title: normalizeCompareTitle(row.meta_title, row.slug),
    description: compareDescription('universities', row.meta_description),
    href: `/compare/universities/${encodeURIComponent(row.slug)}`,
    updatedAt: row.updated_at
  }));
}

export function buildStateCompareItems(rows: StateCompareIndexRow[]): CompareIndexItem[] {
  return rows.map((row) => ({
    id: `states:${row.slug}`,
    type: 'states' as const,
    slug: row.slug,
    title: normalizeCompareTitle(row.meta_title, row.slug),
    description: compareDescription('states', row.meta_description),
    href: `/compare/states/${encodeURIComponent(row.slug)}`,
    updatedAt: row.updated_at
  }));
}

export function buildCombinedCompareItems(args: {
  universities: UniversityCompareIndexRow[];
  states: StateCompareIndexRow[];
}): CompareIndexItem[] {
  const universities = buildUniversityCompareItems(args.universities);
  const states = buildStateCompareItems(args.states);
  return interleaveStateThenUniversity(
    sortCompareIndexSlice(states, 'latest'),
    sortCompareIndexSlice(universities, 'latest')
  );
}

/**
 * Client search only needs enough compare rows to discover unique state/school
 * names. Keep visible cards/server HTML unchanged, but avoid serializing every
 * published compare page into the toolbar payload.
 */
export function buildCompareSuggestionSeedItems(
  items: CompareIndexItem[]
): CompareIndexItem[] {
  const seen = new Set<string>();
  const out: CompareIndexItem[] = [];

  for (const item of items) {
    const pair =
      item.type === 'states'
        ? parseStateVsSlug(item.slug)
        : parseUniversityVsSlug(item.slug);
    if (!pair) continue;

    const keys = pair.map((slug) => `${item.type}:${slug}`);
    if (keys.some((key) => !seen.has(key))) {
      out.push(item);
      keys.forEach((key) => seen.add(key));
    }
  }

  return out;
}
