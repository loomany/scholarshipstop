import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

type AboutResourceCardProps = {
  href: string;
  title: string;
  shortText: string;
  expandedText: string;
  icon: LucideIcon;
};

export default function AboutResourceCard({
  href,
  title,
  shortText,
  expandedText,
  icon: Icon
}: AboutResourceCardProps) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white shadow-sm outline-none transition-all duration-200 ease-out hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg focus-visible:-translate-y-1 focus-visible:border-gray-300 focus-visible:shadow-lg focus-visible:ring-2 focus-visible:ring-orange-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50"
    >
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 transition-colors duration-200 group-hover:bg-orange-50 group-hover:text-orange-600 group-focus-visible:bg-orange-50 group-focus-visible:text-orange-600">
                <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
              </span>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                {title}
              </h2>
            </div>
            <p className="mt-3 text-base leading-relaxed text-zinc-600">
              {shortText}
            </p>
            <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-out group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr]">
              <div className="overflow-hidden">
                <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                  {expandedText}
                </p>
              </div>
            </div>
          </div>
          <span
            className="mt-1 shrink-0 text-zinc-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-orange-500 group-focus-visible:translate-x-0.5 group-focus-visible:text-orange-500"
            aria-hidden
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
