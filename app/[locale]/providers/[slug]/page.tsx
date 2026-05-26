import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';

import LocalizedProviderProfilePage from '@/components/providers/LocalizedProviderProfilePage';
import { getContentTranslationSeoDecision } from '@/lib/i18n/contentTranslationsServer';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { buildProviderProfileAlternates } from '@/lib/i18n/providerPilot/providerTranslationAlternates';
import {
  fetchPublishedProviderProfile,
  type PublishedProviderProfileContext
} from '@/lib/i18n/providerPilot/resolveLocalizedProviderPage';
import {
  getCachedProviderProfilePage,
  resolveProviderProfileSlug
} from '@/lib/providers/providerProfileServer';
import {
  buildLocalizedProviderProfileScholarshipsHref,
  parseProviderProfilePageParam,
  PROVIDER_PROFILE_SCHOLARSHIPS_PAGE_SIZE
} from '@/lib/providers/providerProfilePagination';
import { getProviderSeoQualityPolicy } from '@/lib/seo/providerSeoQualityPolicy';
import { localizedProviderProfileHref } from '@/lib/i18n/localizedHref';
import {
  METADATA_NOT_FOUND,
  resolveStage2PilotLocaleFromParams
} from '@/lib/i18n/metadataRouteParams';
import {
  isStage2PilotLocale,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';

export const revalidate = 300;
export const dynamicParams = true;

type PageProps = {
  params: { locale: string; slug: string };
  searchParams?: { page?: string | string[] };
};

function aboutParagraphsFromEnglish(
  text: string | null | undefined
): string[] {
  const t = text?.trim();
  if (!t) return [];
  return t
    .split(/\n\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 2);
}

function englishProviderIndexable(
  profile: NonNullable<Awaited<ReturnType<typeof getCachedProviderProfilePage>>>
): boolean {
  const aboutParas = aboutParagraphsFromEnglish(profile.aiDescription);
  const official = profile.officialUrl?.trim() || null;
  const quality = getProviderSeoQualityPolicy({
    slug: profile.slug,
    displayName: profile.displayName,
    activeScholarshipCount: profile.totalScholarshipCount,
    officialUrl: official,
    hasDescription: aboutParas.length > 0,
    hasPublicScholarshipList: profile.totalScholarshipCount > 0,
    hasSourceTrustContext: true,
    routeResolves: true
  });
  return quality.includeInSitemap;
}

export async function generateMetadata({
  params
}: {
  params?: { locale?: string; slug?: string };
}): Promise<Metadata> {
  const locale = resolveStage2PilotLocaleFromParams(params);
  if (!locale) return METADATA_NOT_FOUND;
  const slug = decodeURIComponent(params?.slug ?? '').trim().toLowerCase();
  if (!slug) {
    return { title: 'Page not found', robots: { index: false, follow: false } };
  }

  const resolved = await fetchPublishedProviderProfile(slug, locale);
  if (!resolved) {
    return { title: 'Page not found', robots: { index: false, follow: false } };
  }

  const seo = getContentTranslationSeoDecision({
    translation: resolved.translation,
    englishIndexable: englishProviderIndexable(resolved.profile),
    hasLocalizedTitle: Boolean(resolved.copy.metaTitle.trim()),
    hasLocalizedH1: Boolean(resolved.copy.pageTitle.trim()),
    hasLocalizedBody: resolved.copy.aboutParagraphs.length > 0
  });

  const alternates = await buildProviderProfileAlternates({
    slug,
    currentLocale: locale,
    resolved
  });

  const title = resolved.copy.metaTitle;
  const description = resolved.copy.metaDescription;

  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      locale: locale === 'es' ? 'es_ES' : 'fr_FR'
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: seo.indexable
      ? { index: true, follow: true }
      : { index: false, follow: true }
  };
}

export default async function LocalizedProviderProfileRoute({
  params,
  searchParams
}: PageProps) {
  if (!isStage2PilotLocale(params.locale)) notFound();
  const locale = params.locale as Stage2PilotLocale;

  const raw = decodeURIComponent(params.slug ?? '').trim();
  const slug = raw.toLowerCase();
  if (!slug) notFound();

  const canonicalSlug = await resolveProviderProfileSlug(slug);
  if (!canonicalSlug) notFound();
  if (raw !== canonicalSlug) {
    permanentRedirect(localizedProviderProfileHref(locale, canonicalSlug));
  }

  const resolved: PublishedProviderProfileContext | null =
    await fetchPublishedProviderProfile(canonicalSlug, locale as ContentTranslationLocale);
  if (!resolved) notFound();

  const currentPage = parseProviderProfilePageParam(searchParams?.page);
  const data = await getCachedProviderProfilePage(canonicalSlug, currentPage);
  if (!data) notFound();

  const totalPages =
    data.totalScholarshipCount === 0
      ? 1
      : Math.ceil(
          data.totalScholarshipCount / PROVIDER_PROFILE_SCHOLARSHIPS_PAGE_SIZE
        );

  if (data.totalScholarshipCount > 0 && currentPage > totalPages) {
    redirect(
      buildLocalizedProviderProfileScholarshipsHref(locale, canonicalSlug, totalPages)
    );
  }

  return (
    <LocalizedProviderProfilePage
      locale={locale}
      slug={canonicalSlug}
      data={data}
      copy={resolved.copy}
      currentPage={currentPage}
    />
  );
}
