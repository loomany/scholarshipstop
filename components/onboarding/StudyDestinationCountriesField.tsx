'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { SITE_INPUT_FOCUS_CLASS } from '@/lib/constants/siteInputFocus';
import { getAccountProfileUiCopy } from '@/lib/i18n/accountProfileUiCopy';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import { getLocalizedCountryLabel } from '@/lib/i18n/taxonomyLabels';
import {
  compareCountryOptionsForStudyDestination,
  SCHOLARSHIP_COUNTRY_OPTIONS
} from '@/lib/scholarships/countryEligibility/countries';
import { cn } from '@/utils/cn';

const MAX_DESTINATIONS = 8;

const checkboxClass =
  'mt-0.5 h-4 w-4 shrink-0 rounded border-orange-300 text-[#FF7A1A] focus:ring-2 focus:ring-[#FF7A1A]/35 focus:ring-offset-0';

const panelScrollClass =
  '[scrollbar-width:thin] [scrollbar-color:rgba(161,161,170,0.55)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-400/70 [&::-webkit-scrollbar-track]:bg-transparent';

type Props = {
  selected: string[];
  onChange: (next: string[]) => void;
  onSave?: () => void | Promise<void>;
  disabled?: boolean;
  idPrefix?: string;
  uiLocale?: LocalizedUiLocale;
};

export function StudyDestinationCountriesField({
  selected,
  onChange,
  onSave,
  disabled = false,
  idPrefix = 'study-dest',
  uiLocale = 'en'
}: Props) {
  const copy = getAccountProfileUiCopy(uiLocale).studyDestination;

  const countryLabel = (code: string, fallback: string) =>
    getLocalizedCountryLabel(code, uiLocale, fallback);

  const triggerSummary = (codes: string[]): string => {
    if (codes.length === 0) return copy.chooseCountries;
    if (codes.length === 1) return countryLabel(codes[0], codes[0]);
    if (codes.length === 2) {
      return `${countryLabel(codes[0], codes[0])}, ${countryLabel(codes[1], codes[1])}`;
    }
    const [a, b] = codes;
    return `${countryLabel(a, a)}, ${countryLabel(b, b)} ${copy.moreCount(codes.length - 2)}`;
  };

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
      const label = countryLabel(c.code, c.label).toLowerCase();
      const code = c.code.toLowerCase();
      return label.includes(q) || code.includes(q);
    });
  }, [query, sortedOptions, uiLocale]);

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
        aria-label={copy.ariaTrigger}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'flex w-full min-h-[3.25rem] items-center justify-between gap-2 rounded-xl px-4 py-3.5 text-left text-sm shadow-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
          SITE_INPUT_FOCUS_CLASS,
          open
            ? 'border border-zinc-300 bg-white'
            : 'border border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
        )}
      >
        <span className="flex min-w-0 flex-1 items-center text-left">
          {selected.length === 0 ? (
            <span className="min-w-0 truncate font-normal text-zinc-900">
              {triggerSummary(selected)}
            </span>
          ) : (
            <span className="line-clamp-2 min-w-0 font-medium text-zinc-900">
              {triggerSummary(selected)}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-orange-700/50 transition-transform duration-200',
            open && 'rotate-180 text-orange-700/70'
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 top-full z-[70] mt-1.5 overflow-hidden rounded-xl border border-orange-200/90 bg-white py-2 shadow-lg shadow-orange-950/[0.07] ring-1 ring-orange-100/80"
          role="presentation"
        >
          <div className="border-b border-orange-100 px-3 pb-2 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={copy.searchCountries}
                aria-label={copy.searchCountries}
                className={cn(
                  'min-w-0 flex-1 rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400',
                  SITE_INPUT_FOCUS_CLASS
                )}
              />
              <button
                type="button"
                disabled={disabled || selected.length === 0}
                onClick={() => onChange([])}
                className="shrink-0 text-sm font-semibold text-[#D97736] underline-offset-2 hover:text-[#C2672E] hover:underline disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copy.clearAll}
              </button>
            </div>
          </div>
          <ul
            role="listbox"
            aria-label={copy.ariaListbox}
            aria-multiselectable="true"
            className={cn(
              'max-h-[min(18rem,calc(100dvh-12rem))] overflow-y-auto py-1',
              panelScrollClass
            )}
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-zinc-500">{copy.noMatches}</li>
            ) : (
              filtered.map((c) => {
                const id = `${idPrefix}-opt-${c.code}`;
                const checked = selectedSet.has(c.code);
                const atCap = !checked && selected.length >= MAX_DESTINATIONS;
                const displayLabel = countryLabel(c.code, c.label);
                return (
                  <li key={c.code} role="option" aria-selected={checked}>
                    <label
                      htmlFor={id}
                      className={cn(
                        'flex cursor-pointer items-start gap-2 px-4 py-2.5 text-sm text-zinc-900 transition-colors duration-150',
                        checked ? 'bg-orange-50' : 'hover:bg-orange-50/85',
                        atCap && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      <input
                        id={id}
                        type="checkbox"
                        checked={checked}
                        disabled={disabled || atCap}
                        onChange={() => toggle(c.code)}
                        className={checkboxClass}
                      />
                      <span className="font-medium">{displayLabel}</span>
                      <span className="ml-auto tabular-nums text-xs text-zinc-400">
                        {c.code}
                      </span>
                    </label>
                  </li>
                );
              })
            )}
          </ul>
          <div className="border-t border-orange-100 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs leading-relaxed text-zinc-500">
                {copy.pickUpTo(MAX_DESTINATIONS)}
              </p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (onSave) void onSave();
                }}
                disabled={disabled}
                className="shrink-0 rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-[#D97736] transition hover:border-orange-400 hover:bg-orange-100 hover:text-[#C2672E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copy.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
