import type { EssayTocItem } from '@/lib/essays/essayBodyToc';

/**
 * Builds the full compare-page TOC (anchor order matches vertical layout):
 * skeleton sections rendered in JSX, then headings from CMS body HTML (`h2`/`h3`).
 */
export function buildStateCompareTocMerged(args: {
  bodyToc: EssayTocItem[];
  hasClimateEssay: boolean;
  faqCount: number;
  sourcesCount: number;
  hasRelated: boolean;
}): EssayTocItem[] {
  const {
    bodyToc,
    hasClimateEssay,
    faqCount,
    sourcesCount,
    hasRelated
  } = args;

  const rest: EssayTocItem[] = [
    ...(hasClimateEssay
      ? [
          {
            id: 'state-climate-heading',
            text: 'Scholarship climate by state'
          } satisfies EssayTocItem
        ]
      : []),
    ...(faqCount > 0
      ? [{ id: 'state-compare-faq-heading', text: 'FAQ' } satisfies EssayTocItem]
      : []),
    ...(sourcesCount > 0
      ? [
          {
            id: 'state-compare-sources-heading',
            text: 'Sources and official pages'
          } satisfies EssayTocItem
        ]
      : []),
    ...(hasRelated
      ? [
          {
            id: 'state-related-guides-heading',
            text:
              'More guides around this State vs State comparison'
          } satisfies EssayTocItem
        ]
      : [])
  ];

  return [
    { id: 'compare-state-quick-heading', text: 'Quick comparison' },
    ...bodyToc,
    { id: 'compare-state-top-providers-heading', text: 'Top scholarship providers' },
    {
      id: 'compare-state-cta-heading',
      text: 'Get matched with scholarships in 2 minutes'
    },
    ...rest
  ];
}

/** University vs university — JSX section order differs from state compare */
export function buildUniversityCompareTocMerged(args: {
  bodyToc: EssayTocItem[];
  hasEssayInsights: boolean;
  hasStateBattle: boolean;
  faqCount: number;
  sourcesCount: number;
  hasRelated: boolean;
}): EssayTocItem[] {
  const {
    bodyToc,
    hasEssayInsights,
    hasStateBattle,
    faqCount,
    sourcesCount,
    hasRelated
  } = args;

  return [
    { id: 'compare-uni-quick-heading', text: 'Quick comparison' },
    ...bodyToc,
    ...(hasEssayInsights
      ? [
          {
            id: 'essay-insights-heading',
            text: 'Writing efforts'
          } satisfies EssayTocItem
        ]
      : []),
    { id: 'top-grants-heading', text: 'Top grants by university' },
    {
      id: 'compare-uni-cta-heading',
      text: 'Get matched with scholarships in 2 minutes'
    },
    ...(hasStateBattle
      ? [
          {
            id: 'state-battle-link-heading',
            text: 'Not sure about the location?'
          } satisfies EssayTocItem
        ]
      : []),
    ...(faqCount > 0
      ? [{ id: 'compare-faq-heading', text: 'FAQ' } satisfies EssayTocItem]
      : []),
    ...(sourcesCount > 0
      ? [
          {
            id: 'compare-sources-heading',
            text: 'Sources and official pages'
          } satisfies EssayTocItem
        ]
      : []),
    ...(hasRelated
      ? [
          {
            id: 'compare-related-guides-heading',
            text: 'More guides around this comparison'
          } satisfies EssayTocItem
        ]
      : [])
  ];
}
