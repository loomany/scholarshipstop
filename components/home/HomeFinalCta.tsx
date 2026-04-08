import Link from 'next/link';

const container = 'mx-auto w-full max-w-7xl';

/** Matches `HomePageClient` horizontal padding + safe-area. */
const homeSectionPadX =
  'pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-6 sm:pr-6';

/**
 * Bottom-of-fold CTA on the marketing home page only (rendered from `app/page.tsx`).
 * Centered headline, subcopy, primary link — same layout on mobile and desktop widths.
 */
export default function HomeFinalCta({
  primaryCtaHref
}: {
  primaryCtaHref: string;
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
          Find scholarships{' '}
          <br className="sm:hidden" aria-hidden />
          that fit you — faster
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg font-medium leading-snug text-gray-700 sm:mt-5 sm:text-xl sm:leading-snug">
          Stop searching blindly.{' '}
          <br className="sm:hidden" aria-hidden />
          Start focusing on what matters.
        </p>
        <Link
          href={primaryCtaHref}
          className="mx-auto mt-9 inline-flex w-full max-w-md cursor-pointer items-center justify-center rounded-2xl bg-black px-8 py-[1.0625rem] text-center text-xl font-semibold text-white shadow-[0_6px_24px_-6px_rgba(0,0,0,0.22)] transition duration-200 ease-out hover:scale-[1.02] hover:bg-zinc-900 hover:shadow-[0_10px_30px_-8px_rgba(0,0,0,0.28)] active:scale-[0.99] sm:mt-10 sm:max-w-lg sm:px-9 sm:py-5 sm:text-2xl"
        >
          Find my matches →
        </Link>
        <p className="mx-auto mt-3.5 max-w-md text-base font-medium leading-snug text-gray-600 sm:mt-4">
          Takes less than a minute
        </p>
      </div>
    </section>
  );
}
