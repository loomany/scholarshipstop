import Link from 'next/link';

import type { CompareIndexItem } from '@/lib/seo/compareIndexFilters';

type CompareCardGridProps = {
  items: CompareIndexItem[];
  emptyMessage: string;
};

export default function CompareCardGrid({
  items,
  emptyMessage
}: CompareCardGridProps) {
  if (items.length === 0) {
    return <p className="mt-12 text-center text-gray-600">{emptyMessage}</p>;
  }

  return (
    <ul className="mt-6 grid list-none gap-6 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const isUniversity = item.type === 'universities';
        const badgeClass = isUniversity
          ? 'bg-sky-100 text-sky-800'
          : 'bg-emerald-100 text-emerald-800';
        const eyebrow = isUniversity ? 'University battle' : 'State war';

        return (
          <li key={item.id}>
            <Link
              href={item.href}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_12px_40px_-16px_rgba(15,23,42,0.12)] ring-1 ring-gray-100 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_48px_-12px_rgba(15,23,42,0.16)]"
            >
              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <span
                  className={`mb-3 inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}
                >
                  {eyebrow}
                </span>
                <h2 className="text-lg font-bold leading-snug tracking-tight text-gray-900 group-hover:text-gray-800 sm:text-xl">
                  {item.title}
                </h2>
                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-gray-600">
                  {item.description}
                </p>
                <span className="mt-4 inline-flex items-center text-sm font-semibold text-orange-600 group-hover:text-orange-700">
                  Read more →
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
