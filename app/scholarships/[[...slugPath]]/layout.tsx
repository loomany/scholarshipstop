import type { Metadata } from 'next';
import { breadcrumbCategoryLabel } from '@/app/scholarships/scholarshipCategories';
import { normalizeScholarshipDynamicParam } from '@/app/scholarships/scholarshipLongTailPresets';
import { resolveScholarshipSlugPath } from '@/lib/scholarships/seoScholarshipResolve';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import {
  formatScholarshipAwardDisplay,
  scholarshipPublicPath
} from '@/app/scholarships/scholarshipsData';
import { ScholarshipDetailInitialDataProvider } from '@/app/scholarships/ScholarshipDetailInitialDataContext';
import {
  getScholarshipDetailServer,
  redactPremiumScholarshipFields
} from '@/lib/scholarships/scholarshipDetailServer';
import { resolveScholarshipCategorySlug } from '@/lib/scholarships/similarScholarships';
import { getURL } from '@/utils/helpers';
import { generateScholarshipSlugLayoutMetadata } from '@/app/scholarships/scholarshipSlugLayoutMetadata';

type LayoutProps = {
  children: React.ReactNode;
  params: { slugPath?: string[] };
};

function payoutMethodLabel(method: string | null | undefined): string | null {
  const m = method?.toLowerCase();
  if (!m) return null;
  const map: Record<string, string> = {
    college: 'Paid to the college or financial aid office',
    student: 'Paid directly to the student',
    non_monetary:
      'Non-monetary award (for example courses, equipment, or prizes)',
    not_stated: 'Not stated on the listing'
  };
  return map[m] ?? null;
}

function scholarshipSchemaDescription(s: Scholarship): string | undefined {
  const raw =
    s.seoOverview?.trim() ||
    s.summaryLong?.trim() ||
    s.summaryShort?.trim() ||
    s.description?.trim();
  if (!raw) return undefined;
  return raw.length > 2000 ? `${raw.slice(0, 1997)}…` : raw;
}

/**
 * Schema.org expects a `description` on the main entity when possible.
 * Avoid empty strings (invalid for Text fields in many validators).
 */
function programDescriptionForSchema(
  s: Scholarship,
  displayTitle: string,
  scholarshipDescription: string | undefined
): string {
  if (scholarshipDescription?.trim()) return scholarshipDescription;
  const provider = s.provider?.trim();
  const bits = [
    `Scholarship listing: ${displayTitle}.`,
    provider ? `Listed sponsor or program source: ${provider}.` : null,
    'Eligibility, deadlines, and award details on this page are summarized from public listing data; confirm all requirements on the official application before you apply.'
  ].filter(Boolean);
  return bits.join(' ');
}

function scholarshipDeadlineIso(s: Scholarship): string | null {
  const iso = s.deadlineAt?.trim();
  if (iso) {
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  const raw = s.deadline?.trim();
  if (!raw || raw === '—') return null;
  const parsedMs = Date.parse(raw);
  if (Number.isNaN(parsedMs)) return null;
  return new Date(parsedMs).toISOString();
}

function legacyFaqItems(s: Scholarship): { question: string; answer: string }[] {
  const out: { question: string; answer: string }[] = [];

  const who =
    s.whoCanApplyText?.trim() ||
    (s.eligibility?.length ? s.eligibility.join(' ') : '') ||
    s.eligibilityText?.trim();
  if (who) {
    out.push({
      question: 'Who is eligible for this scholarship?',
      answer: who.length > 800 ? `${who.slice(0, 797)}…` : who
    });
  }

  const deadlineLine = s.deadline?.trim();
  if (deadlineLine && deadlineLine !== '—') {
    out.push({
      question: 'What is the deadline?',
      answer: deadlineLine
    });
  }

  const amount = (s.amount ?? s.awardAmount)?.trim();
  if (amount) {
    out.push({
      question: 'How much is the award amount?',
      answer: formatScholarshipAwardDisplay(amount)
    });
  }

  const docs = s.documentsRequired?.filter(Boolean).length
    ? s.documentsRequired!.join('; ')
    : null;
  if (docs) {
    out.push({
      question: 'What documents are required?',
      answer: docs
    });
  }

  const payout = payoutMethodLabel(s.payoutMethod);
  if (payout) {
    out.push({
      question: 'What type of payout is used?',
      answer: payout
    });
  }

  if (s.essayRequired === true || s.essayRequired === false) {
    out.push({
      question: 'Is an essay required?',
      answer: s.essayRequired
        ? 'Yes, an essay is listed among requirements.'
        : 'No essay requirement was detected in the structured data for this listing.'
    });
  }

  return out;
}

function faqItems(s: Scholarship): { question: string; answer: string }[] {
  const fromSeo =
    s.seoFaq
      ?.filter((x) => x.question?.trim() && x.answer?.trim())
      .map((x) => {
        const answer = x.answer.trim();
        return {
          question: x.question.trim(),
          answer: answer.length > 800 ? `${answer.slice(0, 797)}…` : answer
        };
      }) ?? [];
  if (fromSeo.length >= 2) return fromSeo;
  if (fromSeo.length === 1) {
    const legacy = legacyFaqItems(s).filter(
      (l) =>
        l.question.trim().toLowerCase() !==
        fromSeo[0].question.trim().toLowerCase()
    );
    return [...fromSeo, ...legacy];
  }
  return legacyFaqItems(s);
}

function jsonLdDocument(s: Scholarship) {
  const path = scholarshipPublicPath(s);
  const absolutePath = getURL(path);
  const siteBase = getURL().replace(/\/+$/, '');
  const displayTitle = s.title?.trim() || 'Scholarship';
  const publisherId = `${siteBase}#scholarshiptop-publisher`;
  const programId = `${absolutePath}#program`;
  const faqPageId = `${absolutePath}#faqpage`;
  const faqs = faqItems(s).filter(
    (f) =>
      f.question.trim().length > 0 &&
      f.answer.trim().length > 0
  );
  const graph: Record<string, unknown>[] = [];
  const scholarshipDescription = scholarshipSchemaDescription(s);
  const deadlineIso = scholarshipDeadlineIso(s);

  graph.push({
    '@id': publisherId,
    '@type': 'Organization',
    name: 'ScholarshipTop',
    url: siteBase,
    email: 'support@scholarshiptop.com',
    logo: {
      '@type': 'ImageObject',
      url: `${siteBase}/icon-192x192.png`
    }
  });

  /**
   * Primary listing entity: `EducationalOccupationalProgram` (only props valid for this type
   * on validator.schema.org — no `inLanguage` / `publisher` here; sponsor stays on `provider`).
   * Monetary amount uses `Offer.priceSpecification` (UnitPriceSpecification), not `itemOffered` +
   * FinancialAid (invalid / unrecognized in strict validators).
   */
  const program: Record<string, unknown> = {
    '@id': programId,
    '@type': 'EducationalOccupationalProgram',
    name: displayTitle,
    url: absolutePath,
    description: programDescriptionForSchema(
      s,
      displayTitle,
      scholarshipDescription
    )
  };

  if (deadlineIso) {
    program.applicationDeadline = deadlineIso;
  }

  const providerName = s.provider?.trim();
  if (providerName) {
    const provider: Record<string, unknown> = {
      '@type': 'EducationalOrganization',
      name: providerName
    };
    const pUrl = s.providerUrl?.trim();
    if (pUrl) {
      provider.url = pUrl;
    }
    program.provider = provider;
  }

  const awardNumeric = s.awardAmountNumericSort;
  const hasNumericAward =
    awardNumeric != null &&
    !Number.isNaN(awardNumeric) &&
    s.payoutMethod !== 'non_monetary';

  if (hasNumericAward) {
    program.offers = {
      '@type': 'Offer',
      name: `${displayTitle} — award`,
      url: absolutePath,
      description: `Award amount for ${displayTitle} as listed on ScholarshipTop.`,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: awardNumeric,
        priceCurrency: 'USD'
      }
    };
  }

  graph.push(program);

  const categorySlug = resolveScholarshipCategorySlug(s);
  const crumbItems: { name: string; item: string }[] = [
    { name: 'Home', item: getURL('/') },
    { name: 'Find Scholarships', item: getURL('/scholarships') }
  ];
  if (categorySlug) {
    crumbItems.push({
      name: breadcrumbCategoryLabel(categorySlug),
      item: getURL(`/scholarships/category/${categorySlug}`)
    });
  }
  crumbItems.push({ name: displayTitle, item: absolutePath });

  graph.push({
    '@id': `${absolutePath}#breadcrumb`,
    '@type': 'BreadcrumbList',
    itemListElement: crumbItems.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.item
    }))
  });

  /**
   * FAQPage: Google rich result for FAQ is limited to certain site categories, but
   * valid markup still helps Discoverability / assistants / GEO. Required: mainEntity
   * with Question (name + acceptedAnswer.Answer.text). We also set url/name/@id per WebPage.
   * Keep in sync with visible FAQ block (≥2 Q&As) on the detail page.
   */
  if (faqs.length >= 2) {
    graph.push({
      '@id': faqPageId,
      '@type': 'FAQPage',
      url: absolutePath,
      name: `${displayTitle} — Frequently asked questions`,
      isPartOf: { '@id': `${siteBase}#website` },
      about: { '@id': programId },
      mainEntity: faqs.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer
        }
      }))
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph
  };
}

export async function generateMetadata({
  params
}: Pick<LayoutProps, 'params'>): Promise<Metadata> {
  return generateScholarshipSlugLayoutMetadata(params);
}

export default async function ScholarshipsSlugPathLayout({
  children,
  params
}: LayoutProps) {
  const segments = (params.slugPath ?? []).map((s) =>
    normalizeScholarshipDynamicParam(decodeURIComponent(s))
  );
  if (segments.length === 0) {
    return <>{children}</>;
  }

  const resolved = resolveScholarshipSlugPath(segments);
  if (
    resolved.kind === 'legacy_long_tail' ||
    resolved.kind === 'manifest_seo' ||
    resolved.kind === 'redirect_canonical' ||
    resolved.kind === 'not_found'
  ) {
    return <>{children}</>;
  }

  if (segments.length !== 1) {
    return <>{children}</>;
  }

  const raw = segments[0]!;

  const record = await getScholarshipDetailServer(raw);

  if (!record) {
    return <>{children}</>;
  }

  const json = JSON.stringify(jsonLdDocument(record));

  return (
    <ScholarshipDetailInitialDataProvider
      value={redactPremiumScholarshipFields(record)}
    >
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: json }}
      />
      {children}
    </ScholarshipDetailInitialDataProvider>
  );
}
