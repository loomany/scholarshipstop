import { STATIC_SCHOLARSHIP_GUIDES } from '@/lib/resources/staticScholarshipGuides';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import { getStaticResourceGuideCardCopy } from '@/lib/i18n/staticResourceGuideCards';
import type { ResourcesIndexQueryState } from '@/lib/content-hub/resourcesIndexFilters';

export type StaticResourceGuideEntry = {
  slug: string;
  title: string;
  description: string;
};

export function buildStaticResourceGuideEntries(
  locale: LocalizedUiLocale
): StaticResourceGuideEntry[] {
  return STATIC_SCHOLARSHIP_GUIDES.map((guide) => {
    const card = getStaticResourceGuideCardCopy(locale, guide.slug);
    return {
      slug: guide.slug,
      title: card.title,
      description: card.description
    };
  });
}

function matchesQuery(entry: StaticResourceGuideEntry, q: string): boolean {
  if (!q) return true;
  const hay = `${entry.title} ${entry.description} ${entry.slug}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

export function filterStaticResourceGuides(
  entries: StaticResourceGuideEntry[],
  state: Pick<ResourcesIndexQueryState, 'q' | 'sort'>
): StaticResourceGuideEntry[] {
  const filtered = entries.filter((e) => matchesQuery(e, state.q.trim()));
  if (state.sort === 'oldest') {
    return [...filtered].reverse();
  }
  return filtered;
}
