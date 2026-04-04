import Link from 'next/link';

import type { ContentHubArticle } from '@/lib/content-hub/types';
import { CONTENT_HUB_CATEGORY_LABEL } from '@/lib/content-hub/categories';
import { resourcesArticlePath } from '@/lib/content-hub/resourcesSection';

type ContentHubRelatedArticlesProps = {
  currentSlug: string;
  articles: ContentHubArticle[];
};

export default function ContentHubRelatedArticles({
  currentSlug,
  articles
}: ContentHubRelatedArticlesProps) {
  const current = articles.find((a) => a.slug === currentSlug);
  const others = articles.filter((a) => a.slug !== currentSlug);

  const sameCat = current
    ? others.filter((a) => a.category === current.category)
    : [];
  const rest = others.filter(
    (a) => !sameCat.some((s) => s.slug === a.slug)
  );
  const picked = [...sameCat, ...rest].slice(0, 3);

  if (picked.length === 0) return null;

  return (
    <section className="mt-14 border-t border-gray-200 pt-10 sm:mt-16 sm:pt-12">
      <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
        Continue reading
      </h2>
      <ul className="mt-6 space-y-4">
        {picked.map((a) => (
          <li key={a.slug}>
            <Link
              href={resourcesArticlePath(a.slug)}
              className="group block rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md"
            >
              <span className="text-xs font-bold uppercase tracking-wide text-orange-600">
                {CONTENT_HUB_CATEGORY_LABEL[a.category]}
              </span>
              <span className="mt-1 block text-base font-semibold text-gray-900 group-hover:text-orange-700">
                {a.title}
              </span>
              <span className="mt-1 line-clamp-2 text-sm text-gray-600">
                {a.excerpt}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
