export const MIN_EN_ESSAY_VISIBLE_WORDS = 600;
export const MIN_LOCALIZED_ESSAY_VISIBLE_WORDS = 700;

export type EssaySeoQualityFacts = {
  stablePublicRoute?: boolean;
  hasQueryParams?: boolean;
  isPrivate?: boolean;
  hasTitle?: boolean;
  hasH1?: boolean;
  hasBody?: boolean;
  visibleWordCount?: number | null;
  minimumVisibleWords?: number;
  curatedGuide?: boolean;
  localized?: boolean;
  hasLocalizedTitle?: boolean;
  hasLocalizedH1?: boolean;
  hasLocalizedBody?: boolean;
  hasRawPlaceholder?: boolean;
};

export type EssaySeoQualityDecision = {
  indexable: boolean;
  includeInSitemap: boolean;
  reasons: string[];
};

export function getEssaySeoQualityPolicy(
  facts: EssaySeoQualityFacts
): EssaySeoQualityDecision {
  const reasons: string[] = [];
  const wordCount = Math.max(0, Math.floor(facts.visibleWordCount ?? 0));
  const minimum =
    facts.minimumVisibleWords ??
    (facts.localized
      ? MIN_LOCALIZED_ESSAY_VISIBLE_WORDS
      : MIN_EN_ESSAY_VISIBLE_WORDS);

  if (facts.stablePublicRoute !== true) reasons.push('No stable public route.');
  if (facts.hasQueryParams === true) reasons.push('Query params define the page.');
  if (facts.isPrivate === true) reasons.push('Essay page is private or user-specific.');
  if (facts.hasTitle !== true) reasons.push('Visible title is missing.');
  if (facts.hasH1 !== true) reasons.push('Visible H1 is missing.');
  if (facts.hasBody !== true) reasons.push('Useful body content is missing.');
  if (facts.localized === true) {
    if (facts.hasLocalizedTitle !== true) reasons.push('Localized title is missing.');
    if (facts.hasLocalizedH1 !== true) reasons.push('Localized H1 is missing.');
    if (facts.hasLocalizedBody !== true) reasons.push('Localized body is missing.');
  }
  if (facts.hasRawPlaceholder === true) {
    reasons.push('Raw placeholder text is present.');
  }
  if (facts.curatedGuide !== true && wordCount < minimum) {
    reasons.push(`Visible content is below ${minimum} useful words.`);
  }

  const indexable = reasons.length === 0;
  return {
    indexable,
    includeInSitemap: indexable,
    reasons: indexable ? ['Essay page meets public SEO quality rules.'] : reasons
  };
}
