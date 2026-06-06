import { notFound } from 'next/navigation';
import { breadcrumbCategoryLabel } from '@/app/scholarships/scholarshipCategories';
import { normalizeScholarshipDynamicParam } from '@/app/scholarships/scholarshipLongTailPresets';
import { hubPathToTab } from '@/app/scholarships/scholarshipHubPath';
import { resolveScholarshipSlugPath } from '@/lib/scholarships/seoScholarshipResolve';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import {
  getScholarshipDeadlineDisplayParts,
  scholarshipPublicPath
} from '@/app/scholarships/scholarshipsData';
import { ScholarshipDetailInitialDataProvider } from '@/app/scholarships/ScholarshipDetailInitialDataContext';
import {
  getScholarshipDetailServer,
  redactPremiumScholarshipFields
} from '@/lib/scholarships/scholarshipDetailServer';
import { getScholarshipDetailIndexPolicy } from '@/lib/seo/scholarshipSeoQualityPolicy';
import { resolveScholarshipCategorySlug } from '@/lib/scholarships/similarScholarships';
import {
  getUsefulFaqForOnPageDisplay,
  normalizeScholarshipForUi
} from '@/lib/scholarships/scholarshipUiModel';
import {
  isSimplerGrantsGovScholarship,
  simplerGrantsGovOverviewText
} from '@/lib/scholarships/simplerGrantsGovDetail';
import { getURL } from '@/utils/helpers';
import { parseScholarshipDeadlineAnchor } from '@/lib/scholarships/scholarshipDeadlineTrust';

type LayoutProps = {
  children: React.ReactNode;
  params: { slugPath?: string[] };
};

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
  const anchor = parseScholarshipDeadlineAnchor(s.deadlineAt, s.deadline);
  return anchor ? anchor.toISOString() : null;
}

function faqItems(s: Scholarship): { question: string; answer: string }[] {
  const isSimplerGov = isSimplerGrantsGovScholarship(s);
  const ui = normalizeScholarshipForUi(s, {
    isSimplerGov,
    simplerOverviewText: isSimplerGov ? simplerGrantsGovOverviewText(s) : ''
  });
  const deadlineDisplay = getScholarshipDeadlineDisplayParts(s);
  const awardLine = s.amount?.trim() || s.awardAmount?.trim() || '';

  return getUsefulFaqForOnPageDisplay(s, {
    heroSummary: ui.heroSummary,
    awardLine,
    deadlinePrimary: deadlineDisplay.primary
  })
    .map((x) => {
      const answer = x.answer.trim();
      return {
        question: x.question.trim(),
        answer: answer.length > 800 ? `${answer.slice(0, 797)}…` : answer
      };
    })
    .slice(0, 6);
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
    (f) => f.question.trim().length > 0 && f.answer.trim().length > 0
  );
  const graph: Record<string, unknown>[] = [];
  const scholarshipDescription = scholarshipSchemaDescription(s);
  const deadlineIso = scholarshipDeadlineIso(s);
  const indexPolicy = getScholarshipDetailIndexPolicy(s);

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

  const modifiedIso = s.lastVerifiedAt?.trim() || s.updatedAt?.trim();
  if (modifiedIso) {
    program.dateModified = modifiedIso;
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
  if (indexPolicy.indexable && faqs.length >= 2) {
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

  /**
   * Valid `/scholarships/hub/...` paths still resolve as `not_found` in the SEO resolver.
   * Skip — the page body validates tab segments and calls `notFound()` for invalid hubs.
   */
  if (hubPathToTab(segments)) {
    return <>{children}</>;
  }

  const resolved = resolveScholarshipSlugPath(segments);
  /**
   * Issue A: `loading.tsx` Suspense-streams a 200 shell before the page runs. Calling
   * `notFound()` here (layout, above that boundary) yields HTTP 404 for unknown routes.
   */
  if (resolved.kind === 'not_found') {
    notFound();
  }

  if (
    resolved.kind === 'country_seo' ||
    resolved.kind === 'cross_country_seo' ||
    resolved.kind === 'legacy_long_tail' ||
    resolved.kind === 'manifest_seo' ||
    resolved.kind === 'redirect_canonical'
  ) {
    return <>{children}</>;
  }

  if (segments.length !== 1) {
    return <>{children}</>;
  }

  const raw = segments[0]!;

  const record = await getScholarshipDetailServer(raw);

  if (!record) {
    notFound();
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
