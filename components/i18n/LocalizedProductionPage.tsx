import ScholarshipsSlugPathPageBody from '@/app/scholarships/scholarshipsSlugPathPageBody';
import { scholarshipHubQueryStringFromNextSearchParamsRecord } from '@/app/scholarships/scholarshipHubCanonicalQueryString';
import { CompareIndexPageContent } from '@/components/compare/CompareIndexPageContent';
import { ResourcesIndexPageContent } from '@/components/content-hub/ResourcesIndexPageContent';
import { EssaysIndexPageContent } from '@/components/essays/EssaysIndexPageContent';
import { LocalizedPilotPageView } from '@/components/i18n/LocalizedPilotPage';
import { HomePageContent } from '@/components/home/HomePageContent';
import { ProvidersHubPageContent } from '@/components/providers/ProvidersHubPageContent';
import type { LocalizedPilotPage } from '@/lib/i18n/staticTranslations';
import { getHomePageCopy } from '@/lib/i18n/homePageCopy';
import type { Stage2PilotLocale } from '@/lib/i18n/pilotRoutes';

type LocalizedProductionPageProps = {
  page: LocalizedPilotPage;
  searchParams?: Record<string, string | string[] | undefined>;
};

export async function LocalizedProductionPage({
  page,
  searchParams
}: LocalizedProductionPageProps) {
  const locale = page.locale as Stage2PilotLocale;

  if (page.kind === 'home' && page.canonicalPath === '/') {
    return (
      <HomePageContent locale={locale} copy={getHomePageCopy(locale)} />
    );
  }

  if (page.kind === 'hub' && page.canonicalPath === '/scholarships') {
    return (
      <ScholarshipsSlugPathPageBody
        segments={[]}
        searchParamsString={scholarshipHubQueryStringFromNextSearchParamsRecord(
          searchParams
        )}
        locale={locale}
      />
    );
  }

  if (page.kind === 'hub' && page.canonicalPath === '/essays') {
    return (
      <EssaysIndexPageContent searchParams={searchParams} locale={locale} />
    );
  }

  if (page.kind === 'hub' && page.canonicalPath === '/providers') {
    return (
      <ProvidersHubPageContent
        searchParams={searchParams ?? {}}
        pathStateCode=""
        stateSlug={null}
        locale={locale}
      />
    );
  }

  if (page.kind === 'hub' && page.canonicalPath === '/compare') {
    return (
      <CompareIndexPageContent searchParams={searchParams} locale={locale} />
    );
  }

  if (page.kind === 'hub' && page.canonicalPath === '/resources') {
    return (
      <ResourcesIndexPageContent searchParams={searchParams} locale={locale} />
    );
  }

  if (
    page.kind === 'trust' ||
    page.kind === 'essay' ||
    page.kind === 'compare' ||
    page.kind === 'resource' ||
    page.kind === 'resourceShell' ||
    page.kind === 'legal' ||
    page.kind === 'marketing'
  ) {
    return <LocalizedPilotPageView page={page} />;
  }

  return <LocalizedPilotPageView page={page} emergencyFallback />;
}
