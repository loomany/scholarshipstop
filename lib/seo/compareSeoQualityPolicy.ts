export type CompareSeoQualityFacts = {
  stablePublicRoute?: boolean;
  hasQueryParams?: boolean;
  hasSearchIntent?: boolean;
  hasUniqueComparisonTable?: boolean;
  hasVisibleFaq?: boolean;
  hasRelatedInternalLinks?: boolean;
  meaningfulFactCount?: number | null;
  userSpecific?: boolean;
  duplicateOfArticle?: boolean;
};

export type CompareSeoQualityDecision = {
  indexable: boolean;
  includeInSitemap: boolean;
  reasons: string[];
};

export function getCompareSeoQualityPolicy(
  facts: CompareSeoQualityFacts
): CompareSeoQualityDecision {
  const reasons: string[] = [];
  const factCount = Math.max(0, Math.floor(facts.meaningfulFactCount ?? 0));

  if (facts.stablePublicRoute !== true) reasons.push('No stable public route.');
  if (facts.hasQueryParams === true) reasons.push('Query params define the page.');
  if (facts.userSpecific === true) reasons.push('Comparison is user-specific.');
  if (facts.duplicateOfArticle === true) reasons.push('Duplicate of another article.');
  if (facts.hasSearchIntent !== true) reasons.push('Search intent is unclear.');
  if (facts.hasUniqueComparisonTable !== true) {
    reasons.push('Unique comparison table is missing.');
  }
  if (facts.hasVisibleFaq !== true) reasons.push('Visible FAQ is missing.');
  if (facts.hasRelatedInternalLinks !== true) {
    reasons.push('Related internal links are missing.');
  }
  if (factCount < 3) reasons.push('Not enough meaningful comparison facts.');

  const indexable = reasons.length === 0;

  return {
    indexable,
    includeInSitemap: indexable,
    reasons: indexable ? ['Compare page meets public SEO quality rules.'] : reasons
  };
}
