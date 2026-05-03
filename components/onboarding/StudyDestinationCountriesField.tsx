'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { SITE_INPUT_FOCUS_CLASS } from '@/lib/constants/siteInputFocus';
import {
  compareCountryOptionsForStudyDestination,
  countryLabelFromCode,
  SCHOLARSHIP_COUNTRY_OPTIONS
} from '@/lib/scholarships/countryEligibility/countries';

const MAX_DESTINATIONS = 8;

const triggerBaseClass =
  `flex w-full min-h-[3.25rem] items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-left text-sm shadow-sm transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 ${SITE_INPUT_FOCUS_CLASS}`;

const checkboxClass =
  'mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[#FF7A1A] focus:ring-[#FF7A1A]';

function triggerSummary(selected: string[]): string {
  if (selected.length === 0) return 'Select study destinations (optional)';
  if (selected.length === 1) return countryLabelFromCode(selected[0]);
  if (selected.length === 2) {
    return `${countryLabelFromCode(selected[0])}, ${countryLabelFromCode(selected[1])}`;
  }
  const [a, b] = selected;
  return `${countryLabelFromCode(a)}, ${countryLabelFromCode(b)} +${selected.length - 2} more`;
}

type Props = {
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  idPrefix?: string;
};

export function StudyDestinationCountriesField({
  selected,
  onChange,
  disabled = false,
  idPrefix = 'study-dest'
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerId = `${idPrefix}-trigger`;

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const sortedOptions = useMemo(
    () => [...SCHOLARSHIP_COUNTRY_OPTIONS].sort(compareCountryOptionsForStudyDestination),
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedOptions;
    return sortedOptions.filter((c) => {
      const label = c.label.toLowerCase();
      const code = c.code.toLowerCase();
      return label.includes(q) || code.includes(q);
    });
  }, [query, sortedOptions]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (code: string) => {
    if (disabled) return;
    const next = new Set(selected);
    if (next.has(code)) {
      next.delete(code);
    } else if (next.size < MAX_DESTINATIONS) {
      next.add(code);
    }
    onChange([...next].sort((a, b) => a.localeCompare(b)));
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        id={triggerId}
        aria-label="Study destination countries. Opens a list to choose one or more."
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={triggerBaseClass}
      >
        <span
          className={
            selected.length > 0 ? 'line-clamp-2 text-zinc-900' : 'text-zinc-400'
          }
        >
          {triggerSummary(selected)}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 top-full z-[70] mt-1 rounded-xl border border-zinc-200 bg-white py-2 shadow-lg ring-1 ring-black/5"
          role="presentation"
        >
          <div className="border-b border-zinc-100 px-3 pb-2 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search countries"
                aria-label="Search countries"
                className={`min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 ${SITE_INPUT_FOCUS_CLASS}`}
              />
              <button
                type="button"
                disabled={disabled || selected.length === 0}
                onClick={() => onChange([])}
                className="shrink-0 text-sm font-semibold text-[#A45A16] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear all
              </button>
            </div>
          </div>
          <ul
            role="listbox"
            aria-label="Study destination countries"
            aria-multiselectable="true"
            className="max-h-[min(18rem,calc(100dvh-12rem))] overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-zinc-500">No matches.</li>
            ) : (
              filtered.map((c) => {
                const id = `${idPrefix}-opt-${c.code}`;
                const checked = selectedSet.has(c.code);
                const atCap = !checked && selected.length >= MAX_DESTINATIONS;
                return (
                  <li key={c.code} role="option" aria-selected={checked}>
                    <label
                      htmlFor={id}
                      className={`flex cursor-pointer items-start gap-2 px-3 py-2 text-sm transition hover:bg-orange-50/70 ${
                        atCap ? 'cursor-not-allowed opacity-50' : ''
                      }`}
                    >
                      <input
                        id={id}
                        type="checkbox"
                        checked={checked}
                        disabled={disabled || atCap}
                        onChange={() => toggle(c.code)}
                        className={checkboxClass}
                      />
                      <span className="font-medium text-zinc-800">{c.label}</span>
                      <span className="ml-auto tabular-nums text-xs text-zinc-400">
                        {c.code}
                      </span>
                    </label>
                  </li>
                );
              })
            )}
          </ul>
          <p className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">
            Pick up to {MAX_DESTINATIONS}. Leave empty if you have no preference yet.
          </p>
        </div>
      ) : null}
    </div>
  );
}
