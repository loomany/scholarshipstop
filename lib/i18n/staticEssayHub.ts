import { STATIC_ESSAY_GUIDES } from '@/lib/essays/staticEssayGuides';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import { getStaticEssayGuideCardCopy } from '@/lib/i18n/staticEssayGuideCards';
import type { EssaysIndexQueryState } from '@/lib/essays/essaysIndexFilters';

export type StaticEssayGuideEntry = {
  slug: string;
  title: string;
  description: string;
};

export function buildStaticEssayGuideEntries(
  locale: LocalizedUiLocale
): StaticEssayGuideEntry[] {
  return STATIC_ESSAY_GUIDES.map((guide) => {
    const card = getStaticEssayGuideCardCopy(locale, guide.slug);
    return {
      slug: guide.slug,
      title: card.title,
      description: card.description
    };
  });
}

function matchesQuery(entry: StaticEssayGuideEntry, q: string): boolean {
  if (!q) return true;
  const hay = `${entry.title} ${entry.description} ${entry.slug}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

export function filterStaticEssayGuides(
  entries: StaticEssayGuideEntry[],
  state: Pick<EssaysIndexQueryState, 'q' | 'sort'>
): StaticEssayGuideEntry[] {
  const filtered = entries.filter((e) => matchesQuery(e, state.q.trim()));
  if (state.sort === 'oldest') {
    return [...filtered].reverse();
  }
  return filtered;
}
