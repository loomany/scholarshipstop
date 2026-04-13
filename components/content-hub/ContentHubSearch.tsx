'use client';

import { Search } from 'lucide-react';

import { SITE_SEARCH_INPUT_CHROME } from '@/lib/constants/catalogControlBar';

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
        className={`h-11 w-full py-0 pl-10 pr-3.5 text-left text-sm text-zinc-900 sm:h-12 ${SITE_SEARCH_INPUT_CHROME}`}
        aria-label="Search articles"
      />
    </div>
  );
}
