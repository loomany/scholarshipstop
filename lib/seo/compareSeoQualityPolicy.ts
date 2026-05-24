export type CompareSeoQualityFacts = {
  stablePublicRoute?: boolean;
  hasQueryParams?: boolean;
  hasSearchIntent?: boolean;
  hasUniqueComparisonTable?: boolean;
  hasVisibleFaq?: boolean;
  hasRelatedInternalLinks?: boolean;
  meaningfulFactCount?: number | null;
  visibleWordCount?: number | null;
  minimumVisibleWords?: number;
  localized?: boolean;
  hasLocalizedTitle?: boolean;
  hasLocalizedH1?: boolean;
  hasLocalizedBody?: boolean;
  userSpecific?: boolean;
  duplicateOfArticle?: boolean;
};

export type CompareSeoQualityDecision = {
  indexable: boolean;
  includeInSitemap: boolean;
  reasons: string[];
};

export const MIN_DYNAMIC_COMPARE_VISIBLE_WORDS = 700;
export const MIN_LOCALIZED_COMPARE_VISIBLE_WORDS = 700;

export function getCompareSeoQualityPolicy(
  facts: CompareSeoQualityFacts
): CompareSeoQualityDecision {
  const reasons: string[] = [];
  const factCount = Math.max(0, Math.floor(facts.meaningfulFactCount ?? 0));
  const wordCount = Math.max(0, Math.floor(facts.visibleWordCount ?? 0));
  const minimumWords = facts.minimumVisibleWords;

  if (facts.stablePublicRoute !== true) reasons.push('No stable public route.');
  if (facts.hasQueryParams === true) reasons.push('Query params define the page.');
  if (facts.userSpecific === true) reasons.push('Comparison is user-specific.');
  if (facts.duplicateOfArticle === true) reasons.push('Duplicate of another article.');
  if (facts.hasSearchIntent !== true) reasons.push('Search intent is unclear.');
  if (facts.localized === true) {
    if (facts.hasLocalizedTitle !== true) reasons.push('Localized title is missing.');
    if (facts.hasLocalizedH1 !== true) reasons.push('Localized H1 is missing.');
    if (facts.hasLocalizedBody !== true) reasons.push('Localized body is missing.');
  }
  if (facts.hasUniqueComparisonTable !== true) {
    reasons.push('Unique comparison table is missing.');
  }
  if (facts.hasVisibleFaq !== true) reasons.push('Visible FAQ is missing.');
  if (facts.hasRelatedInternalLinks !== true) {
    reasons.push('Related internal links are missing.');
  }
  if (factCount < 3) reasons.push('Not enough meaningful comparison facts.');
  if (typeof minimumWords === 'number' && wordCount < minimumWords) {
    reasons.push(`Visible content is below ${minimumWords} useful words.`);
  }

  const indexable = reasons.length === 0;

  return {
    indexable,
    includeInSitemap: indexable,
    reasons: indexable ? ['Compare page meets public SEO quality rules.'] : reasons
  };
}
