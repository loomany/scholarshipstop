import Link from 'next/link';

import type { ContentHubArticle } from '@/lib/content-hub/types';
import { CONTENT_HUB_CATEGORY_LABEL } from '@/lib/content-hub/categories';
import ContentHubImagePlaceholder from '@/components/content-hub/ContentHubImagePlaceholder';
import { resourcesArticlePath } from '@/lib/content-hub/resourcesSection';

function formatArticleDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(iso + 'T12:00:00'));
  } catch {
    return iso;
  }
}

type ContentHubArticleCardProps = {
  article: ContentHubArticle;
};

export default function ContentHubArticleCard({
  article
}: ContentHubArticleCardProps) {
  const cat = CONTENT_HUB_CATEGORY_LABEL[article.category];
  return (
    <Link
      href={resourcesArticlePath(article.slug)}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm ring-1 ring-gray-100/80 transition hover:border-orange-200/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
    >
      <div className="overflow-hidden rounded-t-2xl">
        <ContentHubImagePlaceholder className="w-full rounded-none" />
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <span className="text-xs font-bold uppercase tracking-wide text-orange-600">
          {cat}
        </span>
        <h2 className="mt-2 line-clamp-2 text-lg font-bold leading-snug text-gray-900 group-hover:text-orange-700 sm:text-xl">
          {article.title}
        </h2>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-gray-600">
          {article.excerpt}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <time dateTime={article.datePublished}>
            {formatArticleDate(article.datePublished)}
          </time>
          <span aria-hidden>·</span>
          <span>{article.readTimeMin} min read</span>
        </div>
      </div>
    </Link>
  );
}
