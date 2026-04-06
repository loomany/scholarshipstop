'use client';

import { Search } from 'lucide-react';

type ContentHubSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function ContentHubSearch({
  value,
  onChange
}: ContentHubSearchProps) {
  return (
    <div className="relative mt-4 w-full max-w-3xl sm:mt-5">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400"
        strokeWidth={2}
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search articles..."
        className="h-11 w-full rounded-xl border border-gray-200 bg-white py-0 pl-10 pr-3.5 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-0 sm:h-12"
        aria-label="Search articles"
      />
    </div>
  );
}
