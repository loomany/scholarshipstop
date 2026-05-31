import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import type { ProviderFaqItem } from '@/lib/providers/providerProfileTypes';
import {
  buildBreadcrumbListJsonLd,
  buildFaqPageJsonLd,
  buildItemListJsonLd,
  buildWebPageJsonLd,
  type JsonLdBreadcrumbItem
} from '@/lib/seo/jsonLd';
import { scholarshipPublicPath } from '@/app/scholarships/scholarshipsData';
import { getURL } from '@/utils/helpers';

function mentionsInternational(s: Scholarship): boolean {
  if (s.seoTags?.some((t) => t.includes('international'))) return true;
  const blob = [
    s.summaryShort,
    s.summaryLong,
    s.eligibilityText,
    s.whoCanApplyText,
    ...(s.eligibility ?? [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /international|foreign|f-?1|f1|visa/i.test(blob);
}

function buildFallbackFaqItems(opts: {
  universityDisplayName: string;
  stateName: string;
  scholarships: Scholarship[];
}): ProviderFaqItem[] {
  const { universityDisplayName, stateName, scholarships } = opts;
  const anyIntl = scholarships.some(mentionsInternational);
  const count = scholarships.length;

  return [
    {
      question: `Does ${universityDisplayName} give scholarships to international students?`,
      answer: anyIntl
        ? `This hub lists awards associated with ${universityDisplayName} in ${stateName}. Several current listings reference international eligibility, and ScholarshipTop organizes eligibility signals, deadlines, award context, and provider application paths when available.`
        : `Many U.S. colleges offer aid that may include international students, but eligibility is program-specific. Use the listings below to compare citizenship, visa, residency, deadline, and provider-path signals.`
    },
    {
      question: `How do I apply for scholarships at ${universityDisplayName}?`,
      answer: `Open a scholarship below to review deadlines, requirements, award details, and the provider application path when available. Prepare transcripts, essays, or documents early, then continue toward the provider's stated process when ready.`
    },
    {
      question: `Are these ${universityDisplayName} scholarships fully funded?`,
      answer: `Award sizes vary. Each card shows the best available award summary from the source; read the listing for whether it covers full tuition, partial tuition, or other benefits.`
    },
    {
      question: `How often is this ${universityDisplayName}, ${stateName} scholarship list updated?`,
      answer: `We refresh catalog data regularly. This page currently surfaces ${count} active matches tied to this provider slug, with deadline, amount, eligibility, and application-path context organized for comparison.`
    }
  ];
}

const MAX_PROVIDER_FAQ = 15;

/**
 * Prefer curated `providers.ai_faq`; otherwise generic hub copy (matches JSON-LD).
 */
export function resolveUniversityHubFaqItems(opts: {
  universityDisplayName: string;
  stateName: string;
  scholarships: Scholarship[];
  providerFaq: ProviderFaqItem[];
}): ProviderFaqItem[] {
  const fromDb = opts.providerFaq
    .filter((x) => x.question?.trim() && x.answer?.trim())
    .map((x) => ({
      question: x.question.trim(),
      answer: x.answer.trim()
    }));
  if (fromDb.length > 0) {
    return fromDb.slice(0, MAX_PROVIDER_FAQ);
  }
  return buildFallbackFaqItems(opts);
}

/** @deprecated Use buildUniversityHubJsonLdBlocks — kept for callers expecting FAQ-only payload. */
export function buildUniversityHubFaqJsonLd(
  faqItems: ProviderFaqItem[],
  canonicalUrl: string
): Record<string, unknown> {
  return (
    buildFaqPageJsonLd(faqItems, canonicalUrl) ?? {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      url: canonicalUrl
    }
  );
}

export type UniversityHubJsonLdInput = {
  pageTitle: string;
  pageDescription: string;
  canonicalPath: string;
  stateLabel: string;
  stateSlug: string;
  universityName: string;
  universitySlug: string;
  scholarships: Scholarship[];
  faqItems: ProviderFaqItem[];
  breadcrumbs?: JsonLdBreadcrumbItem[] | null;
};

export function buildUniversityHubJsonLdBlocks(
  input: UniversityHubJsonLdInput
): Record<string, unknown>[] {
  const pageUrl = getURL(input.canonicalPath.replace(/^\//, ''));
  const breadcrumbs =
    input.breadcrumbs ??
    ([
      { name: 'Home', path: '/' },
      { name: 'Scholarships', path: '/scholarships' },
      { name: input.stateLabel, path: `/scholarships/${input.stateSlug}` },
      {
        name: input.universityName,
        path: `/scholarships/${input.stateSlug}/${input.universitySlug}`
      }
    ] satisfies JsonLdBreadcrumbItem[]);

  const blocks: Array<Record<string, unknown> | null> = [
    buildBreadcrumbListJsonLd(breadcrumbs),
    buildWebPageJsonLd({
      name: input.pageTitle,
      description: input.pageDescription,
      url: pageUrl
    }),
    input.scholarships.length > 0
      ? buildItemListJsonLd({
          name: input.pageTitle,
          description: input.pageDescription,
          url: pageUrl,
          items: input.scholarships.map((scholarship) => ({
            name: scholarship.title,
            url: getURL(scholarshipPublicPath(scholarship).replace(/^\//, ''))
          }))
        })
      : null,
    buildFaqPageJsonLd(input.faqItems, pageUrl)
  ];

  return blocks.filter((block): block is Record<string, unknown> => block != null);
}
