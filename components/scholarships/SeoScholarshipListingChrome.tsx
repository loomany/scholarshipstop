'use client';

import type { LongTailSlug } from '@/app/scholarships/scholarshipLongTailPresets';
import SeoAdditionalResourceGuidesLinks from '@/components/scholarships/SeoAdditionalResourceGuidesLinks';
import { SeoRelatedScholarshipsSection } from '@/components/scholarships/SeoRelatedScholarshipsSection';
import {
  SafeScholarshipHtml,
  scholarshipRichProseClassName
} from '@/components/scholarships/SafeScholarshipHtml';
import { ScholarshipSeoBlock } from '@/components/scholarships/ScholarshipSeoBlock';
import { SiteFaqAccordion } from '@/components/ui/SiteFaqAccordion';
import { stripSeoAdditionalResourcesSection } from '@/lib/scholarships/stripSeoAdditionalResourcesSection';
import { stripNumericSuffixFromSeoHeading } from '@/lib/scholarships/seoAiNumericSanitizer';
import type { SeoListingPageData } from '@/lib/scholarships/seoScholarshipPageData';
import type { LongTailListingMode } from '@/lib/scholarships/seoScholarshipListing';

const HERO_MAX_CHARS = 72;
const PROSE = 'max-w-3xl text-left';

/** Short H1 for hero: trim and soft-truncate on word boundary. */
export function shortenSeoListingHeading(raw: string, maxChars = HERO_MAX_CHARS): string {
  const t = raw.trim().replace(/\s+/g, ' ');
  if (t.length <= maxChars) return t;
  const slice = t.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(' ');
  const base = lastSpace > 40 ? slice.slice(0, lastSpace) : slice.trim();
  return `${base}…`;
}

function introParagraphs(text: string, maxParas: number): string[] {
  const parts = text
    .trim()
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p.includes('<') ? p : p.replace(/\s+/g, ' ')));
  return parts.slice(0, maxParas);
}

function formatUsd(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

function formatAwardRange(pageData: SeoListingPageData | null | undefined): string | null {
  if (!pageData) return null;
  const { medianUsd, minUsd, maxUsd } = pageData.award;
  if (medianUsd != null && minUsd != null && maxUsd != null) {
    return `${formatUsd(minUsd)}-${formatUsd(maxUsd)} range, median ${formatUsd(medianUsd)}`;
  }
  if (minUsd != null && maxUsd != null) {
    return `${formatUsd(minUsd)}-${formatUsd(maxUsd)} typical range`;
  }
  if (pageData.award.statedAmountCount > 0) {
    return `${pageData.award.statedAmountCount} listings have stated award amounts`;
  }
  return 'Award amounts vary across listings';
}

function formatDeadlineSummary(pageData: SeoListingPageData | null | undefined): string | null {
  if (!pageData) return null;
  if (pageData.deadline.within30Days > 0) {
    return `${pageData.deadline.within30Days} close within 30 days`;
  }
  if (pageData.deadline.within60Days > 0) {
    return `${pageData.deadline.within60Days} close within 60 days`;
  }
  if (pageData.deadline.rollingOrUnknown > 0) {
    return `${pageData.deadline.rollingOrUnknown} have rolling or unclear deadlines`;
  }
  return 'Deadlines vary by listing';
}

function formatUpdatedDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function usefulnessSummary(pageData: SeoListingPageData | null | undefined): string | null {
  if (!pageData) return null;
  const parts = [
    ...pageData.requirements.commonStudyLevels.slice(0, 2),
    ...pageData.requirements.commonFields.slice(0, 2)
  ];
  if (parts.length === 0) return null;
  return parts.join(' · ');
}

function formatList(items: string[]): string | null {
  const clean = items.map((item) => item.trim()).filter(Boolean);
  if (clean.length === 0) return null;
  if (clean.length === 1) return clean[0]!;
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(', ')}, and ${clean[clean.length - 1]}`;
}

function essaySummary(pageData: SeoListingPageData | null | undefined): string | null {
  if (!pageData) return null;
  const { yesCount, noCount, unknownCount } = pageData.essays;
  if (noCount > yesCount) {
    return `${noCount} listings do not flag an essay requirement, ${yesCount} do, and ${unknownCount} are unclear.`;
  }
  if (yesCount > 0 || unknownCount > 0) {
    return `${yesCount} listings flag essays, ${noCount} do not, and ${unknownCount} are unclear.`;
  }
  return null;
}

function requirementPatternSummary(pageData: SeoListingPageData | null | undefined): string | null {
  if (!pageData) return null;
  const parts: string[] = [];
  const levels = formatList(pageData.requirements.commonStudyLevels.slice(0, 3));
  if (levels) parts.push(`Common study levels include ${levels}.`);
  const fields = formatList(pageData.requirements.commonFields.slice(0, 3));
  if (fields) parts.push(`Frequent fields include ${fields}.`);
  const residency = formatList(pageData.requirements.commonResidency.slice(0, 2));
  if (residency) parts.push(`Common eligibility labels include ${residency}.`);
  const reqTypes = formatList(pageData.requirements.commonRequirementTypes.slice(0, 3));
  if (reqTypes) parts.push(`Common requirement patterns include ${reqTypes}.`);
  const essay = essaySummary(pageData);
  if (essay) parts.push(essay);
  return parts.length > 0 ? parts.join(' ') : null;
}

function whoThisPageIsFor(pageData: SeoListingPageData | null | undefined): string | null {
  if (!pageData) return null;
  const levels = formatList(pageData.requirements.commonStudyLevels.slice(0, 2));
  const fields = formatList(pageData.requirements.commonFields.slice(0, 2));
  const residency = formatList(pageData.requirements.commonResidency.slice(0, 1));
  const parts: string[] = [];
  if (levels) parts.push(levels);
  if (fields) parts.push(fields);
  if (residency) parts.push(residency);
  if (parts.length === 0) return null;
  return parts.join(' · ');
}

function buildDeterministicIntro(
  heading: string,
  pageData: SeoListingPageData | null | undefined,
  updatedAt: string | null | undefined
): string | null {
  if (!pageData) return null;
  const segments: string[] = [];
  segments.push(
    `${pageData.exactCount.toLocaleString('en-US')} exact scholarships currently match ${stripNumericSuffixFromSeoHeading(
      heading
    ).toLowerCase()}.`
  );
  const award = formatAwardRange(pageData);
  if (award) segments.push(`${award}.`);
  if (pageData.deadline.within30Days > 0) {
    segments.push(
      `${pageData.deadline.within30Days} close within 30 days and ${pageData.deadline.within60Days} within 60 days.`
    );
  } else if (pageData.deadline.rollingOrUnknown > 0) {
    segments.push(
      `${pageData.deadline.rollingOrUnknown} listings have rolling or unstated deadlines.`
    );
  }
  const audience = whoThisPageIsFor(pageData);
  if (audience) segments.push(`This page is most useful for ${audience}.`);
  const updated = formatUpdatedDate(updatedAt);
  if (updated) segments.push(`Catalog snapshot updated ${updated}.`);
  return segments.join(' ');
}

function SeoFactsGrid({
  scholarshipCount,
  exactFilterMatchTotal,
  pageData,
  updatedAt
}: {
  scholarshipCount: number | null;
  exactFilterMatchTotal: number | null;
  pageData?: SeoListingPageData | null;
  updatedAt?: string | null;
}) {
  const exactCount =
    exactFilterMatchTotal != null
      ? exactFilterMatchTotal
      : scholarshipCount != null
        ? scholarshipCount
        : pageData?.exactCount ?? null;
  const cards = [
    exactCount != null
      ? {
          label: 'Exact scholarships',
          value: exactCount.toLocaleString('en-US')
        }
      : null,
    formatAwardRange(pageData)
      ? {
          label: 'Award snapshot',
          value: formatAwardRange(pageData)!
        }
      : null,
    formatDeadlineSummary(pageData)
      ? {
          label: 'Nearest deadlines',
          value: formatDeadlineSummary(pageData)!
        }
      : null,
    usefulnessSummary(pageData)
      ? {
          label: 'Most useful for',
          value: usefulnessSummary(pageData)!
        }
      : null,
    formatUpdatedDate(updatedAt)
      ? {
          label: 'Last updated',
          value: formatUpdatedDate(updatedAt)!
        }
      : null
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-slate-200/70 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {card.label}
          </p>
          <p className="mt-1 leading-relaxed text-slate-700">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

type HeroProps = {
  heading: string;
  /** Total filtered count (null while loading). */
  scholarshipCount: number | null;
  /** When true and count is 0, subline may show an in-progress message (vs idle empty). */
  listLoading?: boolean;
  introHtml?: string | null;
  fallbackUsed?: boolean;
  thinListing?: boolean;
  /**
   * When SEO SQL relaxed filters, count that matched the strict filter (0 = none).
   * Shown only alongside `fallbackUsed` for transparency.
   */
  exactFilterMatchTotal?: number | null;
  qualityBucket?: string | null;
  pageData?: SeoListingPageData | null;
  updatedAt?: string | null;
  canonicalTarget?: string | null;
};

/**
 * Above-the-fold SEO: H1, count subheading, intro (max 2 paragraphs).
 * Catalog (search, list) should follow immediately after.
 */
export function SeoScholarshipHero({
  heading,
  scholarshipCount,
  listLoading = false,
  introHtml = null,
  fallbackUsed = false,
  thinListing = false,
  exactFilterMatchTotal = null,
  qualityBucket = null,
  pageData = null,
  updatedAt = null,
  canonicalTarget = null
}: HeroProps) {
  const topicCore = shortenSeoListingHeading(
    stripNumericSuffixFromSeoHeading(heading)
  );
  const h1 =
    scholarshipCount != null && scholarshipCount > 0
      ? `${topicCore}: ${scholarshipCount.toLocaleString('en-US')} opportunities available`
      : topicCore;
  const sub =
    scholarshipCount === null
      ? 'Loading the scholarship list…'
      : scholarshipCount === 0
        ? listLoading
          ? 'Loading closest matches from the catalog…'
          : 'No scholarships in this view right now. Try clearing search or filters below.'
        : fallbackUsed
          ? `Showing ${scholarshipCount.toLocaleString('en-US')} closest scholarships in this view (relaxed filters).`
          : `Explore ${scholarshipCount.toLocaleString('en-US')} scholarships in this view.`;

  const exactLine =
    fallbackUsed &&
    exactFilterMatchTotal != null &&
    scholarshipCount != null &&
    scholarshipCount > 0
      ? `Exact matches for the original filters: ${exactFilterMatchTotal.toLocaleString('en-US')}.`
      : null;

  const isIndexable = qualityBucket === 'GOOD';
  const deterministicIntro = isIndexable
    ? buildDeterministicIntro(heading, pageData, updatedAt)
    : null;
  const introSource = deterministicIntro ?? introHtml?.trim() ?? null;
  const paras = introSource ? introParagraphs(introSource, 2) : [];

  return (
    <header className={`${PROSE} space-y-2 pb-5 sm:space-y-2.5 sm:pb-6`}>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl lg:text-[1.85rem] lg:leading-snug">
        {h1}
      </h1>
      {!isIndexable ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 sm:text-[13px]">
          Internal listing page. Closest results may be shown for browsing, but
          this route is not treated as an indexable SEO page.
          {canonicalTarget ? ` Canonical intent rolls up to /scholarships/${canonicalTarget}.` : ''}
        </p>
      ) : null}
      {thinListing ? (
        <p className="text-xs font-medium text-amber-800 sm:text-[13px]">
          Narrow result set — confirm details on each official program page.
        </p>
      ) : null}
      <p className="text-sm font-medium text-slate-600 sm:text-[15px]">{sub}</p>
      {exactLine ? (
        <p className="text-sm font-medium text-slate-600 sm:text-[15px]">
          {exactLine}
        </p>
      ) : null}
      {paras.length > 0 ? (
        <div className="space-y-2.5 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
          {paras.map((p, i) => (
            <SafeScholarshipHtml
              key={i}
              html={p}
              className={scholarshipRichProseClassName}
            />
          ))}
        </div>
      ) : null}
      <SeoFactsGrid
        scholarshipCount={scholarshipCount}
        exactFilterMatchTotal={exactFilterMatchTotal}
        pageData={pageData}
        updatedAt={updatedAt}
      />
    </header>
  );
}

export type SeoScholarshipPostListingProps = {
  heading: string;
  supportingParagraph?: string | null;
  /** Shown only above “Related pages”, not before the listing. */
  relatedIntroParagraph?: string | null;
  howToUseLines?: string[] | null;
  whoForLines?: string[] | null;
  faqItems?: { question: string; answer: string }[];
  pageData?: SeoListingPageData | null;
  qualityBucket?: string | null;
  updatedAt?: string | null;
  /** Legacy static block when no AI bullets. */
  legacySeoSlug?: LongTailSlug | null;
  relatedMode?: LongTailListingMode | null;
};

const softCard =
  'rounded-lg border border-slate-200/70 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-700';

function aggregateFaq(
  heading: string,
  pageData: SeoListingPageData
): { question: string; answer: string }[] {
  const who = whoThisPageIsFor(pageData);
  return [
    {
      question: `Who is this page best for?`,
      answer:
        who != null
          ? `This route is most useful for applicants looking at ${who}.`
          : `This route is best for applicants who want exact matches for ${heading}.`
    },
    {
      question: `Do scholarships on this page usually require essays?`,
      answer:
        essaySummary(pageData) ??
        'Essay requirements vary by listing, so applicants should confirm each scholarship individually.'
    },
    {
      question: `What award amounts are common on this page?`,
      answer:
        formatAwardRange(pageData) ??
        'Award amounts vary across listings, and not every sponsor states a numeric amount.'
    },
    {
      question: `Are deadlines coming soon?`,
      answer:
        formatDeadlineSummary(pageData) ??
        'Deadline timing varies across current listings.'
    },
    {
      question: `What eligibility patterns appear most often?`,
      answer:
        requirementPatternSummary(pageData) ??
        'Eligibility patterns vary across listings on this route.'
    }
  ];
}

/**
 * SEO copy below the scholarship list: supporting, how/who grid, related, FAQ.
 */
export function SeoScholarshipPostListingSeo({
  heading,
  supportingParagraph,
  relatedIntroParagraph,
  howToUseLines,
  whoForLines,
  faqItems,
  pageData,
  qualityBucket,
  updatedAt = null,
  legacySeoSlug,
  relatedMode = null
}: SeoScholarshipPostListingProps) {
  const hasHow = howToUseLines && howToUseLines.length > 0;
  const hasWho = whoForLines && whoForLines.length > 0;
  const showLegacyBlock =
    legacySeoSlug && !hasHow && !hasWho && !supportingParagraph?.trim();

  const hasAny =
    supportingParagraph?.trim() ||
    hasHow ||
    hasWho ||
    relatedIntroParagraph?.trim() ||
    (faqItems && faqItems.length > 0) ||
    showLegacyBlock ||
    (qualityBucket === 'GOOD' && pageData);
  const isGoodSeoPage = qualityBucket === 'GOOD';

  if (!hasAny) {
    return (
      <div className={`${PROSE} mt-8 space-y-3 border-t border-slate-200/80 pt-6`}>
        {relatedMode ? <SeoRelatedScholarshipsSection listingMode={relatedMode} /> : null}
      </div>
    );
  }

  const generatedFaq =
    faqItems && faqItems.length > 0
      ? faqItems
      : pageData
        ? aggregateFaq(heading, pageData)
        : undefined;

  return (
    <div
      className={`${PROSE} mt-8 space-y-4 border-t border-slate-200/80 pt-6 sm:space-y-5`}
    >
      {isGoodSeoPage && pageData ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className={softCard}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Quick summary
            </p>
            <p className="mt-1.5 leading-relaxed">
              {pageData.exactCount.toLocaleString('en-US')} exact scholarships are on
              this page. {formatAwardRange(pageData) ?? 'Award details vary by listing.'}{' '}
              {formatDeadlineSummary(pageData) ?? 'Deadline timing varies by listing.'}{' '}
              {whoThisPageIsFor(pageData)
                ? `Best fit signals include ${whoThisPageIsFor(pageData)}.`
                : ''}
            </p>
          </div>
          <div className={softCard}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Last catalog update
            </p>
            <p className="mt-1.5 leading-relaxed">
              This page uses exact route matches from the current scholarship catalog.
            </p>
            {formatUpdatedDate(updatedAt ?? null) ? (
              <p className="mt-1 text-slate-600">
                Snapshot updated {formatUpdatedDate(updatedAt ?? null)}.
              </p>
            ) : null}
          </div>
          <div className={softCard}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Award snapshot
            </p>
            <p className="mt-1.5 leading-relaxed">
              {formatAwardRange(pageData) ?? 'Award sizes vary by listing.'} {` `}
              {pageData.award.statedAmountCount} listings have stated amounts and{' '}
              {pageData.award.unstatedAmountCount} do not.
            </p>
          </div>
          <div className={softCard}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Deadline snapshot
            </p>
            <p className="mt-1.5 leading-relaxed">
              {pageData.deadline.within30Days} close within 30 days,{' '}
              {pageData.deadline.within60Days} within 60 days, and{' '}
              {pageData.deadline.rollingOrUnknown} have rolling or unclear deadlines.
            </p>
          </div>
          <div className={softCard}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Common eligibility patterns
            </p>
            <p className="mt-1.5 leading-relaxed">
              {requirementPatternSummary(pageData) ??
                'Eligibility patterns vary across current listings.'}
            </p>
          </div>
          <div className={softCard}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Top providers
            </p>
            <p className="mt-1.5 leading-relaxed">
              {pageData.topProviders.length > 0
                ? pageData.topProviders
                    .map((provider) => `${provider.name} (${provider.count})`)
                    .join(', ')
                : 'Provider mix varies across current listings.'}
            </p>
          </div>
        </div>
      ) : null}

      {supportingParagraph?.trim() ? (
        <SafeScholarshipHtml
          html={stripSeoAdditionalResourcesSection(supportingParagraph.trim())}
          className={scholarshipRichProseClassName}
        />
      ) : null}

      <SeoAdditionalResourceGuidesLinks />

      {hasHow || hasWho ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          {hasHow ? (
            <div className={softCard}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                How to use this page
              </p>
              {howToUseLines!.length > 1 ? (
                <ul className="mt-1.5 list-disc space-y-1 pl-4 leading-relaxed">
                  {howToUseLines!.map((line, i) => (
                    <li key={`how-${i}-${line.slice(0, 20)}`}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 leading-relaxed">{howToUseLines![0]}</p>
              )}
            </div>
          ) : null}
          {hasWho ? (
            <div className={softCard}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Who this page is for
              </p>
              {whoForLines!.length > 1 ? (
                <ul className="mt-1.5 list-disc space-y-1 pl-4 leading-relaxed">
                  {whoForLines!.map((line, i) => (
                    <li key={`who-${i}-${line.slice(0, 20)}`}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 leading-relaxed">{whoForLines![0]}</p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {showLegacyBlock ? <ScholarshipSeoBlock slug={legacySeoSlug!} /> : null}

      <div className="space-y-2">
        {relatedIntroParagraph?.trim() ? (
          <SafeScholarshipHtml
            html={relatedIntroParagraph.trim()}
            className={scholarshipRichProseClassName}
          />
        ) : null}
        {relatedMode ? <SeoRelatedScholarshipsSection listingMode={relatedMode} /> : null}
      </div>

      {generatedFaq && generatedFaq.length > 0 ? (
        <SiteFaqAccordion
          items={generatedFaq}
          as="div"
          headingClassName="text-base font-semibold text-zinc-900"
          headingId="seo-listing-faq-heading"
          headingToAccordionClassName="mt-2.5"
          idPrefix="seo-listing-faq"
        />
      ) : null}
    </div>
  );
}
