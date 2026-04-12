import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import type { ProviderFaqItem } from '@/lib/providers/providerProfileTypes';

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
        ? `This hub lists awards associated with ${universityDisplayName} in ${stateName}. Several current listings reference international eligibility, but rules differ by program—always confirm on the provider’s official page before you apply.`
        : `Many U.S. colleges offer aid that may include international students, but eligibility is program-specific. Use the listings below and verify citizenship, visa, and residency rules on each provider’s official site.`
    },
    {
      question: `How do I apply for scholarships at ${universityDisplayName}?`,
      answer: `Open a scholarship below to review deadlines, requirements, and the official application link. Prepare transcripts, essays, or documents early, and submit through the provider’s stated process—not through this directory.`
    },
    {
      question: `Are these ${universityDisplayName} scholarships fully funded?`,
      answer: `Award sizes vary. Each card shows the best available award summary from the source; read the listing for whether it covers full tuition, partial tuition, or other benefits.`
    },
    {
      question: `How often is this ${universityDisplayName}, ${stateName} scholarship list updated?`,
      answer: `We refresh catalog data regularly. This page currently surfaces ${count} active matches tied to this provider slug; deadlines and amounts can change, so double-check the official source before applying.`
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

export function buildUniversityHubFaqJsonLd(
  faqItems: ProviderFaqItem[],
  canonicalUrl: string
): Record<string, unknown> {
  const mainEntity = faqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer
    }
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: canonicalUrl,
    mainEntity
  };
}
