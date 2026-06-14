import Link from 'next/link';

import FeaturedResourcesCarousel from '@/components/home/FeaturedResourcesCarousel';
import type { HomeResourcesCarouselItem } from '@/lib/home/homeResourcesCarouselItem';
import type { HomePageCopy } from '@/lib/i18n/homePageCopy';

const pageContent = 'mx-auto w-full max-w-7xl px-4 sm:px-6';

type FeaturedResourcesProps = {
  items: HomeResourcesCarouselItem[];
  copy: HomePageCopy['featuredResources'];
  resourcesLinkHref: string;
  essaysLinkHref: string;
};

export default function FeaturedResources({
  items,
  copy,
  resourcesLinkHref,
  essaysLinkHref
}: FeaturedResourcesProps) {
  return (
    <section
      className="border-b border-gray-100 bg-gray-50 pt-8 pb-[max(2.75rem,calc(env(safe-area-inset-bottom,0px)+1.25rem))] [content-visibility:auto] [contain-intrinsic-size:auto_460px] sm:pt-9 sm:pb-11 lg:pt-10 lg:pb-12"
      aria-labelledby="featured-resources-heading"
    >
      <div className={pageContent}>
        <h2
          id="featured-resources-heading"
          className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:text-[2rem] lg:leading-tight"
        >
          {copy.title}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-base text-gray-500 sm:mt-4 sm:text-lg">
          {copy.subtitle}
        </p>

        {items.length > 0 ? (
          <FeaturedResourcesCarousel
            items={items}
            cardFallbackDescription={copy.cardFallbackDescription}
          />
        ) : (
          <p className="mt-10 text-center text-sm text-gray-500 lg:mt-12">
            {copy.empty}
          </p>
        )}

        <nav
          className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 sm:mt-8"
          aria-label="Resource hub links"
        >
          <Link
            href={resourcesLinkHref}
            className="text-sm font-medium text-gray-700 underline decoration-gray-300 underline-offset-4 transition hover:text-gray-900 hover:decoration-gray-500"
          >
            {copy.browseAll}
          </Link>
          <Link
            href={essaysLinkHref}
            className="text-sm font-medium text-gray-700 underline decoration-gray-300 underline-offset-4 transition hover:text-gray-900 hover:decoration-gray-500"
          >
            {copy.essayGuides}
          </Link>
        </nav>
      </div>
    </section>
  );
}
