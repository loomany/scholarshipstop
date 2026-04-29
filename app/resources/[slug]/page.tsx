import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import ContentHubArticleMatchedScholarships from '@/components/content-hub/ContentHubArticleMatchedScholarships';
import { SiteFaqAccordion } from '@/components/ui/SiteFaqAccordion';
import ContentHubScholarshipCta from '@/components/content-hub/ContentHubScholarshipCta';
import ResourceGuidesContinueSection from '@/components/content-hub/resourceGuides/ResourceGuidesContinueSection';
import ResourceArticleTableOfContents from '@/components/content-hub/ResourceArticleTableOfContents';
import SafeContentPostBody from '@/components/content-hub/SafeContentPostBody';
import { getRelatedScholarshipsForResourceArticle } from '@/lib/content-hub/relatedScholarshipsForResourceArticle';
import { contentPostFaqFromJson } from '@/lib/content-hub/contentPostFaq';
import {
  extractInlineFaqFromBodyHtml,
  mergeUniqueFaqItems
} from '@/lib/content-hub/extractInlineFaqFromBodyHtml';
import {
  RESOURCES_PAGE_TITLE,
  RESOURCES_SECTION_PATH,
  resourcesArticlePath
} from '@/lib/content-hub/resourcesSection';
import { getURL } from '@/utils/helpers';
import { applyAutoInternalLinks } from '@/lib/content-hub/autoInternalLinks';
import { deduplicateQuickSummaryBlocksInHtml } from '@/lib/content-hub/deduplicateQuickSummaryInHtml';
import { injectH2H3IdsAndExtractToc } from '@/lib/content-hub/resourceArticleBodyToc';
import {
  splitForMidCtaInRemainder,
  splitForPrimaryCtaInsertion
} from '@/lib/content-hub/splitContentPostHtml';
import { fetchPublishedContentPostBySlug } from '@/lib/content-hub/contentPostsServer';
import { fetchScholarshipsBySlugsOrIdsOrdered } from '@/lib/scholarships/supabase';

export const revalidate = 300;

type PageProps = { params: { slug: string } };

export async function generateMetadata({
  params
}: PageProps): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug).trim();
  const post = await fetchPublishedContentPostBySlug(slug);
  if (!post) {
    return { title: 'Article' };
  }
  const title =
    post.meta_title?.trim() || post.title?.trim() || 'Article';
  const description = post.meta_description?.trim() || undefined;
  const ogImage = post.cover_image_url?.trim();
  return {
    title,
    description,
    alternates: {
      canonical: resourcesArticlePath(slug)
    },
    openGraph: {
      title,
      description,
      ...(ogImage ? { images: [{ url: ogImage }] } : {})
    }
  };
}

export default async function ResourcesArticlePage({ params }: PageProps) {
  const post = await fetchPublishedContentPostBySlug(params.slug);
  if (!post || !post.slug?.trim()) notFound();

  const matchedRelatedScholarships =
    await getRelatedScholarshipsForResourceArticle(post);
  const hubScholarshipKeys = matchedRelatedScholarships.map((r) =>
    r.slug.trim()
  );
  const hubScholarships =
    hubScholarshipKeys.length > 0
      ? await fetchScholarshipsBySlugsOrIdsOrdered(hubScholarshipKeys)
      : [];
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
      : 'FAQ';

  const {
    html: bodyHtmlAnchored,
    toc: tocItems
  } = injectH2H3IdsAndExtractToc(bodyWithoutInlineFaq);

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
        name: 'Home',
        item: getURL('/')
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: RESOURCES_PAGE_TITLE,
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
            ← Back to {RESOURCES_PAGE_TITLE}
          </Link>
        </p>

        <nav className="mt-4 text-sm text-gray-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <li>
              <Link
                href="/"
                className="font-medium text-gray-600 transition hover:text-gray-900"
              >
                Home
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
                {RESOURCES_PAGE_TITLE}
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
        </header>

        {post.cover_image_url?.trim() ? (
          <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.cover_image_url.trim()}
              alt={
                post.title?.trim()
                  ? `Cover image for ${post.title.trim()}`
                  : 'Article cover image'
              }
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
        ) : null}

        <ResourceArticleTableOfContents items={tocItems} />

        {bodyHtmlAnchored ? (
          primarySplit ? (
            <>
              <SafeContentPostBody html={primarySplit.before} />
              <ContentHubScholarshipCta
                className="mt-4 sm:mt-5"
                title="🎯 Get matched with scholarships in 2 minutes"
                description="Answer a few quick questions and find scholarships you can apply for today"
                buttonText="Find My Scholarships"
              />
              {midSplit ? (
                <>
                  <SafeContentPostBody html={midSplit.before} tightTop />
                  <ContentHubScholarshipCta
                    className="mt-4 sm:mt-5"
                    title="💡 See scholarships you may qualify for"
                    description="Use the scholarship directory to explore real opportunities that match your eligibility and academic goals."
                    buttonText="Explore Scholarships"
                  />
                  <SafeContentPostBody html={midSplit.after} tightTop />
                </>
              ) : (
                <>
                  <SafeContentPostBody html={primarySplit.after} tightTop />
                  {primarySplit.after.length > 650 ? (
                    <ContentHubScholarshipCta
                      className="mt-4 sm:mt-5"
                      title="💡 See scholarships you may qualify for"
                      description="Use the scholarship directory to explore real opportunities that match your eligibility and academic goals."
                      buttonText="Explore Scholarships"
                    />
                  ) : null}
                </>
              )}
            </>
          ) : (
            <>
              <SafeContentPostBody html={bodyHtmlAnchored} />
              <ContentHubScholarshipCta
                className="mt-4 sm:mt-5"
                title="💡 See scholarships you may qualify for"
                description="Use the scholarship directory to explore real opportunities that match your eligibility and academic goals."
                buttonText="Explore Scholarships"
              />
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

        <ResourceGuidesContinueSection currentSlug={post.slug.trim()} />

        {matchedRelatedScholarships.length > 0 ? (
          <ContentHubArticleMatchedScholarships
            items={matchedRelatedScholarships}
            hubScholarships={hubScholarships}
          />
        ) : (
          <ContentHubScholarshipCta
            className="mt-4 sm:mt-5"
            title="Browse Scholarships"
            description="Explore verified opportunities in our scholarship directory."
            buttonText="Browse Scholarships"
          />
        )}
      </article>
    </div>
  );
}
