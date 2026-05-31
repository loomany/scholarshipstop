import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BrainCircuit } from 'lucide-react';

import { isIqSitePromoVisible } from '@/lib/iq/iqSitePromoVisibility';

import { scholarshipPublicPath } from '@/app/scholarships/scholarshipsData';
import ContentHubArticleMatchedScholarships from '@/components/content-hub/ContentHubArticleMatchedScholarships';
import SafeContentPostBody from '@/components/content-hub/SafeContentPostBody';
import { EssayGuideCardImage } from '@/components/essays/EssayGuideCardImage';
import { EssayExternalContextCard } from '@/components/essays/EssayExternalContextCard';
import { StaticEssayGuidePage } from '@/components/essays/StaticEssayGuidePage';
import { SiteFaqAccordion } from '@/components/ui/SiteFaqAccordion';
import HomePrimaryCtaClient from '@/components/home/HomePrimaryCtaClient';
import { fetchRelatedPublishedContentPosts } from '@/lib/content-hub/contentPostsServer';
import { applyAutoInternalLinks } from '@/lib/content-hub/autoInternalLinks';
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
import { getStaticEssayGuide } from '@/lib/essays/staticEssayGuides';
import {
  fetchPublishedEssayBySlug,
  fetchScholarshipRowsForEssay
} from '@/lib/essays/essaysServer';
import { getRelatedScholarshipsForEssayGuide } from '@/lib/essays/relatedScholarshipsForEssayGuide';
import { fetchScholarshipsBySlugsOrIdsOrdered } from '@/lib/scholarships/supabase';
import { getURL } from '@/utils/helpers';
import { getCanonical } from '@/lib/seo/canonical';
import {
  buildArticleJsonLd,
  buildBreadcrumbListJsonLd,
  buildFaqPageJsonLd
} from '@/lib/seo/jsonLd';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
import { buildStage2EnglishPilotAlternates } from '@/lib/i18n/englishAlternates';
import { getEssaySeoQualityPolicy } from '@/lib/seo/essaySeoQualityPolicy';
import { countVisibleWords, hasRawPlaceholderText } from '@/lib/seo/visibleText';

export const revalidate = 300;

const SAME_DAY_MS = 24 * 60 * 60 * 1000;

type PageProps = { params: { slug: string } };

function formatArticleDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function articleDateLine({
  publishedAt,
  updatedAt
}: {
  publishedAt: string | null | undefined;
  updatedAt: string | null | undefined;
}): string | null {
  const publishedLabel = formatArticleDate(publishedAt);
  const updatedLabel = formatArticleDate(updatedAt);
  if (!publishedLabel && !updatedLabel) return null;

  const publishedMs = publishedAt ? new Date(publishedAt).getTime() : NaN;
  const updatedMs = updatedAt ? new Date(updatedAt).getTime() : NaN;
  const updatedIsDistinct =
    Number.isFinite(publishedMs) &&
    Number.isFinite(updatedMs) &&
    Math.abs(updatedMs - publishedMs) > SAME_DAY_MS;

  if (publishedLabel && updatedLabel && updatedIsDistinct) {
    return `Published ${publishedLabel} · Updated ${updatedLabel}`;
  }
  if (publishedLabel) return `Published ${publishedLabel}`;
  return updatedLabel ? `Updated ${updatedLabel}` : null;
}

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
  const staticGuide = getStaticEssayGuide(slug);
  if (staticGuide) {
    const path = essayHubArticlePath(staticGuide.slug);
    const canonical = getCanonical(path);
    return {
      title: staticGuide.title,
      description: staticGuide.description,
      alternates: buildStage2EnglishPilotAlternates(path),
      openGraph: {
        type: 'article',
        url: canonical,
        title: staticGuide.title,
        description: staticGuide.description,
        publishedTime: staticGuide.updatedAt,
        modifiedTime: staticGuide.updatedAt
      },
      twitter: {
        card: 'summary_large_image',
        title: staticGuide.title,
        description: staticGuide.description
      }
    };
  }

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
  const url = getCanonical(path);
  const published = essay.created_at || undefined;
  const modified = essay.updated_at || essay.created_at || undefined;
  const quality = getEssaySeoQualityPolicy({
    stablePublicRoute: true,
    hasQueryParams: false,
    hasTitle: Boolean(title.trim()),
    hasH1: Boolean(title.trim()),
    hasBody: Boolean(essay.content_html?.trim()),
    visibleWordCount: countVisibleWords(
      title,
      description,
      essay.content_html
    ),
    hasRawPlaceholder: hasRawPlaceholderText(title, essay.content_html)
  });
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: quality.indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
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
  const staticGuide = getStaticEssayGuide(slug);
  if (staticGuide) {
    return <StaticEssayGuidePage guide={staticGuide} />;
  }

  const essay = await fetchPublishedEssayBySlug(slug);
  if (!essay || !essay.slug?.trim()) notFound();

  const bodyHtmlDeduped = deduplicateQuickSummaryBlocksInHtml(
    essay.content_html?.trim() ?? ''
  );
  const bodyHtmlAfterLinks = applyAutoInternalLinks(bodyHtmlDeduped, {
    enabled: process.env.CONTENT_HUB_ENABLE_AUTO_INTERNAL_LINKS === '1',
    maxLinksPerArticle: Number(
      process.env.CONTENT_HUB_AUTO_LINK_MAX_PER_ARTICLE ?? 3
    )
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('[essay-auto-links]', {
      enabled: process.env.CONTENT_HUB_ENABLE_AUTO_INTERNAL_LINKS,
      beforeLength: bodyHtmlDeduped.length,
      afterHasHubLink: bodyHtmlAfterLinks.includes('/scholarships/hub/'),
      hubLinkCount: (bodyHtmlAfterLinks.match(/\/scholarships\/hub\//g) || [])
        .length,
      hasEssayPhrases: {
        easyApply: /easy apply scholarships/i.test(bodyHtmlDeduped),
        noEssay: /no essay scholarships/i.test(bodyHtmlDeduped),
        deadlines: /scholarship deadlines/i.test(bodyHtmlDeduped),
        international:
          /international student scholarships|scholarships for international students/i.test(
            bodyHtmlDeduped
          )
      }
    });
  }

  const { html: bodyHtml, toc: tocItems } =
    injectH2IdsAndExtractToc(bodyHtmlAfterLinks);
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

  const breadcrumbsSchema = buildBreadcrumbListJsonLd([
    { name: 'Home', path: '/' },
    { name: ESSAYS_PAGE_TITLE, path: ESSAYS_SECTION_PATH },
    { name: essay.title?.trim() || 'Guide', path: articlePath }
  ]);

  const articleSchema = buildArticleJsonLd({
    url: articlePath,
    headline: essay.title?.trim() || 'Essay guide',
    description:
      essay.meta_description?.trim() ||
      essay.title?.trim() ||
      'Scholarship essay guide',
    datePublished: essay.created_at,
    dateModified: essay.updated_at || essay.created_at,
    imageUrls: essay.hero_image_url?.trim() ? [essay.hero_image_url.trim()] : undefined,
    type: 'Article',
    about: parentScholarshipAbout ?? undefined
  });

  const faqSchema = buildFaqPageJsonLd(faq, articleUrl);

  const sourcesInset =
    sources.length > 0 ? (
      <EssaySourcesInset sources={sources} />
    ) : undefined;
  const sourcesStandalone =
    sources.length > 0 ? (
      <EssaySourcesInset sources={sources} standalone />
    ) : undefined;
  const visibleDateLine = articleDateLine({
    publishedAt: essay.created_at,
    updatedAt: essay.updated_at
  });

  return (
    <div className="bg-white text-gray-900 antialiased">
      <JsonLdScript data={[breadcrumbsSchema, articleSchema, faqSchema]} />

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
            {visibleDateLine ? (
              <p className="text-xs font-medium text-gray-500 sm:text-sm">
                {visibleDateLine}
              </p>
            ) : null}
            <p className="max-w-2xl border-l-2 border-indigo-200 pl-3 text-xs leading-relaxed text-gray-600">
              ScholarshipTop editorial guide. Writing guidance does not
              guarantee eligibility, selection, or award payment.
            </p>
          </div>
        </header>

        <EssayExternalContextCard
          slug={essay.slug.trim()}
          title={essay.title}
          subtitle={essay.meta_description}
          category={essay.hub_category_slug}
          subcategory={essay.manual_topic}
        />

        {essay.hero_image_url?.trim() ? (
          <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-sm">
            <EssayGuideCardImage
              src={essay.hero_image_url.trim()}
              alt={`How to write a scholarship essay for ${essay.title?.trim() || 'this program'} — illustrative candid photo of students in a modern university or study environment`}
              aspectClassName="aspect-[16/9]"
              placeholderLabel="Scholarship essay guide"
            />
          </div>
        ) : null}

        <EssayTableOfContents items={tocItems} />

        {bodyHtml ? (
          primarySplit ? (
            <>
              <SafeContentPostBody html={primarySplit.before} />
              <EssayIqCta />
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
              <EssayIqCta />
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

        {relatedArticles.length > 0 ? (
          <section
            className="mt-8 sm:mt-10"
            aria-labelledby="related-articles-heading"
          >
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
                  <li
                    key={r.id}
                    className="rounded-xl border border-orange-100 bg-orange-50/40 p-4 transition hover:border-orange-200 hover:bg-orange-50"
                  >
                    <Link
                      href={`/resources/${encodeURIComponent(s)}`}
                      className="block text-sm font-semibold leading-relaxed text-orange-700 underline-offset-2 hover:text-orange-800 hover:underline"
                    >
                      {r.title?.trim() || s}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {relatedScholarshipItems.length > 0 ? (
          <ContentHubArticleMatchedScholarships
            items={relatedScholarshipItems}
            hubScholarships={essayHubScholarships}
            showIqAdAfterFirst
            sectionClassName="mt-10"
            heading="Related scholarships"
            headingId="related-scholarships-heading"
            subheading={null}
          />
        ) : null}
      </article>
    </div>
  );
}

function EssayIqCta() {
  if (!isIqSitePromoVisible()) return null;

  return (
    <Link
      href="/iq/assessment?intent=essay_prep"
      className="group relative mt-6 block overflow-hidden rounded-3xl border border-[#FFB875]/80 bg-gradient-to-br from-[#FFF7ED] via-white to-[#EEF6FF] p-5 text-left shadow-[0_18px_45px_-30px_rgba(234,88,12,0.65)] ring-1 ring-[#FFE2C2] transition hover:-translate-y-0.5 hover:shadow-[0_24px_58px_-32px_rgba(234,88,12,0.76)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB875] focus-visible:ring-offset-2 sm:mt-8 sm:p-6"
      aria-labelledby="essay-iq-cta-heading"
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
              Featured Tool
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              Essay insight
            </span>
          </div>
          <h2
            id="essay-iq-cta-heading"
            className="text-balance text-2xl font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl"
          >
            Find your Brain Archetype before writing your essay
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Turn self-reflection into a clearer story. Take a comprehensive
            cognitive assessment and get your IQ score, percentile, and strengths
            across logic, speed, spatial reasoning, and patterns.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['Logic', 'Speed', 'Spatial', 'Patterns'].map((item) => (
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
            Preview report
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-2 py-2">
              <p className="text-[10px] font-medium text-slate-500">IQ</p>
              <p className="mt-1 text-base font-bold leading-none text-slate-950">
                --
              </p>
            </div>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-2 py-2">
              <p className="text-[10px] font-medium text-slate-500">Type</p>
              <p className="mt-1 text-sm font-bold leading-none text-slate-950">
                Profile
              </p>
            </div>
          </div>
          <span className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-black px-3 py-2.5 text-center text-sm font-bold text-white shadow-[0_10px_24px_-14px_rgba(15,23,42,0.9)] transition group-hover:bg-slate-900">
            Start IQ Test
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
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
