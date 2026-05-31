import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BrainCircuit } from 'lucide-react';

import ContentHubArticleMatchedScholarships from '@/components/content-hub/ContentHubArticleMatchedScholarships';
import { SiteFaqAccordion } from '@/components/ui/SiteFaqAccordion';
import ContentHubScholarshipCta from '@/components/content-hub/ContentHubScholarshipCta';
import StaticScholarshipGuidePage from '@/components/content-hub/StaticScholarshipGuidePage';
import ResourceGuidesContinueSection from '@/components/content-hub/resourceGuides/ResourceGuidesContinueSection';
import ResourceArticleTableOfContents from '@/components/content-hub/ResourceArticleTableOfContents';
import { ResourceExternalContextCard } from '@/components/resources/ResourceExternalContextCard';
import SafeContentPostBody from '@/components/content-hub/SafeContentPostBody';
import { getRelatedScholarshipsForResourceArticle } from '@/lib/content-hub/relatedScholarshipsForResourceArticle';
import { contentPostFaqFromJson } from '@/lib/content-hub/contentPostFaq';
import {
  extractInlineFaqFromBodyHtml,
  mergeUniqueFaqItems
} from '@/lib/content-hub/extractInlineFaqFromBodyHtml';
import {
  RESOURCES_SECTION_PATH,
  resourcesArticlePath
} from '@/lib/content-hub/resourcesSection';
import { getURL } from '@/utils/helpers';
import { buildStage2EnglishPilotAlternates } from '@/lib/i18n/englishAlternates';
import { buildResourcePilotAlternates } from '@/lib/i18n/resourcePilot/resourceTranslationAlternates';
import { resourceArticleDateLine } from '@/lib/content-hub/resourceArticleDates';
import { getResourceDetailUiCopy } from '@/lib/i18n/resourceDetailUiCopy';
import { isIqSitePromoVisible } from '@/lib/iq/iqSitePromoVisibility';
import { getCanonical } from '@/lib/seo/canonical';
import { applyAutoInternalLinks } from '@/lib/content-hub/autoInternalLinks';
import { deduplicateQuickSummaryBlocksInHtml } from '@/lib/content-hub/deduplicateQuickSummaryInHtml';
import {
  injectH2H3IdsAndExtractToc,
  RESOURCE_ARTICLE_TOC_OPTIONS
} from '@/lib/content-hub/resourceArticleBodyToc';
import {
  filterActiveHubScholarships,
  filterActiveRelatedScholarshipItems,
  shouldShowResourceArticleIqCta
} from '@/lib/content-hub/filterResourceArticleRelatedScholarships';
import { classifyResourceArticle } from '@/lib/content-hub/resourceTaxonomy';
import {
  splitForMidCtaInRemainder,
  splitForPrimaryCtaInsertion
} from '@/lib/content-hub/splitContentPostHtml';
import { fetchPublishedContentPostBySlug } from '@/lib/content-hub/contentPostsServer';
import { fetchScholarshipsBySlugsOrIdsOrdered } from '@/lib/scholarships/supabase';
import { getStaticScholarshipGuide } from '@/lib/resources/staticScholarshipGuides';

export const revalidate = 300;

type PageProps = { params: { slug: string } };

export async function generateMetadata({
  params
}: PageProps): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug).trim();
  const staticGuide = getStaticScholarshipGuide(slug);
  if (staticGuide) {
    const path = resourcesArticlePath(staticGuide.slug);
    const canonical = getCanonical(path);
    return {
      title: staticGuide.title,
      description: staticGuide.description,
      alternates: buildStage2EnglishPilotAlternates(path),
      openGraph: {
        title: staticGuide.title,
        description: staticGuide.description,
        url: canonical
      }
    };
  }
  const post = await fetchPublishedContentPostBySlug(slug);
  if (!post) {
    return { title: 'Article' };
  }
  const title =
    post.meta_title?.trim() || post.title?.trim() || 'Article';
  const description = post.meta_description?.trim() || undefined;
  const ogImage = post.cover_image_url?.trim();
  const path = resourcesArticlePath(slug);
  const alternates = await buildResourcePilotAlternates({
    slug,
    currentLocale: 'en'
  });
  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical ?? getCanonical(path),
      ...(ogImage ? { images: [{ url: ogImage }] } : {})
    }
  };
}

export default async function ResourcesArticlePage({ params }: PageProps) {
  const staticGuide = getStaticScholarshipGuide(params.slug);
  if (staticGuide) {
    return <StaticScholarshipGuidePage guide={staticGuide} />;
  }

  const post = await fetchPublishedContentPostBySlug(params.slug);
  if (!post || !post.slug?.trim()) notFound();

  const ui = getResourceDetailUiCopy('en');
  const resourceClassification = classifyResourceArticle(post);
  const showResourceIqCta = shouldShowResourceArticleIqCta(
    resourceClassification,
    post.slug
  );

  const matchedRelatedScholarships = filterActiveRelatedScholarshipItems(
    await getRelatedScholarshipsForResourceArticle(post)
  );
  const hubScholarshipKeys = matchedRelatedScholarships.map((r) =>
    r.slug.trim()
  );
  const hubScholarships = filterActiveHubScholarships(
    hubScholarshipKeys.length > 0
      ? await fetchScholarshipsBySlugsOrIdsOrdered(hubScholarshipKeys)
      : []
  );
  const bodyHtmlDeduped = deduplicateQuickSummaryBlocksInHtml(
    post.body_html?.trim() ?? ''
  );
  const bodyHtmlAfterLinks = applyAutoInternalLinks(bodyHtmlDeduped, {
    enabled: process.env.CONTENT_HUB_ENABLE_AUTO_INTERNAL_LINKS === '1',
    maxLinksPerArticle: Number(
      process.env.CONTENT_HUB_AUTO_LINK_MAX_PER_ARTICLE ?? 3
    )
  });

  const {
    html: bodyWithoutInlineFaq,
    items: inlineFaqItems,
    sectionHeading: inlineFaqSectionHeading
  } = extractInlineFaqFromBodyHtml(bodyHtmlAfterLinks);

  const faq = mergeUniqueFaqItems(
    contentPostFaqFromJson(post.faq),
    inlineFaqItems
  );
  const faqAccordionHeading =
    inlineFaqItems.length > 0 && inlineFaqSectionHeading
      ? inlineFaqSectionHeading
      : ui.faqSectionTitle;

  const {
    html: bodyHtmlAnchored,
    toc: tocItems
  } = injectH2H3IdsAndExtractToc(bodyWithoutInlineFaq, RESOURCE_ARTICLE_TOC_OPTIONS);

  /** Local dev-only: remove before shipping — do not rely on prod logs. */
  if (process.env.NODE_ENV === 'development') {
    console.log('[auto-links]', {
      enabled: process.env.CONTENT_HUB_ENABLE_AUTO_INTERNAL_LINKS,
      beforeHasScholarship: bodyHtmlDeduped.includes('scholarship'),
      afterHasHubLink: bodyHtmlAfterLinks.includes('/scholarships/hub/')
    });
    console.log('[auto-links-count]', {
      matches: (bodyHtmlAfterLinks.match(/\/scholarships\/hub\//g) || []).length
    });
  }

  const primarySplit = bodyHtmlAnchored
    ? splitForPrimaryCtaInsertion(bodyHtmlAnchored)
    : null;
  const midSplit =
    primarySplit != null
      ? splitForMidCtaInRemainder(primarySplit.after)
      : null;

  const articlePath = resourcesArticlePath(post.slug.trim());
  const articleUrl = getURL(articlePath);
  const articleDescription =
    post.meta_description?.trim() ||
    post.title?.trim() ||
    'ScholarshipTop resource article';
  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: ui.homeLabel,
        item: getURL('/')
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: ui.resourcesHubLabel,
        item: getURL(RESOURCES_SECTION_PATH)
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title?.trim() || 'Article',
        item: articleUrl
      }
    ]
  };
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: articleUrl,
    headline: post.title?.trim() || 'Article',
    description: articleDescription,
    url: articleUrl,
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at || post.published_at || undefined,
    ...(post.cover_image_url?.trim()
      ? { image: [post.cover_image_url.trim()] }
      : {}),
    author: {
      '@type': 'Organization',
      name: 'ScholarshipTop'
    },
    publisher: {
      '@type': 'Organization',
      name: 'ScholarshipTop',
      url: getURL()
    }
  };
  const visibleDateLine = resourceArticleDateLine(
    { publishedAt: post.published_at, updatedAt: post.updated_at },
    ui,
    'en'
  );

  const faqSchema =
    faq.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer
            }
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
            href={RESOURCES_SECTION_PATH}
            className="text-sm font-semibold text-orange-600 underline-offset-2 hover:text-orange-700 hover:underline"
          >
            {ui.backLabel}
          </Link>
        </p>

        <nav className="mt-4 text-sm text-gray-500" aria-label={ui.breadcrumbAria}>
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <li>
              <Link
                href="/"
                className="font-medium text-gray-600 transition hover:text-gray-900"
              >
                {ui.homeLabel}
              </Link>
            </li>
            <li className="text-gray-300" aria-hidden>
              /
            </li>
            <li>
              <Link
                href={RESOURCES_SECTION_PATH}
                className="font-medium text-gray-600 transition hover:text-gray-900"
              >
                {ui.resourcesHubLabel}
              </Link>
            </li>
            <li className="text-gray-300" aria-hidden>
              /
            </li>
            <li
              className="max-w-[min(100%,16rem)] truncate font-medium text-gray-900 sm:max-w-md"
              title={post.title ?? undefined}
            >
              {post.title?.trim() || 'Article'}
            </li>
          </ol>
        </nav>

        <header className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.25rem] lg:leading-tight">
            {post.title?.trim() || 'Untitled'}
          </h1>
          {visibleDateLine ? (
            <p className="mt-3 text-xs font-medium text-gray-500 sm:text-sm">
              {visibleDateLine}
            </p>
          ) : null}
        </header>

        <ResourceExternalContextCard
          slug={post.slug.trim()}
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
              alt={
                post.title?.trim()
                  ? ui.coverImageAlt(post.title.trim())
                  : 'Article cover image'
              }
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
              {showResourceIqCta ? <ResourceArticleIqCta ui={ui} /> : null}
              {midSplit ? (
                <>
                  <SafeContentPostBody html={midSplit.before} tightTop />
                  <ContentHubScholarshipCta
                    className="mt-4 sm:mt-5"
                    title={ui.exploreScholarshipsCta.title}
                    description={ui.exploreScholarshipsCta.description}
                    buttonText={ui.exploreScholarshipsCta.buttonText}
                  />
                  <SafeContentPostBody html={midSplit.after} tightTop />
                </>
              ) : (
                <>
                  <SafeContentPostBody html={primarySplit.after} tightTop />
                  {primarySplit.after.length > 650 ? (
                    <ContentHubScholarshipCta
                      className="mt-4 sm:mt-5"
                      title={ui.exploreScholarshipsCta.title}
                      description={ui.exploreScholarshipsCta.description}
                      buttonText={ui.exploreScholarshipsCta.buttonText}
                    />
                  ) : null}
                </>
              )}
            </>
          ) : (
            <>
              <SafeContentPostBody html={bodyHtmlAnchored} />
              {showResourceIqCta ? <ResourceArticleIqCta ui={ui} /> : null}
            </>
          )
        ) : null}

        {faq.length > 0 ? (
          <SiteFaqAccordion
            items={faq}
            heading={faqAccordionHeading}
            className="mt-10"
            headingId="content-faq-heading"
            idPrefix="content-post-faq"
          />
        ) : null}

        <ResourceGuidesContinueSection
          currentSlug={post.slug.trim()}
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

function ResourceArticleIqCta({ ui }: { ui: ReturnType<typeof getResourceDetailUiCopy> }) {
  if (!isIqSitePromoVisible()) return null;

  return (
    <Link
      href="/iq/assessment?intent=scholarship_match"
      className="group relative mt-4 block overflow-hidden rounded-3xl border border-[#FFB875]/80 bg-gradient-to-br from-[#FFF7ED] via-white to-[#EEF6FF] p-5 text-left shadow-[0_18px_45px_-30px_rgba(234,88,12,0.65)] ring-1 ring-[#FFE2C2] transition hover:-translate-y-0.5 hover:shadow-[0_24px_58px_-32px_rgba(234,88,12,0.76)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB875] focus-visible:ring-offset-2 sm:mt-5 sm:p-6"
      aria-labelledby="resource-article-iq-cta-heading"
    >
      <div
        className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#FF7A1A] via-slate-950 to-[#0EA5E9]"
        aria-hidden
      />
      <div
        className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[#FF7A1A]/18 blur-3xl"
        aria-hidden
      />
      <div
        className="absolute bottom-0 right-16 h-28 w-28 rounded-full bg-sky-300/20 blur-2xl"
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
              <p className="mt-1 text-base font-bold leading-none text-slate-950">
                --
              </p>
            </div>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-2 py-2">
              <p className="text-[10px] font-medium text-slate-500">{ui.iqCta.typeLabel}</p>
              <p className="mt-1 text-sm font-bold leading-none text-slate-950">
                ???
              </p>
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
