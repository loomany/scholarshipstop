import Link from 'next/link';
import { ArrowRight, BrainCircuit } from 'lucide-react';

import ContentHubArticleMatchedScholarships from '@/components/content-hub/ContentHubArticleMatchedScholarships';
import ContentHubScholarshipCta from '@/components/content-hub/ContentHubScholarshipCta';
import ResourceArticleTableOfContents from '@/components/content-hub/ResourceArticleTableOfContents';
import ResourceGuidesContinueSection from '@/components/content-hub/resourceGuides/ResourceGuidesContinueSection';
import SafeContentPostBody from '@/components/content-hub/SafeContentPostBody';
import { ResourceExternalContextCard } from '@/components/resources/ResourceExternalContextCard';
import { classifyResourceArticle } from '@/lib/content-hub/resourceTaxonomy';
import { SiteFaqAccordion } from '@/components/ui/SiteFaqAccordion';
import type { ContentPostRow } from '@/lib/content-hub/contentPostListTypes';
import { resourceArticleDateLine } from '@/lib/content-hub/resourceArticleDates';
import type { RelatedScholarshipStored } from '@/lib/content-hub/articleScholarshipMatching/types';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { getResourceDetailUiCopy } from '@/lib/i18n/resourceDetailUiCopy';
import { isIqSitePromoVisible } from '@/lib/iq/iqSitePromoVisibility';
import {
  extractInlineFaqFromBodyHtml,
  mergeUniqueFaqItems
} from '@/lib/content-hub/extractInlineFaqFromBodyHtml';
import { deduplicateQuickSummaryBlocksInHtml } from '@/lib/content-hub/deduplicateQuickSummaryInHtml';
import {
  injectH2H3IdsAndExtractToc,
  RESOURCE_ARTICLE_TOC_OPTIONS
} from '@/lib/content-hub/resourceArticleBodyToc';
import {
  splitForMidCtaInRemainder,
  splitForPrimaryCtaInsertion
} from '@/lib/content-hub/splitContentPostHtml';
import {
  RESOURCES_SECTION_PATH,
  resourcesArticlePath
} from '@/lib/content-hub/resourcesSection';
import { hrefForLocalizedUiRequired } from '@/lib/i18n/localizedHref';
import { getEnglishFallbackNotice } from '@/lib/i18n/englishFallbackNotice';
import type {
  LocalizedResourcePageCopy,
  LocalizedResourceResolveMode
} from '@/lib/i18n/resourcePilot/resolveLocalizedResourcePage';
import type { Stage2PilotLocale } from '@/lib/i18n/pilotRoutes';
import { getURL } from '@/utils/helpers';

type LocalizedResourceArticlePageProps = {
  locale: Stage2PilotLocale;
  slug: string;
  post: ContentPostRow;
  copy: LocalizedResourcePageCopy;
  mode?: LocalizedResourceResolveMode;
  matchedRelatedScholarships?: RelatedScholarshipStored[];
  hubScholarships?: Scholarship[];
  showResourceIqCta?: boolean;
};

export default function LocalizedResourceArticlePage({
  locale,
  slug,
  post,
  copy,
  mode = 'translated',
  matchedRelatedScholarships = [],
  hubScholarships = [],
  showResourceIqCta = false
}: LocalizedResourceArticlePageProps) {
  const isEnglishFallback = mode === 'englishFallback';
  const ui = getResourceDetailUiCopy(locale);
  const sectionPath = hrefForLocalizedUiRequired(locale, RESOURCES_SECTION_PATH);
  const visibleDateLine = resourceArticleDateLine(
    { publishedAt: post.published_at, updatedAt: post.updated_at },
    ui,
    locale
  );
  const articlePath = hrefForLocalizedUiRequired(locale, resourcesArticlePath(slug));
  const articleUrl = getURL(articlePath.replace(/^\//, ''));

  const bodyHtmlDeduped = deduplicateQuickSummaryBlocksInHtml(copy.bodyHtml);
  const {
    html: bodyWithoutInlineFaq,
    items: inlineFaqItems,
    sectionHeading: inlineFaqSectionHeading
  } = extractInlineFaqFromBodyHtml(bodyHtmlDeduped);

  const faq = mergeUniqueFaqItems(copy.faq, inlineFaqItems);
  const faqAccordionHeading =
    inlineFaqItems.length > 0 && inlineFaqSectionHeading
      ? inlineFaqSectionHeading
      : copy.faqSectionTitle;

  const { html: bodyHtmlAnchored, toc: tocItems } = injectH2H3IdsAndExtractToc(
    bodyWithoutInlineFaq,
    RESOURCE_ARTICLE_TOC_OPTIONS
  );

  const primarySplit = bodyHtmlAnchored
    ? splitForPrimaryCtaInsertion(bodyHtmlAnchored)
    : null;
  const midSplit =
    primarySplit != null
      ? splitForMidCtaInRemainder(primarySplit.after)
      : null;

  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: copy.homeLabel,
        item: getURL(hrefForLocalizedUiRequired(locale, '/').replace(/^\//, '') || '/')
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: copy.resourcesHubLabel,
        item: getURL(sectionPath.replace(/^\//, ''))
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: copy.title,
        item: articleUrl
      }
    ]
  };

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: articleUrl,
    headline: copy.title,
    description: copy.metaDescription || copy.summary,
    url: articleUrl,
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at || post.published_at || undefined,
    inLanguage: isEnglishFallback ? 'en' : locale === 'es' ? 'es' : 'fr',
    ...(post.cover_image_url?.trim()
      ? { image: [post.cover_image_url.trim()] }
      : {}),
    author: { '@type': 'Organization', name: 'ScholarshipTop' },
    publisher: {
      '@type': 'Organization',
      name: 'ScholarshipTop',
      url: getURL()
    }
  };

  const resourceClassification = classifyResourceArticle(post);

  const faqSchema =
    faq.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer }
          }))
        }
      : null;

  return (
    <div className="bg-white text-gray-900 antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      ) : null}
      <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
        <p>
          <Link
            href={sectionPath}
            className="text-sm font-semibold text-orange-600 underline-offset-2 hover:text-orange-700 hover:underline"
          >
            {copy.backLabel}
          </Link>
        </p>

        <nav className="mt-4 text-sm text-gray-500" aria-label={ui.breadcrumbAria}>
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <li>
              <Link
                href={hrefForLocalizedUiRequired(locale, '/')}
                className="font-medium text-gray-600 transition hover:text-gray-900"
              >
                {copy.homeLabel}
              </Link>
            </li>
            <li className="text-gray-300" aria-hidden>
              /
            </li>
            <li>
              <Link
                href={sectionPath}
                className="font-medium text-gray-600 transition hover:text-gray-900"
              >
                {copy.resourcesHubLabel}
              </Link>
            </li>
            <li className="text-gray-300" aria-hidden>
              /
            </li>
            <li
              className="max-w-[min(100%,16rem)] truncate font-medium text-gray-900 sm:max-w-md"
              title={copy.title}
            >
              {copy.title}
            </li>
          </ol>
        </nav>

        {isEnglishFallback ? (
          <p
            className="mt-6 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-950"
            role="status"
          >
            {getEnglishFallbackNotice(locale)}
          </p>
        ) : null}

        <header className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.25rem] lg:leading-tight">
            {copy.title}
          </h1>
          {visibleDateLine ? (
            <p className="mt-3 text-xs font-medium text-gray-500 sm:text-sm">
              {visibleDateLine}
            </p>
          ) : null}
          {copy.summary ? (
            <p className="mt-4 text-lg leading-relaxed text-gray-600">{copy.summary}</p>
          ) : null}
        </header>

        <ResourceExternalContextCard
          slug={post.slug?.trim() ?? slug}
          title={post.title}
          subtitle={post.meta_description}
          metaTitle={post.meta_title}
          category={resourceClassification?.categoryId ?? null}
          subcategory={resourceClassification?.subcategoryId ?? null}
        />

        {post.cover_image_url?.trim() ? (
          <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.cover_image_url.trim()}
              alt={ui.coverImageAlt(copy.title)}
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
        ) : null}

        <ResourceArticleTableOfContents
          items={tocItems}
          headingLabel={ui.tocOnThisPage}
        />

        {bodyHtmlAnchored ? (
          primarySplit ? (
            <>
              <SafeContentPostBody html={primarySplit.before} />
              {showResourceIqCta ? (
                <ResourceArticleIqCta locale={locale} />
              ) : null}
              {midSplit ? (
                <>
                  <SafeContentPostBody html={midSplit.before} tightTop />
                  <ContentHubScholarshipCta
                    className="mt-4 sm:mt-5"
                    title={copy.exploreScholarshipsCta.title}
                    description={copy.exploreScholarshipsCta.description}
                    buttonText={copy.exploreScholarshipsCta.buttonText}
                  />
                  <SafeContentPostBody html={midSplit.after} tightTop />
                </>
              ) : (
                <>
                  <SafeContentPostBody html={primarySplit.after} tightTop />
                  {primarySplit.after.length > 650 ? (
                    <ContentHubScholarshipCta
                      className="mt-4 sm:mt-5"
                      title={copy.exploreScholarshipsCta.title}
                      description={copy.exploreScholarshipsCta.description}
                      buttonText={copy.exploreScholarshipsCta.buttonText}
                    />
                  ) : null}
                </>
              )}
            </>
          ) : (
            <>
              <SafeContentPostBody html={bodyHtmlAnchored} />
              {showResourceIqCta ? (
                <ResourceArticleIqCta locale={locale} />
              ) : null}
            </>
          )
        ) : null}

        <p className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {copy.disclaimer}
        </p>

        {faq.length > 0 ? (
          <SiteFaqAccordion
            items={faq}
            heading={faqAccordionHeading}
            className="mt-10"
            headingId="content-faq-heading"
            idPrefix="localized-resource-faq"
          />
        ) : null}

        <ResourceGuidesContinueSection
          currentSlug={slug}
          heading={ui.continueReading.heading}
        />

        {matchedRelatedScholarships.length > 0 ? (
          <ContentHubArticleMatchedScholarships
            items={matchedRelatedScholarships}
            hubScholarships={hubScholarships}
            showIqAdAfterFirst={showResourceIqCta}
            heading={ui.matchedScholarships.heading}
            subheading={ui.matchedScholarships.subheading}
          />
        ) : (
          <ContentHubScholarshipCta
            className="mt-4 sm:mt-5"
            title={ui.browseScholarshipsCta.title}
            description={ui.browseScholarshipsCta.description}
            buttonText={ui.browseScholarshipsCta.buttonText}
          />
        )}
      </article>
    </div>
  );
}

function ResourceArticleIqCta({ locale }: { locale: Stage2PilotLocale }) {
  if (!isIqSitePromoVisible()) return null;

  const ui = getResourceDetailUiCopy(locale);
  const iqHref = hrefForLocalizedUiRequired(locale, '/iq/assessment?intent=scholarship_match');

  return (
    <Link
      href={iqHref}
      className="group relative mt-4 block overflow-hidden rounded-3xl border border-[#FFB875]/80 bg-gradient-to-br from-[#FFF7ED] via-white to-[#EEF6FF] p-5 text-left shadow-[0_18px_45px_-30px_rgba(234,88,12,0.65)] ring-1 ring-[#FFE2C2] transition hover:-translate-y-0.5 hover:shadow-[0_24px_58px_-32px_rgba(234,88,12,0.76)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB875] focus-visible:ring-offset-2 sm:mt-5 sm:p-6"
      aria-labelledby="resource-article-iq-cta-heading"
    >
      <div
        className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#FF7A1A] via-slate-950 to-[#0EA5E9]"
        aria-hidden
      />
      <div className="relative grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#FFB875] bg-white/85 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#B45309] shadow-sm">
              <BrainCircuit className="h-3.5 w-3.5 text-[#F97316]" aria-hidden />
              {ui.iqCta.featuredTool}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              {ui.iqCta.strategyBadge}
            </span>
          </div>
          <h2
            id="resource-article-iq-cta-heading"
            className="text-balance text-2xl font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl"
          >
            {ui.iqCta.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            {ui.iqCta.body}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {ui.iqCta.chips.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/80 bg-white/75 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="min-w-0 rounded-2xl border border-white/80 bg-white/70 p-3 shadow-sm backdrop-blur sm:w-48">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {ui.iqCta.previewReport}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-2 py-2">
              <p className="text-[10px] font-medium text-slate-500">{ui.iqCta.iqLabel}</p>
              <p className="mt-1 text-base font-bold leading-none text-slate-950">--</p>
            </div>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-2 py-2">
              <p className="text-[10px] font-medium text-slate-500">{ui.iqCta.typeLabel}</p>
              <p className="mt-1 text-sm font-bold leading-none text-slate-950">???</p>
            </div>
          </div>
          <span className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-black px-3 py-2.5 text-center text-sm font-bold text-white shadow-[0_10px_24px_-14px_rgba(15,23,42,0.9)] transition group-hover:bg-slate-900">
            {ui.iqCta.startTest}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
