import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { scholarshipPublicPath } from '@/app/scholarships/scholarshipsData';
import ContentHubArticleMatchedScholarships from '@/components/content-hub/ContentHubArticleMatchedScholarships';
import SafeContentPostBody from '@/components/content-hub/SafeContentPostBody';
import { SiteFaqAccordion } from '@/components/ui/SiteFaqAccordion';
import HomePrimaryCtaClient from '@/components/home/HomePrimaryCtaClient';
import { fetchRelatedPublishedContentPosts } from '@/lib/content-hub/contentPostsServer';
import { deduplicateQuickSummaryBlocksInHtml } from '@/lib/content-hub/deduplicateQuickSummaryInHtml';
import {
  splitForMidCtaInRemainder,
  splitForPrimaryCtaInsertion
} from '@/lib/content-hub/splitContentPostHtml';
import {
  injectH2IdsAndExtractToc,
  type EssayTocItem
} from '@/lib/essays/essayBodyToc';
import {
  ESSAYS_PAGE_TITLE,
  ESSAYS_SECTION_PATH,
  essayHubArticlePath
} from '@/lib/essays/essayHubSection';
import {
  fetchPublishedEssayBySlug,
  fetchScholarshipRowsForEssay
} from '@/lib/essays/essaysServer';
import { getRelatedScholarshipsForEssayGuide } from '@/lib/essays/relatedScholarshipsForEssayGuide';
import { fetchScholarshipsBySlugsOrIdsOrdered } from '@/lib/scholarships/supabase';
import { getURL } from '@/utils/helpers';

export const revalidate = 300;

const ORG_NAME = 'ScholarshipTop';

type PageProps = { params: { slug: string } };

function EssayTableOfContents({ items }: { items: EssayTocItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav
      className="mt-8 rounded-xl border border-gray-200 bg-gray-50/80 p-4 sm:p-5"
      aria-labelledby="essay-toc-label"
    >
      <p
        id="essay-toc-label"
        className="text-sm font-semibold tracking-tight text-gray-900"
      >
        On this page
      </p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="font-medium text-indigo-700 underline-offset-2 hover:text-indigo-900 hover:underline"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function parseFaq(json: unknown): { question: string; answer: string }[] {
  if (!Array.isArray(json)) return [];
  const out: { question: string; answer: string }[] = [];
  for (const item of json) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const q = typeof o.question === 'string' ? o.question.trim() : '';
    const a = typeof o.answer === 'string' ? o.answer.trim() : '';
    if (q && a) out.push({ question: q, answer: a });
  }
  return out;
}

function parseSources(
  json: unknown
): { title: string; url: string }[] {
  if (!Array.isArray(json)) return [];
  const out: { title: string; url: string }[] = [];
  for (const item of json) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const title = typeof o.title === 'string' ? o.title.trim() : '';
    const url = typeof o.url === 'string' ? o.url.trim() : '';
    if (title && url.startsWith('http')) out.push({ title, url });
  }
  return out;
}

function EssaySourcesInset({
  sources,
  standalone = false
}: {
  sources: { title: string; url: string }[];
  /** No article body above — omit divider and top spacing */
  standalone?: boolean;
}) {
  if (sources.length === 0) return null;
  return (
    <div
      className={
        standalone
          ? ''
          : 'mt-8 border-t border-gray-100 pt-6 sm:mt-10 sm:pt-8'
      }
      aria-labelledby="essay-sources-heading"
    >
      <h2
        id="essay-sources-heading"
        className="text-lg font-bold tracking-tight text-gray-900"
      >
        Sources
      </h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-gray-700">
        {sources.map((s) => (
          <li key={s.url}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-700 underline-offset-2 hover:text-blue-900 hover:underline"
            >
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function generateMetadata({
  params
}: PageProps): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug).trim();
  const essay = await fetchPublishedEssayBySlug(slug);
  if (!essay) {
    return { title: 'Essay guide' };
  }
  const title =
    essay.title?.trim() || 'Scholarship essay guide';
  const description =
    essay.meta_description?.trim() ||
    `How to write a strong essay for your scholarship application: ${title}`;
  const og = essay.hero_image_url?.trim();
  const path = essayHubArticlePath(slug);
  const url = getURL(path);
  const published = essay.created_at || undefined;
  const modified = essay.updated_at || essay.created_at || undefined;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      ...(published ? { publishedTime: published } : {}),
      ...(modified ? { modifiedTime: modified } : {}),
      ...(og ? { images: [{ url: og }] } : {})
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(og ? { images: [og] } : {})
    }
  };
}

export default async function EssayGuidePage({ params }: PageProps) {
  const slug = decodeURIComponent(params.slug).trim();
  const essay = await fetchPublishedEssayBySlug(slug);
  if (!essay || !essay.slug?.trim()) notFound();

  const rawBody = deduplicateQuickSummaryBlocksInHtml(
    essay.content_html?.trim() ?? ''
  );
  const { html: bodyHtml, toc: tocItems } = injectH2IdsAndExtractToc(rawBody);
  const primarySplit = bodyHtml
    ? splitForPrimaryCtaInsertion(bodyHtml)
    : null;
  const midSplit =
    primarySplit != null
      ? splitForMidCtaInRemainder(primarySplit.after)
      : null;

  const faq = parseFaq(essay.faq);
  const sources = parseSources(essay.sources).filter((s) =>
    /^https:\/\//i.test(s.url)
  );

  const relatedScholarshipRows = await fetchScholarshipRowsForEssay(essay.id, 1);
  const primaryScholarshipRow = relatedScholarshipRows[0];
  const parentScholarshipAbout =
    primaryScholarshipRow &&
    (() => {
      const path = scholarshipPublicPath({
        id: primaryScholarshipRow.id,
        slug: primaryScholarshipRow.slug
      });
      return {
        url: getURL(path),
        name:
          primaryScholarshipRow.title?.trim() ||
          'Scholarship program'
      };
    })();

  const relatedScholarshipItems = await getRelatedScholarshipsForEssayGuide(
    essay
  );
  const essayHubKeys = relatedScholarshipItems.map((i) => i.slug.trim());
  const essayHubScholarships =
    essayHubKeys.length > 0
      ? await fetchScholarshipsBySlugsOrIdsOrdered(essayHubKeys)
      : [];
  const relatedArticles = await fetchRelatedPublishedContentPosts('', 3);

  const articlePath = essayHubArticlePath(slug.trim());
  const articleUrl = getURL(articlePath);

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
        name: ESSAYS_PAGE_TITLE,
        item: getURL(ESSAYS_SECTION_PATH)
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: essay.title?.trim() || 'Guide',
        item: articleUrl
      }
    ]
  };

  const orgId = `${getURL().replace(/\/$/, '')}#organization`;
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: articleUrl,
    headline: essay.title?.trim() || 'Essay guide',
    description:
      essay.meta_description?.trim() ||
      essay.title?.trim() ||
      'Scholarship essay guide',
    datePublished: essay.created_at || undefined,
    dateModified: essay.updated_at || essay.created_at || undefined,
    ...(essay.hero_image_url?.trim()
      ? { image: [essay.hero_image_url.trim()] }
      : {}),
    author: {
      '@type': 'Organization',
      '@id': orgId,
      name: ORG_NAME,
      url: getURL()
    },
    publisher: {
      '@type': 'Organization',
      '@id': orgId,
      name: ORG_NAME,
      url: getURL()
    },
    ...(parentScholarshipAbout
      ? {
          about: {
            '@type': 'Thing',
            name: parentScholarshipAbout.name,
            url: parentScholarshipAbout.url
          }
        }
      : {})
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

  const sourcesInset =
    sources.length > 0 ? (
      <EssaySourcesInset sources={sources} />
    ) : undefined;
  const sourcesStandalone =
    sources.length > 0 ? (
      <EssaySourcesInset sources={sources} standalone />
    ) : undefined;

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
            href={ESSAYS_SECTION_PATH}
            className="text-sm font-semibold text-orange-600 underline-offset-2 hover:text-orange-700 hover:underline"
          >
            ← Back to {ESSAYS_PAGE_TITLE}
          </Link>
        </p>

        <header className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.25rem] lg:leading-tight">
            {essay.title?.trim() || 'Essay guide'}
          </h1>
          <div className="mt-4 space-y-2">
            <p className="max-w-2xl border-l-2 border-indigo-200 pl-3 text-xs leading-relaxed text-gray-600">
              Written by {ORG_NAME} AI • Reviewed by Editorial Team
            </p>
          </div>
        </header>

        {essay.hero_image_url?.trim() ? (
          <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={essay.hero_image_url.trim()}
              alt={`How to write a scholarship essay for ${essay.title?.trim() || 'this program'} — illustrative candid photo of students in a modern university or study environment`}
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
        ) : null}

        <EssayTableOfContents items={tocItems} />

        {bodyHtml ? (
          primarySplit ? (
            <>
              <SafeContentPostBody html={primarySplit.before} />
              <EssayBuilderCta />
              {midSplit ? (
                <>
                  <SafeContentPostBody html={midSplit.before} tightTop />
                  <EssayBuilderCta variant="compact" />
                  <SafeContentPostBody
                    html={midSplit.after}
                    tightTop
                    footer={sourcesInset}
                  />
                </>
              ) : (
                <SafeContentPostBody
                  html={primarySplit.after}
                  tightTop
                  footer={sourcesInset}
                />
              )}
            </>
          ) : (
            <>
              <SafeContentPostBody html={bodyHtml} footer={sourcesInset} />
              <EssayBuilderCta />
            </>
          )
        ) : sourcesStandalone ? (
          <SafeContentPostBody html="" footer={sourcesStandalone} />
        ) : null}

        {faq.length > 0 ? (
          <SiteFaqAccordion
            items={faq}
            className="mt-10"
            headingId="essay-faq-heading"
            idPrefix="essay-faq"
          />
        ) : null}

        {relatedScholarshipItems.length > 0 ? (
          <ContentHubArticleMatchedScholarships
            items={relatedScholarshipItems}
            hubScholarships={essayHubScholarships}
            sectionClassName="mt-10"
            heading="Related scholarships"
            headingId="related-scholarships-heading"
            subheading={null}
          />
        ) : null}

        {relatedArticles.length > 0 ? (
          <section className="mt-8 sm:mt-10" aria-labelledby="related-articles-heading">
            <h2
              id="related-articles-heading"
              className="text-lg font-bold text-gray-900"
            >
              Related articles
            </h2>
            <ul className="mt-4 space-y-3">
              {relatedArticles.map((r) => {
                const s = r.slug?.trim();
                if (!s) return null;
                return (
                  <li key={r.id}>
                    <Link
                      href={`/resources/${encodeURIComponent(s)}`}
                      className="text-sm font-medium text-orange-600 underline-offset-2 hover:text-orange-700 hover:underline"
                    >
                      {r.title?.trim() || s}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </article>
    </div>
  );
}

function EssayBuilderCta({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <div className="mt-4 rounded-3xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-center shadow-sm sm:mt-5 sm:px-6 sm:py-5">
        <div className="mx-auto flex items-center justify-center gap-2.5">
          <span className="text-xl leading-none" aria-hidden>
            🎯
          </span>
          <p className="text-[1.65rem] font-bold leading-[1.08] tracking-tight text-indigo-950">
            Get matched with scholarships in 2 minutes
          </p>
        </div>
        <HomePrimaryCtaClient
          className="mt-3 inline-flex items-center justify-center rounded-full bg-black px-7 py-2 text-xl font-bold leading-none text-white shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/45"
        >
          Find My Scholarships
        </HomePrimaryCtaClient>
      </div>
    );
  }

  return (
    <div
      className="mt-6 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm sm:mt-8 sm:p-8"
    >
      <p className="text-sm font-semibold text-indigo-950">
        💡 This template was analyzed by our AI. Write your own unique version in
        2 minutes.
      </p>
      <Link
        href="/essay"
        className="mt-3 inline-flex items-center text-sm font-bold text-indigo-700 underline-offset-2 hover:text-indigo-900 hover:underline"
      >
        Try Essay Builder →
      </Link>
    </div>
  );
}
