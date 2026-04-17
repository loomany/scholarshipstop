import Link from 'next/link';

import FeaturedResourcesCarousel from '@/components/home/FeaturedResourcesCarousel';
import type { HomeResourcesCarouselItem } from '@/lib/home/homeResourcesCarouselItem';
import { ESSAYS_SECTION_PATH } from '@/lib/essays/essayHubSection';
import { RESOURCES_SECTION_PATH } from '@/lib/content-hub/resourcesSection';

/** Matches `/resources`, `/essays` index wrappers. */
const pageContent = 'mx-auto w-full max-w-7xl px-4 sm:px-6';

export default function FeaturedResources({
  items
}: {
  items: HomeResourcesCarouselItem[];
}) {
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
          Resource hub
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-base text-gray-500 sm:mt-4 sm:text-lg">
          Guides and articles to help you navigate applications with more confidence.
        </p>

        {items.length > 0 ? (
          <FeaturedResourcesCarousel items={items} />
        ) : (
          <p className="mt-10 text-center text-sm text-gray-500 lg:mt-12">
            New guides are added regularly — browse the hubs below to see
            everything we have published.
          </p>
        )}

        <nav
          className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 sm:mt-8"
          aria-label="Resource hub links"
        >
          <Link
            href={RESOURCES_SECTION_PATH}
            className="text-sm font-medium text-gray-700 underline decoration-gray-300 underline-offset-4 transition hover:text-gray-900 hover:decoration-gray-500"
          >
            Browse all resources
          </Link>
          <Link
            href={ESSAYS_SECTION_PATH}
            className="text-sm font-medium text-gray-700 underline decoration-gray-300 underline-offset-4 transition hover:text-gray-900 hover:decoration-gray-500"
          >
            Essay guides
          </Link>
        </nav>
      </div>
    </section>
  );
}
