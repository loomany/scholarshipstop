import { STATIC_COMPARE_GUIDES } from '@/lib/compare/staticCompareGuides';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import { getStaticCompareGuideCardCopy } from '@/lib/i18n/staticCompareGuideCards';
import type {
  CompareIndexCategory,
  CompareIndexQueryState
} from '@/lib/seo/compareIndexFilters';

export type StaticCompareGuideEntry = {
  slug: string;
  title: string;
  description: string;
};

export function buildStaticCompareGuideEntries(
  locale: LocalizedUiLocale
): StaticCompareGuideEntry[] {
  return STATIC_COMPARE_GUIDES.map((guide) => {
    const card = getStaticCompareGuideCardCopy(locale, guide.slug);
    return {
      slug: guide.slug,
      title: card.title,
      description: card.description
    };
  });
}

function matchesQuery(entry: StaticCompareGuideEntry, q: string): boolean {
  if (!q) return true;
  const hay = `${entry.title} ${entry.description} ${entry.slug}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

export function filterStaticCompareGuides(
  entries: StaticCompareGuideEntry[],
  state: Pick<CompareIndexQueryState, 'q' | 'sort'>
): StaticCompareGuideEntry[] {
  const filtered = entries.filter((e) => matchesQuery(e, state.q.trim()));
  if (state.sort === 'title') {
    return [...filtered].sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    );
  }
  return filtered;
}

export function staticCompareCategoryCounts(
  entries: StaticCompareGuideEntry[],
  q: string
): Record<'universities' | 'states', number> {
  const matched = entries.filter((e) => matchesQuery(e, q));
  return {
    universities: matched.length,
    states: matched.length
  };
}

export function isStaticCompareCategory(
  category: CompareIndexCategory
): category is 'universities' | 'states' {
  return category === 'universities' || category === 'states';
}
