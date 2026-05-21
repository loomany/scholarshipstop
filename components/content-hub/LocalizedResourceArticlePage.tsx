import Link from 'next/link';

import ContentHubScholarshipCta from '@/components/content-hub/ContentHubScholarshipCta';
import ResourceArticleTableOfContents from '@/components/content-hub/ResourceArticleTableOfContents';
import SafeContentPostBody from '@/components/content-hub/SafeContentPostBody';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { SiteFaqAccordion } from '@/components/ui/SiteFaqAccordion';
import type { ContentPostRow } from '@/lib/content-hub/contentPostListTypes';
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
import type { LocalizedResourcePageCopy } from '@/lib/i18n/resourcePilot/resolveLocalizedResourcePage';
import type { Stage2PilotLocale } from '@/lib/i18n/pilotRoutes';
import { getURL } from '@/utils/helpers';

type LocalizedResourceArticlePageProps = {
  locale: Stage2PilotLocale;
  slug: string;
  post: ContentPostRow;
  copy: LocalizedResourcePageCopy;
};

export default function LocalizedResourceArticlePage({
  locale,
  slug,
  post,
  copy
}: LocalizedResourceArticlePageProps) {
  const sectionPath = hrefForLocalizedUiRequired(locale, RESOURCES_SECTION_PATH);
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
    inLanguage: locale === 'es' ? 'es' : 'fr',
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>
            <Link
              href={sectionPath}
              className="text-sm font-semibold text-orange-600 underline-offset-2 hover:text-orange-700 hover:underline"
            >
              {copy.backLabel}
            </Link>
          </p>
          <LanguageSwitcher pathname={articlePath} currentLocale={locale} />
        </div>

        <nav className="mt-4 text-sm text-gray-500" aria-label="Breadcrumb">
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

        <header className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.25rem] lg:leading-tight">
            {copy.title}
          </h1>
          {copy.summary ? (
            <p className="mt-4 text-lg leading-relaxed text-gray-600">{copy.summary}</p>
          ) : null}
        </header>

        {post.cover_image_url?.trim() ? (
          <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.cover_image_url.trim()}
              alt={copy.title}
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
        ) : null}

        <ResourceArticleTableOfContents items={tocItems} />

        {bodyHtmlAnchored ? (
          primarySplit ? (
            <>
              <SafeContentPostBody html={primarySplit.before} />
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
            <SafeContentPostBody html={bodyHtmlAnchored} />
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

        <ContentHubScholarshipCta
          className="mt-10"
          title={copy.exploreScholarshipsCta.title}
          description={copy.exploreScholarshipsCta.description}
          buttonText={copy.exploreScholarshipsCta.buttonText}
        />
      </article>
    </div>
  );
}
