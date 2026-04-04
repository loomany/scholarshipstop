'use client';

import clsx from 'clsx';

import type { ContentHubChip } from '@/lib/content-hub/categories';

type ContentHubCategoryChipsProps = {
  chips: ContentHubChip[];
  activeId: ContentHubChip['id'];
  onChange: (id: ContentHubChip['id']) => void;
};

export default function ContentHubCategoryChips({
  chips,
  activeId,
  onChange
}: ContentHubCategoryChipsProps) {
  return (
    <div
      className="mt-4 flex gap-2 overflow-x-auto pb-1 sm:mt-5 sm:flex-wrap sm:overflow-visible sm:pb-0"
      role="tablist"
      aria-label="Article categories"
    >
      {chips.map((chip) => {
        const active = chip.id === activeId;
        return (
          <button
            key={chip.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(chip.id)}
            className={clsx(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition sm:text-base',
              active
                ? 'bg-orange-500 text-white shadow-sm hover:bg-orange-600'
                : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
