import type { ResourceArticleTocItem } from '@/lib/content-hub/resourceArticleBodyToc';

/** “On this page” block for resource articles (matches essay hub pattern). */
export default function ResourceArticleTableOfContents({
  items,
  headingLabel = 'On this page'
}: {
  items: ResourceArticleTocItem[];
  headingLabel?: string;
}) {
  if (items.length < 2) return null;

  return (
    <nav
      className="mt-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:mt-10 sm:p-5"
      aria-labelledby="resource-article-toc-label"
    >
      <p
        id="resource-article-toc-label"
        className="text-sm font-semibold tracking-tight text-gray-900"
      >
        {headingLabel}
      </p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="font-medium text-indigo-700 underline-offset-2 hover:text-indigo-900 hover:underline"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
