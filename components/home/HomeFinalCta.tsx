import HomePrimaryCtaClient from '@/components/home/HomePrimaryCtaClient';
import { homePrimaryCtaClass } from '@/components/home/homeMarketingCtaClasses';

const container = 'mx-auto w-full max-w-7xl';

/** Matches `HomePageClient` horizontal padding + safe-area. */
const homeSectionPadX =
  'pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-6 sm:pr-6';

/**
 * Bottom-of-fold CTA on the marketing home page only (rendered from `app/page.tsx`).
 * Centered headline, subcopy, primary link — same layout on mobile and desktop widths.
 */
export default function HomeFinalCta({
}: {
  primaryCtaHref?: string;
}) {
  return (
    <section
      className={`border-b border-gray-100 bg-white pt-8 pb-[max(2.75rem,calc(env(safe-area-inset-bottom,0px)+1.25rem))] sm:pt-9 sm:pb-11 lg:pt-10 lg:pb-12 ${homeSectionPadX}`}
      aria-labelledby="home-final-cta-heading"
    >
      <div className={`${container} max-w-3xl text-center`}>
        <h2
          id="home-final-cta-heading"
          className="text-pretty text-[1.85rem] font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-4xl sm:leading-[1.06] lg:text-[2.65rem] lg:leading-[1.05] xl:text-[2.8rem]"
        >
          Start with clearer matches
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg font-medium leading-snug text-gray-700 sm:mt-5 sm:text-xl sm:leading-snug">
          Build your profile once — then focus on deadlines and applications that fit.
        </p>
        <HomePrimaryCtaClient
          className={`${homePrimaryCtaClass} mx-auto mt-9 inline-flex w-full max-w-md sm:mt-10 sm:max-w-lg`}
        >
          Find My Scholarships
        </HomePrimaryCtaClient>
        <p className="mx-auto mt-3.5 max-w-md text-sm leading-relaxed text-gray-500 sm:mt-4 sm:text-base">
          Verified listings • Updated regularly • Official-source application links
        </p>
      </div>
    </section>
  );
}
