import FeaturedResources from '@/components/home/FeaturedResources';
import { fetchHomeResourcesCarouselItems } from '@/lib/home/homeResourcesCarousel';
import type { HomePageCopy } from '@/lib/i18n/homePageCopy';
import {
  homepageSupabaseFetchTimeoutMs,
  promiseWithTimeout
} from '@/lib/server/promiseWithTimeout';

type HomeResourcesAsyncProps = {
  copy: HomePageCopy['featuredResources'];
  resourcesLinkHref: string;
  essaysLinkHref: string;
};

/** Streams resource hub carousel after carousel items resolve. */
export default async function HomeResourcesAsync({
  copy,
  resourcesLinkHref,
  essaysLinkHref
}: HomeResourcesAsyncProps) {
  try {
    const items = await promiseWithTimeout(
      fetchHomeResourcesCarouselItems(),
      homepageSupabaseFetchTimeoutMs(),
      'fetchHomeResourcesCarouselItems'
    );
    return (
      <FeaturedResources
        items={items}
        copy={copy}
        resourcesLinkHref={resourcesLinkHref}
        essaysLinkHref={essaysLinkHref}
      />
    );
  } catch (err) {
    console.error('[HomeResourcesAsync] fetchHomeResourcesCarouselItems failed', err);
    return (
      <FeaturedResources
        items={[]}
        copy={copy}
        resourcesLinkHref={resourcesLinkHref}
        essaysLinkHref={essaysLinkHref}
      />
    );
  }
}
