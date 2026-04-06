'use client';

import { useEffect, useState } from 'react';

import {
  SUBJECT_L2_LABELS,
  SUBJECT_L2_SLUGS
} from '@/lib/scholarships/categories/taxonomy';

type Row = { slug: string; label: string };

/**
 * Hub: lists all L2 subject areas from the DB (or static fallback), including **General** (`open_subject`).
 * Category pages `/scholarships/category/{slug}` resolve L2 slugs via `scholarship_categories` join server-side.
 */
export default function SubjectL2BrowseChips() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    const fallback: Row[] = SUBJECT_L2_SLUGS.map((slug) => ({
      slug,
      label: SUBJECT_L2_LABELS[slug]
    }));

    fetch('/api/categories')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { categories?: Row[] } | null) => {
        if (d?.categories && d.categories.length > 0) {
          setRows(d.categories.map((c) => ({ slug: c.slug, label: c.label })));
        } else {
          setRows(fallback);
        }
      })
      .catch(() => setRows(fallback));
  }, []);

  if (!rows?.length) return null;

  const ordered = [...rows].sort((a, b) => {
    if (a.slug === 'open_subject') return 1;
    if (b.slug === 'open_subject') return -1;
    return a.label.localeCompare(b.label);
  });

  return (
    <div
      className="mb-4 rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm sm:px-4"
      aria-label="Catalog subject areas"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Subject areas
      </p>
      <div className="flex max-h-[7.5rem] flex-wrap gap-2 overflow-y-auto sm:max-h-none">
        {ordered.map((c) => (
          <span
            key={c.slug}
            className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-800"
            title={
              c.slug === 'open_subject'
                ? 'Scholarships without a specific field of study'
                : undefined
            }
          >
            {c.label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        &quot;General / open subject&quot; is a normal category for grants that are not tied to one field.
      </p>
    </div>
  );
}
