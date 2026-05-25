import type { EssayTocItem } from '@/lib/essays/essayBodyToc';
import { getCompareDetailUiCopy } from '@/lib/i18n/compareDetailUiCopy';
import { getCompareStateDetailUiCopy } from '@/lib/i18n/compareStateDetailUiCopy';
import { getCompareUniversityDetailUiCopy } from '@/lib/i18n/compareUniversityDetailUiCopy';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

/**
 * Builds the full compare-page TOC (anchor order matches vertical layout):
 * skeleton sections rendered in JSX, then headings from CMS body HTML (`h2`/`h3`).
 */
export function buildStateCompareTocMerged(args: {
  locale?: LocalizedUiLocale;
  bodyToc: EssayTocItem[];
  hasClimateEssay: boolean;
  faqCount: number;
  sourcesCount: number;
  hasRelated: boolean;
}): EssayTocItem[] {
  const {
    locale = 'en',
    bodyToc,
    hasClimateEssay,
    faqCount,
    sourcesCount,
    hasRelated
  } = args;
  const stateUi = getCompareStateDetailUiCopy(locale);
  const detailUi = getCompareDetailUiCopy(locale);

  const rest: EssayTocItem[] = [
    ...(hasClimateEssay
      ? [
          {
            id: 'state-climate-heading',
            text: stateUi.climateHeading
          } satisfies EssayTocItem
        ]
      : []),
    ...(faqCount > 0
      ? [
          {
            id: 'state-compare-faq-heading',
            text: stateUi.tocFaq
          } satisfies EssayTocItem
        ]
      : []),
    ...(sourcesCount > 0
      ? [
          {
            id: 'state-compare-sources-heading',
            text: stateUi.sourcesHeading
          } satisfies EssayTocItem
        ]
      : []),
    ...(hasRelated
      ? [
          {
            id: 'state-related-guides-heading',
            text: stateUi.relatedHeading
          } satisfies EssayTocItem
        ]
      : [])
  ];

  return [
    { id: 'compare-state-quick-heading', text: stateUi.quickComparison },
    ...bodyToc,
    {
      id: 'compare-state-top-providers-heading',
      text: stateUi.tocTopProviders
    },
    {
      id: 'compare-state-cta-heading',
      text: detailUi.scholarshipMatchCta.heading
    },
    ...rest
  ];
}

/** University vs university — JSX section order differs from state compare */
export function buildUniversityCompareTocMerged(args: {
  locale?: LocalizedUiLocale;
  bodyToc: EssayTocItem[];
  hasEssayInsights: boolean;
  hasStateBattle: boolean;
  faqCount: number;
  sourcesCount: number;
  hasRelated: boolean;
}): EssayTocItem[] {
  const {
    locale = 'en',
    bodyToc,
    hasEssayInsights,
    hasStateBattle,
    faqCount,
    sourcesCount,
    hasRelated
  } = args;
  const uniUi = getCompareUniversityDetailUiCopy(locale);
  const detailUi = getCompareDetailUiCopy(locale);

  return [
    { id: 'compare-uni-quick-heading', text: uniUi.quickComparison },
    ...bodyToc,
    ...(hasEssayInsights
      ? [
          {
            id: 'essay-insights-heading',
            text: uniUi.tocWritingEfforts
          } satisfies EssayTocItem
        ]
      : []),
    { id: 'top-grants-heading', text: detailUi.universityGrants.heading },
    {
      id: 'compare-uni-cta-heading',
      text: detailUi.scholarshipMatchCta.heading
    },
    ...(hasStateBattle
      ? [
          {
            id: 'state-battle-link-heading',
            text: uniUi.tocStateBattle
          } satisfies EssayTocItem
        ]
      : []),
    ...(faqCount > 0
      ? [{ id: 'compare-faq-heading', text: uniUi.tocFaq } satisfies EssayTocItem]
      : []),
    ...(sourcesCount > 0
      ? [
          {
            id: 'compare-sources-heading',
            text: uniUi.sourcesHeading
          } satisfies EssayTocItem
        ]
      : []),
    ...(hasRelated
      ? [
          {
            id: 'compare-related-guides-heading',
            text: uniUi.relatedHeading
          } satisfies EssayTocItem
        ]
      : [])
  ];
}
