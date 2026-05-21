import HomeInternationalGrantsUsp from '@/components/home/HomeInternationalGrantsUsp';
import type { HomePageCopy } from '@/lib/i18n/homePageCopy';
import {
  homepageSupabaseFetchTimeoutMs,
  promiseWithTimeout
} from '@/lib/server/promiseWithTimeout';
import { getCachedHomeListingStatsForMarketing } from '@/lib/scholarships/homePageStatsCached';

type HomeStatsAsyncProps = {
  sectionPadX: string;
  sectionY: string;
  copy: HomePageCopy['internationalGrants'];
  getScholarshipsBaseHref: string;
};

/** Streams home applicant / catalog strip after listing stats resolve. */
export default async function HomeStatsAsync({
  sectionPadX,
  sectionY,
  copy,
  getScholarshipsBaseHref
}: HomeStatsAsyncProps) {
  try {
    const { topApplicantCountries, scholarshipCatalogStats } =
      await promiseWithTimeout(
        getCachedHomeListingStatsForMarketing(),
        homepageSupabaseFetchTimeoutMs(),
        'getCachedHomeListingStatsForMarketing'
      );
    return (
      <HomeInternationalGrantsUsp
        sectionPadX={sectionPadX}
        sectionY={sectionY}
        topApplicantCountries={topApplicantCountries}
        catalogStats={scholarshipCatalogStats}
        copy={copy}
        getScholarshipsBaseHref={getScholarshipsBaseHref}
      />
    );
  } catch (err) {
    console.error(
      '[HomeStatsAsync] getCachedHomeListingStatsForMarketing failed',
      err
    );
    return (
      <HomeInternationalGrantsUsp
        sectionPadX={sectionPadX}
        sectionY={sectionY}
        topApplicantCountries={[]}
        catalogStats={null}
        copy={copy}
        getScholarshipsBaseHref={getScholarshipsBaseHref}
      />
    );
  }
}
