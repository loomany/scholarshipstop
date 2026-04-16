import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import ContentHubArticleMatchedScholarships from '@/components/content-hub/ContentHubArticleMatchedScholarships';
import { SiteFaqAccordion } from '@/components/ui/SiteFaqAccordion';
import ContentHubScholarshipCta from '@/components/content-hub/ContentHubScholarshipCta';
import ResourceGuidesContinueSection from '@/components/content-hub/resourceGuides/ResourceGuidesContinueSection';
import SafeContentPostBody from '@/components/content-hub/SafeContentPostBody';
import { getRelatedScholarshipsForResourceArticle } from '@/lib/content-hub/relatedScholarshipsForResourceArticle';
import { contentPostFaqFromJson } from '@/lib/content-hub/contentPostFaq';
import {
  RESOURCES_PAGE_TITLE,
  RESOURCES_SECTION_PATH,
  resourcesArticlePath
} from '@/lib/content-hub/resourcesSection';
import { getURL } from '@/utils/helpers';
import { deduplicateQuickSummaryBlocksInHtml } from '@/lib/content-hub/deduplicateQuickSummaryInHtml';
import {
  splitForMidCtaInRemainder,
  splitForPrimaryCtaInsertion
} from '@/lib/content-hub/splitContentPostHtml';
import {
  fetchPublishedContentPostBySlug,
  fetchRelatedPublishedContentPosts
} from '@/lib/content-hub/contentPostsServer';
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

  const faq = contentPostFaqFromJson(post.faq);
  const matchedRelatedScholarships =
    await getRelatedScholarshipsForResourceArticle(post);
  const hubScholarshipKeys = matchedRelatedScholarships.map((r) =>
    r.slug.trim()
  );
  const hubScholarships =
    hubScholarshipKeys.length > 0
      ? await fetchScholarshipsBySlugsOrIdsOrdered(hubScholarshipKeys)
      : [];
  const bodyHtml = deduplicateQuickSummaryBlocksInHtml(
    post.body_html?.trim() ?? ''
  );
  const primarySplit = bodyHtml
    ? splitForPrimaryCtaInsertion(bodyHtml)
    : null;
  const midSplit =
    primarySplit != null
      ? splitForMidCtaInRemainder(primarySplit.after)
      : null;

  const related = await fetchRelatedPublishedContentPosts(post.slug, 3);
  const relatedWithSlug = related.filter((r) => r.slug?.trim());
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

        {bodyHtml ? (
          primarySplit ? (
            <>
              <SafeContentPostBody html={primarySplit.before} />
              <ContentHubScholarshipCta
                className="mt-4 sm:mt-5"
                title="🎯 Find scholarships that match your goals"
                description="Browse real scholarships and discover opportunities that fit your background, degree level, and study plans."
                buttonText="Browse Scholarships"
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
              <SafeContentPostBody html={bodyHtml} />
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

        {relatedWithSlug.length > 0 ? (
          <section className="mt-6 sm:mt-8">
            <h2 className="text-lg font-bold text-gray-900">More articles</h2>
            <ul className="mt-4 space-y-3">
              {relatedWithSlug.map((r) => (
                <li key={r.id}>
                  <Link
                    href={resourcesArticlePath(r.slug!.trim())}
                    className="text-sm font-medium text-orange-600 underline-offset-2 hover:text-orange-700 hover:underline"
                  >
                    {r.title?.trim() || r.slug}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </div>
  );
}
