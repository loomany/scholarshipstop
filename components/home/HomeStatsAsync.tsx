import HomeInternationalGrantsUsp from '@/components/home/HomeInternationalGrantsUsp';
import { getCachedHomeListingStatsForMarketing } from '@/lib/scholarships/homePageStatsCached';

type HomeStatsAsyncProps = {
  sectionPadX: string;
  sectionY: string;
};

/** Streams home applicant / catalog strip after listing stats resolve. */
export default async function HomeStatsAsync({
  sectionPadX,
  sectionY
}: HomeStatsAsyncProps) {
  try {
    const { topApplicantCountries, scholarshipCatalogStats } =
      await getCachedHomeListingStatsForMarketing();
    return (
      <HomeInternationalGrantsUsp
        sectionPadX={sectionPadX}
        sectionY={sectionY}
        topApplicantCountries={topApplicantCountries}
        catalogStats={scholarshipCatalogStats}
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
      />
    );
  }
}
