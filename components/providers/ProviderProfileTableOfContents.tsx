export type ProviderProfileTocEntry = {
  id: string;
  label: string;
};

/**
 * SSR “On this page” block — mirrors essay/resource article TOC styling.
 */
export function ProviderProfileTableOfContents({
  items
}: {
  items: ProviderProfileTocEntry[];
}) {
  if (items.length < 2) return null;

  return (
    <nav
      className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:mt-8 sm:p-5"
      aria-labelledby="provider-profile-toc-label"
    >
      <p
        id="provider-profile-toc-label"
        className="text-sm font-semibold tracking-tight text-gray-900"
      >
        On this page
      </p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="font-medium text-indigo-700 underline-offset-2 hover:text-indigo-900 hover:underline"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
