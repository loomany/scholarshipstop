import FeaturedResources from '@/components/home/FeaturedResources';
import { fetchHomeResourcesCarouselItems } from '@/lib/home/homeResourcesCarousel';

/** Streams resource hub carousel after carousel items resolve. */
export default async function HomeResourcesAsync() {
  try {
    const items = await fetchHomeResourcesCarouselItems();
    return <FeaturedResources items={items} />;
  } catch (err) {
    console.error('[HomeResourcesAsync] fetchHomeResourcesCarouselItems failed', err);
    return <FeaturedResources items={[]} />;
  }
}
