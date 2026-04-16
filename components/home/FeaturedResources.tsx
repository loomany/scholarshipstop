import Link from 'next/link';

import FeaturedResourcesCarousel from '@/components/home/FeaturedResourcesCarousel';
import {
  fetchHomeResourcesCarouselItems
} from '@/lib/home/homeResourcesCarousel';
import { ESSAYS_SECTION_PATH } from '@/lib/essays/essayHubSection';
import { RESOURCES_SECTION_PATH } from '@/lib/content-hub/resourcesSection';

/** Matches `/resources`, `/essays` index wrappers. */
const pageContent = 'mx-auto w-full max-w-7xl px-4 sm:px-6';

export default async function FeaturedResources() {
  const items = await fetchHomeResourcesCarouselItems();

  return (
    <section
      className="border-b border-gray-100 bg-gray-50 pt-8 pb-[max(2.75rem,calc(env(safe-area-inset-bottom,0px)+1.25rem))] sm:pt-9 sm:pb-11 lg:pt-10 lg:pb-12"
      aria-labelledby="featured-resources-heading"
    >
      <div className={pageContent}>
        <h2
          id="featured-resources-heading"
          className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:text-[2rem] lg:leading-tight"
        >
          Master the Application Process
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-base text-gray-500 sm:mt-4 sm:text-lg">
          Expert guides and resources to help you secure your funding.
        </p>

        {items.length > 0 ? (
          <FeaturedResourcesCarousel items={items} />
        ) : (
          <p className="mt-10 text-center text-sm text-gray-500 lg:mt-12">
            New guides are added regularly — browse the hubs below to see
            everything we have published.
          </p>
        )}

        <div className="mt-4 flex flex-col items-stretch justify-center gap-3 sm:mt-2 sm:flex-row sm:items-center sm:gap-4">
          <Link
            href={RESOURCES_SECTION_PATH}
            className="inline-flex items-center justify-center rounded-xl bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
          >
            Browse All Resources
          </Link>
          <Link
            href={ESSAYS_SECTION_PATH}
            className="inline-flex items-center justify-center rounded-xl bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-200 hover:text-[#FF7A1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
          >
            Explore Essay Guides
          </Link>
        </div>
      </div>
    </section>
  );
}
